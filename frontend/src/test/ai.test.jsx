import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { streamPost } from "../lib/sse";
import { averageScore, parseAiScore, recommendationOf } from "../lib/evaluation";
import Markdown from "../Components/Markdown";
import PerformanceCard from "../Components/PerformanceCard";

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

const sse = (events, chunk = 5) => {
    const bytes = new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""));
    return new Response(
        new ReadableStream({
            start(c) {
                for (let i = 0; i < bytes.length; i += chunk) c.enqueue(bytes.slice(i, i + chunk));
                c.close();
            },
        }),
        { headers: { "Content-Type": "text/event-stream" } }
    );
};

describe("streamPost", () => {
    it("accumulates streamed text across split chunks", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(sse([{ text: "Hel" }, { text: "lo!" }, { done: true }]));
        const seen = [];
        const result = await streamPost("/ai/hint", { a: 1 }, { onText: (_, full) => seen.push(full) });
        expect(result).toEqual({ text: "Hello!", error: null });
        expect(seen).toEqual(["Hel", "Hello!"]);
        const [url, init] = globalThis.fetch.mock.calls[0];
        expect(url).toBe("/api/ai/hint");
        expect(JSON.parse(init.body)).toEqual({ a: 1 });
    });

    it("surfaces stream errors and JSON error responses", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(sse([{ text: "x" }, { error: "busy" }]));
        expect((await streamPost("/x")).error).toBe("busy");

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ message: "AI is not configured" }), { status: 503, headers: { "Content-Type": "application/json" } })
        );
        expect((await streamPost("/x")).error).toBe("AI is not configured");
    });

    it("reports aborts and network failures", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
        expect(await streamPost("/x")).toEqual({ aborted: true });
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
        expect((await streamPost("/x")).error).toMatch(/Network error/);
    });
});

describe("evaluation helpers", () => {
    it("averages only scored criteria", () => {
        expect(averageScore({ problemSolving: 4, communication: 3, codeQuality: 0 })).toBe(3.5);
        expect(averageScore({})).toBeNull();
    });

    it("parses the AI score from a report", () => {
        expect(parseAiScore("### AI score\nAI score: 7/10")).toBe(7);
        expect(parseAiScore("AI Score: 8.5 / 10")).toBe(8.5);
        expect(parseAiScore("no score")).toBeNull();
    });

    it("looks up recommendations", () => {
        expect(recommendationOf("hire").label).toBe("Hire");
        expect(recommendationOf("")).toBeUndefined();
    });
});

describe("Markdown", () => {
    it("renders markdown, hides the json score block, and never renders raw HTML", () => {
        const { container } = render(
            <Markdown>{'### Strengths\n- **clear** answers\n<img src=x onerror="alert(1)">\n```json\n{"overall": 7}\n```'}</Markdown>
        );
        expect(screen.getByRole("heading", { name: "Strengths" })).toBeInTheDocument();
        expect(screen.getByText("clear").tagName).toBe("STRONG");
        expect(container.querySelector("img")).toBeNull();
        expect(container.textContent).not.toContain("overall");
    });
});

describe("PerformanceCard", () => {
    it("shows the headline score and each bar", () => {
        render(
            <PerformanceCard
                title="Frontend Engineer"
                headline={{ label: "Overall score", value: 7, max: 10 }}
                bars={[
                    { label: "Communication", value: 8, max: 10 },
                    { label: "Technical depth", value: 0, max: 10 },
                ]}
            />
        );
        expect(screen.getByRole("img", { name: "Overall score: 7 out of 10" })).toBeInTheDocument();
        expect(screen.getByText("8/10")).toBeInTheDocument();
        expect(screen.getByText("Technical depth").nextSibling?.textContent ?? "").toBe("–");
    });
});

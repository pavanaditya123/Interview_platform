import { describe, it, expect, vi, afterEach } from "vitest";
import { buildTestResults, formatValue, linesMatch, normalizeOutput } from "../lib/judge";
import { capitalize, formatDuration, getDifficultyBadgeClass, timeAgo } from "../lib/utils";
import { clearDraft, getDraft, getSolvedProblems, markProblemSolved, saveDraft } from "../lib/progress";

describe("judge", () => {
    it("normalizes whitespace, CRLF and array spacing", () => {
        expect(normalizeOutput("[ 0, 1 ]\r\n\n  [1 ,2]  \n")).toBe("[0,1]\n[1,2]");
    });

    it("treats Python/Java style lists as equal to compact JSON", () => {
        expect(linesMatch("[0, 1]", "[0,1]")).toBe(true);
        expect(linesMatch("[[1, 6], [8, 10]]", "[[1,6],[8,10]]")).toBe(true);
        expect(linesMatch("[0, 2]", "[0,1]")).toBe(false);
    });

    it("builds per-case results and flags missing lines", () => {
        const r = buildTestResults("1\n2", "1\n2\n3");
        expect(r.testCaseResults.map((t) => t.passed)).toEqual([true, true, false]);
        expect(r.testCaseResults[2].actual).toBe("");
        expect(r.allPassed).toBe(false);
        expect(buildTestResults("a\nb", "a\nb").allPassed).toBe(true);
    });

    it("formats console.log values like the runner", () => {
        expect(formatValue([0, 1])).toBe("[0,1]");
        expect(formatValue(["o", "l"])).toBe('["o","l"]');
        expect(formatValue(true)).toBe("true");
        expect(formatValue(undefined)).toBe("undefined");
        expect(formatValue(null)).toBe("null");
        expect(formatValue("hi")).toBe("hi");
        const circ = {};
        circ.self = circ;
        expect(() => formatValue(circ)).not.toThrow();
    });
});

describe("utils", () => {
    afterEach(() => vi.useRealTimers());

    it("maps difficulty to badge class case-insensitively", () => {
        expect(getDifficultyBadgeClass("Easy")).toBe("badge-success");
        expect(getDifficultyBadgeClass("medium")).toBe("badge-warning");
        expect(getDifficultyBadgeClass("HARD")).toBe("badge-error");
        expect(getDifficultyBadgeClass(undefined)).toBe("badge-ghost");
    });

    it("capitalizes", () => {
        expect(capitalize("easy")).toBe("Easy");
        expect(capitalize("")).toBe("");
    });

    it("formats relative time and duration", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
        expect(timeAgo("2026-01-01T11:59:50Z")).toBe("just now");
        expect(timeAgo("2026-01-01T11:55:00Z")).toBe("5 minutes ago");
        expect(timeAgo("2025-12-31T12:00:00Z")).toBe("1 day ago");
        expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:45:00Z")).toBe("45 min");
        expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T11:30:00Z")).toBe("1h 30m");
    });
});

describe("progress storage", () => {
    it("tracks solved problems and notifies listeners", () => {
        const listener = vi.fn();
        window.addEventListener("interviewhub:progress", listener);
        markProblemSolved("two-sum");
        markProblemSolved("two-sum");
        expect([...getSolvedProblems()]).toEqual(["two-sum"]);
        expect(listener).toHaveBeenCalledTimes(2);
        window.removeEventListener("interviewhub:progress", listener);
    });

    it("saves drafts per problem and language", () => {
        saveDraft("two-sum", "python", "print(1)");
        expect(getDraft("two-sum", "python")).toBe("print(1)");
        expect(getDraft("two-sum", "javascript")).toBeNull();
        clearDraft("two-sum", "python");
        expect(getDraft("two-sum", "python")).toBeNull();
    });

    it("survives unavailable storage", () => {
        const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        expect(getSolvedProblems().size).toBe(0);
        expect(getDraft("x", "y")).toBeNull();
        spy.mockRestore();
    });
});

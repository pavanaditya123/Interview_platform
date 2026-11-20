import { memo, useEffect, useRef, useState } from "react";
import { LightbulbIcon, SparklesIcon, SearchCodeIcon, SquareIcon } from "lucide-react";
import Markdown from "./Markdown";
import { streamPost } from "../lib/sse";

const HINTS = [
    { level: 1, label: "Nudge", desc: "Point me in the right direction" },
    { level: 2, label: "Approach", desc: "Which technique should I use?" },
    { level: 3, label: "Plan", desc: "Step-by-step, no code" },
];

/** AI hints (3 levels) and AI code review for the current problem and code. */
function AiAssistantPanel({ problem, language, code }) {
    const [result, setResult] = useState({ kind: null, text: "", error: null });
    const [loading, setLoading] = useState(false);
    const controllerRef = useRef(null);

    // Clear the panel when switching problems; abort any in-flight request.
    useEffect(() => {
        controllerRef.current?.abort();
        setResult({ kind: null, text: "", error: null });
        setLoading(false);
    }, [problem.id]);
    useEffect(() => () => controllerRef.current?.abort(), []);

    const run = async (kind, level) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true);
        setResult({ kind: kind === "hint" ? `Hint · ${HINTS[level - 1].label}` : "Code review", text: "", error: null });

        const description = [problem.description.text, ...problem.description.notes, `Constraints: ${problem.constraints.join("; ")}`].join("\n");
        const { error, aborted } = await streamPost(
            kind === "hint" ? "/ai/hint" : "/ai/review",
            { problemTitle: problem.title, problemDescription: description, language, code, level },
            { signal: controller.signal, onText: (_, full) => setResult((r) => ({ ...r, text: full })) }
        );
        if (!aborted) {
            if (error) setResult((r) => ({ ...r, error }));
            setLoading(false);
        }
    };

    const stop = () => {
        controllerRef.current?.abort();
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col bg-base-200">
            <div className="p-3 border-b border-base-300 bg-base-100 flex flex-wrap items-center gap-2">
                <SparklesIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold mr-2">AI Assistant</span>
                {HINTS.map((h) => (
                    <button
                        key={h.level}
                        className="btn btn-xs btn-outline btn-primary gap-1"
                        onClick={() => run("hint", h.level)}
                        disabled={loading}
                        title={h.desc}
                    >
                        <LightbulbIcon className="size-3" />
                        {h.label}
                    </button>
                ))}
                <button className="btn btn-xs btn-secondary gap-1" onClick={() => run("review")} disabled={loading || !code.trim()}>
                    <SearchCodeIcon className="size-3" />
                    Review my code
                </button>
                {loading && (
                    <button className="btn btn-xs btn-ghost gap-1 ml-auto" onClick={stop}>
                        <SquareIcon className="size-3" /> Stop
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto scroll-area p-4" aria-live="polite">
                {!result.kind ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-base-content/60">
                        <SparklesIcon className="size-8" />
                        <p className="font-medium">Stuck? Ask for a hint. Done? Get a review.</p>
                        <p className="text-xs max-w-sm">Hints get more specific at each level but never give away the full solution.</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-base-content/50 mb-2">{result.kind}</p>
                        {result.text ? (
                            <Markdown className={loading ? "typing-caret" : ""}>{result.text}</Markdown>
                        ) : (
                            loading && <span className="loading loading-dots loading-md text-primary" />
                        )}
                        {result.error && <div className="alert alert-warning mt-3 text-sm">{result.error}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(AiAssistantPanel);

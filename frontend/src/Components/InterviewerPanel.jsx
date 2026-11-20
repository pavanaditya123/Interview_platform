import { useEffect, useRef, useState } from "react";
import { CheckIcon, LoaderIcon, LockIcon, SearchCodeIcon, StarIcon } from "lucide-react";
import { useEvaluation, useUpdateEvaluation } from "../hooks/useSessions";
import { RECOMMENDATIONS, SCORE_CRITERIA } from "../lib/evaluation";
import { streamPost } from "../lib/sse";
import Markdown from "./Markdown";

export function ScoreInput({ value, onChange, label }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{label}</span>
            <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} of 5`}
                        onClick={() => onChange(value === n ? 0 : n)}
                        className="p-0.5"
                    >
                        <StarIcon className={`size-5 transition-colors ${n <= value ? "fill-warning text-warning" : "text-base-content/30"}`} />
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Interviewer-only notes, scorecard and quick AI code review during a live session. */
export default function InterviewerPanel({ sessionId, problem, language, code }) {
    const { data, isLoading } = useEvaluation(sessionId);
    const update = useUpdateEvaluation(sessionId);
    const evaluation = data?.evaluation;

    const [notes, setNotes] = useState("");
    const [saved, setSaved] = useState(true);
    const loaded = useRef(false);
    useEffect(() => {
        if (evaluation && !loaded.current) {
            loaded.current = true;
            setNotes(evaluation.notes ?? "");
        }
    }, [evaluation]);

    // Debounced autosave of notes.
    const timer = useRef(null);
    const onNotes = (value) => {
        setNotes(value);
        setSaved(false);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => update.mutate({ notes: value }, { onSuccess: () => setSaved(true) }), 800);
    };
    useEffect(() => () => clearTimeout(timer.current), []);

    const [review, setReview] = useState({ text: "", loading: false, error: null });
    const reviewCode = async () => {
        setReview({ text: "", loading: true, error: null });
        const { error } = await streamPost(
            "/ai/review",
            {
                problemTitle: problem.title,
                problemDescription: problem.description.text,
                language,
                code,
            },
            { onText: (_, full) => setReview((r) => ({ ...r, text: full })) }
        );
        setReview((r) => ({ ...r, loading: false, error }));
    };

    if (isLoading || !evaluation) {
        return (
            <div className="h-full flex items-center justify-center">
                <span className="loading loading-spinner text-primary" />
            </div>
        );
    }

    const req = evaluation.requirements ?? {};
    return (
        <div className="h-full overflow-y-auto scroll-area p-4 space-y-5">
            <div className="flex items-center gap-2 text-xs text-base-content/60">
                <LockIcon className="size-3" /> Private to you. The candidate can't see this panel.
            </div>

            {(req.role || req.skills) && (
                <div className="bg-base-100 rounded-xl p-4 border border-base-300">
                    <p className="text-xs uppercase font-bold opacity-50 mb-1">Hiring for</p>
                    <p className="font-semibold">
                        {req.role || "Role not set"} {req.level && <span className="opacity-60">· {req.level}</span>}
                    </p>
                    {req.skills && <p className="text-sm opacity-70 mt-1">{req.skills}</p>}
                </div>
            )}

            <div className="bg-base-100 rounded-xl p-4 border border-base-300 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="font-semibold">Notes</p>
                    <span className="text-xs opacity-60 flex items-center gap-1">
                        {saved ? (
                            <>
                                <CheckIcon className="size-3" /> Saved
                            </>
                        ) : (
                            <>
                                <LoaderIcon className="size-3 animate-spin" /> Saving
                            </>
                        )}
                    </span>
                </div>
                <textarea
                    className="textarea textarea-bordered w-full min-h-40 text-sm"
                    placeholder="What did the candidate do well? Where did they struggle? Quotes, hints given, edge cases missed..."
                    value={notes}
                    maxLength={20000}
                    onChange={(e) => onNotes(e.target.value)}
                />
            </div>

            <div className="bg-base-100 rounded-xl p-4 border border-base-300 space-y-3">
                <p className="font-semibold">Scorecard</p>
                {SCORE_CRITERIA.map((c) => (
                    <ScoreInput
                        key={c.key}
                        label={c.label}
                        value={evaluation.scores?.[c.key] ?? 0}
                        onChange={(v) => update.mutate({ scores: { [c.key]: v } })}
                    />
                ))}
                <select
                    className="select select-bordered select-sm w-full"
                    value={evaluation.recommendation ?? ""}
                    onChange={(e) => update.mutate({ recommendation: e.target.value })}
                    aria-label="Recommendation"
                >
                    <option value="">Recommendation…</option>
                    {RECOMMENDATIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
            </div>

            {data.aiEnabled && (
                <div className="bg-base-100 rounded-xl p-4 border border-base-300 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">AI look at the current code</p>
                        <button className="btn btn-xs btn-secondary gap-1" onClick={reviewCode} disabled={review.loading || !code.trim()}>
                            <SearchCodeIcon className="size-3" /> Review
                        </button>
                    </div>
                    {review.text && <Markdown className={`text-sm ${review.loading ? "typing-caret" : ""}`}>{review.text}</Markdown>}
                    {review.loading && !review.text && <span className="loading loading-dots text-primary" />}
                    {review.error && <p className="text-sm text-warning">{review.error}</p>}
                </div>
            )}
        </div>
    );
}

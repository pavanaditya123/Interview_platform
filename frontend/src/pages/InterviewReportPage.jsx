import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, BotIcon, CodeIcon, FilmIcon, LockIcon, NotebookPenIcon, PrinterIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import Navbar from "../Components/Navbar";
import Markdown from "../Components/Markdown";
import PerformanceCard from "../Components/PerformanceCard";
import { ScoreInput } from "../Components/InterviewerPanel";
import { useEvaluation, useUpdateEvaluation } from "../hooks/useSessions";
import { sessionApi } from "../api/sessions";
import { streamPost } from "../lib/sse";
import { RECOMMENDATIONS, SCORE_CRITERIA, averageScore, parseAiScore, recommendationOf } from "../lib/evaluation";
import { capitalize, formatDuration } from "../lib/utils";

function Section({ icon, title, action, children }) {
    const Icon = icon;
    return (
        <section className="card bg-base-100 border border-base-300">
            <div className="card-body">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="card-title text-lg">
                        <Icon className="size-5 text-primary" /> {title}
                    </h2>
                    {action}
                </div>
                {children}
            </div>
        </section>
    );
}

export default function InterviewReportPage() {
    const { id } = useParams();
    const qc = useQueryClient();
    const { data, isLoading, error } = useEvaluation(id);
    const update = useUpdateEvaluation(id);
    const recordings = useQuery({
        queryKey: ["recordings", id],
        queryFn: () => sessionApi.getRecordings(id),
        enabled: Boolean(data?.session?.status === "completed"),
    });

    const [stream, setStream] = useState({ text: "", loading: false, error: null });
    const controllerRef = useRef(null);
    useEffect(() => () => controllerRef.current?.abort(), []);

    const [notes, setNotes] = useState(null);
    useEffect(() => {
        if (data?.evaluation && notes === null) setNotes(data.evaluation.notes ?? "");
    }, [data, notes]);

    if (isLoading) {
        return (
            <div className="min-h-dvh bg-base-200">
                <Navbar />
                <div className="flex justify-center py-32">
                    <span className="loading loading-spinner loading-lg text-primary" />
                </div>
            </div>
        );
    }
    if (error || !data) {
        const forbidden = error?.response?.status === 403;
        return (
            <div className="min-h-dvh bg-base-200">
                <Navbar />
                <div className="max-w-md mx-auto text-center py-24 space-y-4 px-4">
                    <LockIcon className="size-10 mx-auto opacity-60" />
                    <h1 className="text-2xl font-bold">{forbidden ? "Only the interviewer can see this report" : "Report not found"}</h1>
                    <Link to="/dashboard" className="btn btn-primary">
                        Back to dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const { session, evaluation, aiEnabled } = data;
    const report = stream.loading || stream.text ? stream.text : evaluation.report;
    const avg = averageScore(evaluation.scores);
    const aiScore = parseAiScore(report);
    const rec = recommendationOf(evaluation.recommendation);
    const completed = session.status === "completed";

    const generate = async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setStream({ text: "", loading: true, error: null });
        const result = await streamPost(`/sessions/${id}/report`, {}, {
            signal: controller.signal,
            onText: (_, full) => setStream((s) => ({ ...s, text: full })),
        });
        if (result.aborted) return;
        setStream((s) => ({ ...s, loading: false, error: result.error }));
        if (!result.error) qc.invalidateQueries({ queryKey: ["evaluation", id] });
    };

    const saveNotes = () => {
        if (notes !== evaluation.notes) update.mutate({ notes });
    };

    const req = evaluation.requirements ?? {};
    return (
        <div className="min-h-dvh bg-base-200">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 print:py-0">
                <div className="flex items-center justify-between gap-2 print:hidden">
                    <Link to="/dashboard" className="btn btn-ghost btn-sm gap-1">
                        <ArrowLeftIcon className="size-4" /> Dashboard
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="badge badge-ghost gap-1">
                            <LockIcon className="size-3" /> Private to you
                        </span>
                        <button className="btn btn-sm btn-ghost gap-1" onClick={() => window.print()}>
                            <PrinterIcon className="size-4" /> Print / PDF
                        </button>
                    </div>
                </div>

                <PerformanceCard
                    title={session.participant?.name ?? "No candidate joined"}
                    subtitle={`${session.problem} · ${capitalize(session.difficulty)} · ${new Date(session.createdAt).toLocaleString()} · ${formatDuration(session.createdAt, session.updatedAt)}${req.role ? ` · ${req.role}${req.level ? ` (${req.level})` : ""}` : ""}`}
                    headline={{ label: "Interviewer score", value: avg, max: 5 }}
                    bars={SCORE_CRITERIA.map((c) => ({ label: c.label, value: evaluation.scores?.[c.key] ?? 0, max: 5 }))}
                    badges={
                        <>
                            {rec && <span className={`badge ${rec.tone} badge-lg`}>{rec.label}</span>}
                            {aiScore != null && (
                                <span className="badge badge-primary badge-lg gap-1">
                                    <BotIcon className="size-4" /> AI score {aiScore}/10
                                </span>
                            )}
                            {!completed && <span className="badge badge-warning">Session still running</span>}
                        </>
                    }
                />

                <Section
                    icon={SparklesIcon}
                    title="AI interview report"
                    action={
                        aiEnabled &&
                        completed && (
                            <button className="btn btn-primary btn-sm gap-1 print:hidden" onClick={generate} disabled={stream.loading}>
                                {stream.loading ? <span className="loading loading-spinner loading-xs" /> : report ? <RefreshCwIcon className="size-4" /> : <SparklesIcon className="size-4" />}
                                {report ? "Regenerate" : "Generate report"}
                            </button>
                        )
                    }
                >
                    {!aiEnabled ? (
                        <p className="opacity-70 text-sm">AI isn't configured on the server (set GROQ_API_KEY or GEMINI_API_KEY).</p>
                    ) : !completed ? (
                        <p className="opacity-70 text-sm">End the session to generate the report.</p>
                    ) : report ? (
                        <>
                            <Markdown className={stream.loading ? "typing-caret" : ""}>{report}</Markdown>
                            {evaluation.reportGeneratedAt && !stream.loading && (
                                <p className="text-xs opacity-50 mt-4">Generated {new Date(evaluation.reportGeneratedAt).toLocaleString()}. AI can make mistakes; use it alongside your own judgement.</p>
                            )}
                        </>
                    ) : stream.loading ? (
                        <span className="loading loading-dots loading-md text-primary" />
                    ) : (
                        <p className="opacity-70 text-sm">
                            Fill in your scores and notes, then generate a report. The AI combines the role requirements, the final code, your notes and
                            your scores into a structured assessment with a recommendation.
                        </p>
                    )}
                    {stream.error && <div className="alert alert-warning mt-3 text-sm">{stream.error}</div>}
                </Section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Section icon={NotebookPenIcon} title="Your scorecard & notes">
                        <div className="space-y-3">
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
                            <textarea
                                className="textarea textarea-bordered w-full min-h-32 text-sm"
                                value={notes ?? ""}
                                maxLength={20000}
                                onChange={(e) => setNotes(e.target.value)}
                                onBlur={saveNotes}
                                placeholder="Your notes"
                            />
                        </div>
                    </Section>

                    <div className="space-y-6">
                        {(req.role || req.skills) && (
                            <Section icon={NotebookPenIcon} title="Role requirements">
                                <p className="font-semibold">
                                    {req.role} {req.level && <span className="opacity-60">· {req.level}</span>}
                                </p>
                                {req.skills && <p className="text-sm opacity-80">{req.skills}</p>}
                            </Section>
                        )}

                        <Section icon={FilmIcon} title="Recordings">
                            {recordings.isLoading ? (
                                <span className="loading loading-dots text-primary" />
                            ) : recordings.data?.recordings?.length ? (
                                <div className="space-y-3">
                                    {recordings.data.recordings.map((r) => (
                                        <div key={r.filename}>
                                            <video src={r.url} controls preload="metadata" className="w-full rounded-lg bg-black" />
                                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="link text-xs">
                                                {r.filename}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm opacity-70">No recordings. Use the Record button during the call to save one (recordings can take a minute to process).</p>
                            )}
                        </Section>
                    </div>
                </div>

                <Section icon={CodeIcon} title={`Final code ${evaluation.finalLanguage ? `(${capitalize(evaluation.finalLanguage)})` : ""}`}>
                    {evaluation.finalCode ? (
                        <pre className="bg-base-300 rounded-lg p-4 overflow-x-auto text-sm font-mono max-h-[32rem] scroll-area">
                            <code>{evaluation.finalCode}</code>
                        </pre>
                    ) : (
                        <p className="text-sm opacity-70">No code was captured.</p>
                    )}
                </Section>
            </main>
        </div>
    );
}

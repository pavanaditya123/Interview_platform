import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, BotIcon, MessagesSquareIcon, PrinterIcon, RefreshCwIcon, RepeatIcon, SparklesIcon } from "lucide-react";
import Navbar from "../Components/Navbar";
import Markdown from "../Components/Markdown";
import PerformanceCard from "../Components/PerformanceCard";
import { mockApi } from "../api/sessions";
import { streamPost } from "../lib/sse";
import { capitalize, formatDuration } from "../lib/utils";

const DIMENSIONS = [
    { key: "communication", label: "Communication" },
    { key: "technicalDepth", label: "Technical depth" },
    { key: "problemSolving", label: "Problem solving" },
    { key: "relevance", label: "Relevance to role" },
    { key: "confidence", label: "Confidence & clarity" },
];

const verdict = (n) =>
    !n ? "Report pending" : n >= 8 ? "Interview-ready" : n >= 6 ? "Almost there" : n >= 4 ? "Needs practice" : "Keep practicing";

export default function MockReportPage() {
    const { id } = useParams();
    const qc = useQueryClient();
    const { data, isLoading, error } = useQuery({ queryKey: ["mock-interview", id], queryFn: () => mockApi.get(id) });
    const [stream, setStream] = useState({ text: "", loading: false, error: null });
    const controllerRef = useRef(null);
    const autoStarted = useRef(false);

    const iv = data?.interview;

    const generate = async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setStream({ text: "", loading: true, error: null });
        const result = await streamPost(`/mock-interviews/${id}/report`, {}, {
            signal: controller.signal,
            onText: (_, full) => setStream((s) => ({ ...s, text: full })),
        });
        if (result.aborted) return;
        setStream((s) => ({ ...s, loading: false, error: result.error }));
        if (!result.error) {
            await qc.invalidateQueries({ queryKey: ["mock-interview", id] });
            qc.invalidateQueries({ queryKey: ["mock-interviews"] });
            setStream({ text: "", loading: false, error: null });
        }
    };

    // Generate automatically the first time the report is opened.
    useEffect(() => {
        if (iv && iv.status === "completed" && !iv.report && data.aiEnabled && !autoStarted.current) {
            autoStarted.current = true;
            generate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iv]);
    useEffect(() => () => controllerRef.current?.abort(), []);

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
    if (error || !iv) {
        return (
            <div className="min-h-dvh bg-base-200">
                <Navbar />
                <div className="text-center py-24 space-y-4">
                    <h1 className="text-2xl font-bold">Report not found</h1>
                    <Link to="/mock" className="btn btn-primary">
                        Back
                    </Link>
                </div>
            </div>
        );
    }

    const report = stream.loading || stream.text ? stream.text : iv.report;
    const scores = iv.scores ?? {};
    const answered = iv.messages.filter((m) => m.role === "candidate").length;

    return (
        <div className="min-h-dvh bg-base-200">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-2 print:hidden">
                    <Link to="/mock" className="btn btn-ghost btn-sm gap-1">
                        <ArrowLeftIcon className="size-4" /> AI interviews
                    </Link>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm gap-1" onClick={() => window.print()}>
                            <PrinterIcon className="size-4" /> Save as PDF
                        </button>
                        <Link to="/mock" className="btn btn-primary btn-sm gap-1">
                            <RepeatIcon className="size-4" /> Practice again
                        </Link>
                    </div>
                </div>

                {iv.status !== "completed" ? (
                    <div className="alert">
                        <span>This interview isn't finished yet.</span>
                        <Link to={`/mock/${id}`} className="btn btn-sm btn-primary">
                            Continue interview
                        </Link>
                    </div>
                ) : (
                    <PerformanceCard
                        title={`${iv.role}${iv.level ? ` · ${iv.level}` : ""}`}
                        subtitle={`${capitalize(iv.focus)} interview · ${answered} of ${iv.totalQuestions} questions answered · ${formatDuration(iv.createdAt, iv.completedAt ?? iv.updatedAt)} · ${new Date(iv.createdAt).toLocaleDateString()}`}
                        headline={{ label: "Overall score", value: scores.overall || null, max: 10 }}
                        bars={DIMENSIONS.map((d) => ({ label: d.label, value: scores[d.key] || 0, max: 10 }))}
                        badges={
                            <span className={`badge badge-lg ${scores.overall >= 8 ? "badge-success" : scores.overall >= 6 ? "badge-info" : scores.overall ? "badge-warning" : "badge-ghost"}`}>
                                {verdict(scores.overall)}
                            </span>
                        }
                    />
                )}

                {iv.status === "completed" && (
                    <section className="card bg-base-100 border border-base-300">
                        <div className="card-body">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <h2 className="card-title">
                                    <SparklesIcon className="size-5 text-primary" /> Your feedback from Ava
                                </h2>
                                {data.aiEnabled && iv.report && !stream.loading && (
                                    <button className="btn btn-ghost btn-sm gap-1 print:hidden" onClick={generate}>
                                        <RefreshCwIcon className="size-4" /> Regenerate
                                    </button>
                                )}
                            </div>
                            {!data.aiEnabled ? (
                                <p className="opacity-70 text-sm">AI isn't configured on the server.</p>
                            ) : report ? (
                                <Markdown className={stream.loading ? "typing-caret" : ""}>{report}</Markdown>
                            ) : stream.loading ? (
                                <div className="flex items-center gap-3 py-6">
                                    <div className="size-10 rounded-full orb orb-speaking flex items-center justify-center">
                                        <BotIcon className="size-5 text-white" />
                                    </div>
                                    <p className="opacity-70">Ava is reviewing your interview…</p>
                                </div>
                            ) : (
                                !stream.error && (
                                    <button className="btn btn-primary gap-2 self-start" onClick={generate}>
                                        <SparklesIcon className="size-4" /> Generate my report
                                    </button>
                                )
                            )}
                            {stream.error && (
                                <div className="alert alert-warning mt-3 text-sm">
                                    <span>{stream.error}</span>
                                    <button className="btn btn-sm" onClick={generate}>
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <details className="collapse collapse-arrow bg-base-100 border border-base-300">
                    <summary className="collapse-title font-semibold flex items-center gap-2">
                        <MessagesSquareIcon className="size-5 text-primary" /> Full transcript
                    </summary>
                    <div className="collapse-content space-y-3">
                        {iv.messages.map((m, i) => (
                            <div key={i} className={`chat ${m.role === "candidate" ? "chat-end" : "chat-start"}`}>
                                <div className="chat-header text-xs opacity-60">{m.role === "candidate" ? "You" : "Ava"}</div>
                                <div className={`chat-bubble text-sm ${m.role === "candidate" ? "chat-bubble-secondary" : ""}`}>{m.content}</div>
                            </div>
                        ))}
                    </div>
                </details>
            </main>
        </div>
    );
}

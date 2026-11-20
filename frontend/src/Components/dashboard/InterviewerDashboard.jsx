import { useMemo } from "react";
import { Link } from "react-router";
import { ClipboardCheckIcon, FileTextIcon, LockIcon } from "lucide-react";
import { useHostedSessions } from "../../hooks/useSessions";
import { recommendationOf } from "../../lib/evaluation";
import { timeAgo } from "../../lib/utils";

/** Interviews you conducted: candidate, role, score, recommendation, report. Private to you. */
export default function InterviewerDashboard() {
    const { data, isLoading } = useHostedSessions();
    const sessions = useMemo(() => data?.sessions ?? [], [data]);

    const stats = useMemo(() => {
        const scored = sessions.map((s) => s.evaluation?.averageScore).filter((n) => n != null);
        const hires = sessions.filter((s) => ["hire", "strong_hire", "lean_hire"].includes(s.evaluation?.recommendation)).length;
        return {
            total: sessions.length,
            avg: scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : "–",
            hires,
            reports: sessions.filter((s) => s.evaluation?.hasReport).length,
        };
    }, [sessions]);

    if (!isLoading && sessions.length === 0) return null;

    return (
        <section className="card bg-base-100 border-2 border-secondary/20 mt-8">
            <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-secondary to-primary rounded-xl">
                            <ClipboardCheckIcon className="size-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-black">Interviews you conducted</h2>
                    </div>
                    <span className="badge badge-ghost gap-1">
                        <LockIcon className="size-3" /> Only you can see this
                    </span>
                </div>

                <div className="stats stats-vertical sm:stats-horizontal bg-base-200 mb-4">
                    <div className="stat">
                        <div className="stat-title">Interviews</div>
                        <div className="stat-value text-secondary">{stats.total}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Avg. score</div>
                        <div className="stat-value">{stats.avg}<span className="text-base opacity-50">/5</span></div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Recommended</div>
                        <div className="stat-value text-success">{stats.hires}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">AI reports</div>
                        <div className="stat-value text-primary">{stats.reports}</div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto scroll-area">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Role</th>
                                    <th>Problem</th>
                                    <th>Score</th>
                                    <th>Recommendation</th>
                                    <th>When</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => {
                                    const rec = recommendationOf(s.evaluation?.recommendation);
                                    return (
                                        <tr key={s._id} className="hover">
                                            <td className="font-medium">{s.participant?.name ?? <span className="opacity-50">No-show</span>}</td>
                                            <td className="opacity-80">{s.evaluation?.role || "–"}</td>
                                            <td className="opacity-80">{s.problem}</td>
                                            <td className="font-mono">{s.evaluation?.averageScore ?? "–"}</td>
                                            <td>{rec ? <span className={`badge badge-sm ${rec.tone}`}>{rec.label}</span> : <span className="opacity-50">–</span>}</td>
                                            <td className="text-sm opacity-70 whitespace-nowrap">{timeAgo(s.createdAt)}</td>
                                            <td>
                                                <Link to={`/session/${s._id}/report`} className="btn btn-xs btn-primary gap-1">
                                                    <FileTextIcon className="size-3" /> Report
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

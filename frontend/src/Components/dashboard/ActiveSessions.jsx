import { memo } from "react";
import { Link } from "react-router";
import { ArrowRightIcon, Code2Icon, CrownIcon, SparklesIcon, UsersIcon, ZapIcon } from "lucide-react";
import { capitalize, getDifficultyBadgeClass, timeAgo } from "../../lib/utils";

const SessionRow = memo(function SessionRow({ session, userId }) {
    const isHost = session.host?.clerkId === userId;
    const isParticipant = session.participant?.clerkId === userId;
    const isFull = Boolean(session.participant);
    const isMine = isHost || isParticipant;

    return (
        <div className="card bg-base-200 border-2 border-base-300 hover:border-primary/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative size-14 shrink-0 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Code2Icon className="size-7 text-white" />
                        <div className="absolute -top-1 -right-1 size-4 bg-success rounded-full border-2 border-base-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-lg truncate">{session.problem}</h3>
                            <span className={`badge badge-sm ${getDifficultyBadgeClass(session.difficulty)}`}>
                                {capitalize(session.difficulty)}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm opacity-80 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <CrownIcon className="size-4" />
                                <span className="font-medium">{session.host?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <UsersIcon className="size-4" />
                                <span className="text-xs">{isFull ? "2/2" : "1/2"}</span>
                            </div>
                            <span className="text-xs opacity-70">{timeAgo(session.createdAt)}</span>
                            {isFull && !isMine ? (
                                <span className="badge badge-error badge-sm">FULL</span>
                            ) : (
                                <span className="badge badge-success badge-sm">OPEN</span>
                            )}
                        </div>
                    </div>
                </div>

                {isFull && !isMine ? (
                    <button className="btn btn-disabled btn-sm">Full</button>
                ) : (
                    <Link to={`/session/${session._id}`} className="btn btn-primary btn-sm gap-2">
                        {isMine ? "Rejoin" : "Join"}
                        <ArrowRightIcon className="size-4" />
                    </Link>
                )}
            </div>
        </div>
    );
});

function ActiveSessions({ sessions, isLoading, userId }) {
    return (
        <div className="lg:col-span-2 card bg-base-100 border-2 border-primary/20 hover:border-primary/30 h-full">
            <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                            <ZapIcon className="size-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-black">Live Sessions</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-2 bg-success rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-success">{sessions.length} active</span>
                    </div>
                </div>

                <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1 scroll-area">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : sessions.length > 0 ? (
                        sessions.map((session) => <SessionRow key={session._id} session={session} userId={userId} />)
                    ) : (
                        <div className="text-center py-16">
                            <div className="size-20 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center">
                                <SparklesIcon className="size-10 text-primary/50" />
                            </div>
                            <p className="text-lg font-semibold opacity-70 mb-1">No active sessions</p>
                            <p className="text-sm opacity-50">Be the first to create one!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ActiveSessions;

import { Code2Icon, ClockIcon, LoaderIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { capitalize, formatDuration, getDifficultyBadgeClass, timeAgo } from "../../lib/utils";

function RecentSessions({ sessions, isLoading }) {
    return (
        <div className="card bg-base-100 border-2 border-accent/20 hover:border-accent/30 mt-8">
            <div className="card-body">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-accent to-secondary rounded-xl">
                        <ClockIcon className="size-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">Your Past Sessions</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-20">
                            <LoaderIcon className="size-10 animate-spin text-primary" />
                        </div>
                    ) : sessions.length > 0 ? (
                        sessions.map((session) => (
                            <div key={session._id} className="card bg-base-200 border-2 border-base-300 hover:border-accent/40 transition-colors">
                                <div className="card-body p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="size-12 shrink-0 rounded-xl bg-gradient-to-br from-accent/80 to-secondary/80 flex items-center justify-center">
                                            <Code2Icon className="size-6 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-base mb-1 truncate">{session.problem}</h3>
                                            <span className={`badge badge-sm ${getDifficultyBadgeClass(session.difficulty)}`}>
                                                {capitalize(session.difficulty)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm opacity-80 mb-4">
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="size-4" />
                                            <span>
                                                {timeAgo(session.createdAt)} · {formatDuration(session.createdAt, session.updatedAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UsersIcon className="size-4" />
                                            <span className="truncate">
                                                {session.host?.name}
                                                {session.participant ? ` & ${session.participant.name}` : " (solo)"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-base-300">
                                        <span className="text-xs font-semibold opacity-80 uppercase">Completed</span>
                                        <span className="text-xs opacity-40">{new Date(session.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16">
                            <div className="size-20 mx-auto mb-4 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-3xl flex items-center justify-center">
                                <TrophyIcon className="size-10 text-accent/50" />
                            </div>
                            <p className="text-lg font-semibold opacity-70 mb-1">No sessions yet</p>
                            <p className="text-sm opacity-50">Start your coding journey today!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RecentSessions;

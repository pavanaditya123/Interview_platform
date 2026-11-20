import { Link } from "react-router";
import { ArrowRightIcon, BotIcon, FileUserIcon, MicIcon, TrendingUpIcon } from "lucide-react";

export default function MockInterviewCta() {
    return (
        <section className="mt-8 relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20">
            <div className="absolute -right-10 -top-10 size-56 rounded-full orb opacity-30 blur-2xl" aria-hidden />
            <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
                <div className="size-16 rounded-2xl orb flex items-center justify-center shrink-0 shadow-lg">
                    <BotIcon className="size-8 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                    <h2 className="text-2xl font-black">Practice with Ava, your AI interviewer</h2>
                    <p className="opacity-75">Upload your resume, pick a role, and get a realistic interview with a detailed report on where you can improve.</p>
                    <div className="flex flex-wrap gap-2 pt-1 text-sm">
                        <span className="badge badge-outline gap-1"><FileUserIcon className="size-3" /> Resume-aware questions</span>
                        <span className="badge badge-outline gap-1"><MicIcon className="size-3" /> Answer by voice</span>
                        <span className="badge badge-outline gap-1"><TrendingUpIcon className="size-3" /> Personal performance report</span>
                    </div>
                </div>
                <Link to="/mock" className="btn btn-primary btn-lg gap-2 self-start md:self-auto">
                    Start AI interview <ArrowRightIcon className="size-5" />
                </Link>
            </div>
        </section>
    );
}

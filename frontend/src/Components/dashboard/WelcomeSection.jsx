import { useUser } from "@clerk/clerk-react";
import { ArrowRightIcon, SparklesIcon, ZapIcon } from "lucide-react";

function WelcomeSection({ onCreateSession }) {
    const { user } = useUser();

    return (
        <div className="relative overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <SparklesIcon className="size-6 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                                Welcome back, {user?.firstName || "there"}!
                            </h1>
                        </div>
                        <p className="text-lg sm:text-xl text-base-content/60 ml-0 sm:ml-16">
                            Ready to level up your coding skills?
                        </p>
                    </div>
                    <button
                        onClick={onCreateSession}
                        className="group px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-2xl transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 self-start md:self-auto"
                    >
                        <div className="flex items-center gap-3 text-white font-bold text-lg">
                            <ZapIcon className="size-6" />
                            <span>Create Session</span>
                            <ArrowRightIcon className="size-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WelcomeSection;

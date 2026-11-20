import { CheckCircle2Icon, TrophyIcon, UsersIcon } from "lucide-react";

// Full class names (not string-built) so Tailwind can see them at build time.
const ACCENTS = {
    primary: { card: "border-primary/20 hover:border-primary/40", box: "bg-primary/10", icon: "text-primary" },
    secondary: { card: "border-secondary/20 hover:border-secondary/40", box: "bg-secondary/10", icon: "text-secondary" },
    accent: { card: "border-accent/20 hover:border-accent/40", box: "bg-accent/10", icon: "text-accent" },
};

function StatCard({ icon, label, value, accent, loading }) {
    const Icon = icon;
    const c = ACCENTS[accent];
    return (
        <div className={`card bg-base-100 border-2 transition-colors ${c.card}`}>
            <div className="card-body">
                <div className={`p-3 rounded-2xl self-start mb-3 ${c.box}`}>
                    <Icon className={`size-7 ${c.icon}`} />
                </div>
                <div className="text-4xl font-black mb-1">
                    {loading ? <span className="loading loading-dots loading-md" /> : value}
                </div>
                <div className="text-sm opacity-60">{label}</div>
            </div>
        </div>
    );
}

function StatsCards({ activeSessionsCount, recentSessionsCount, solvedCount, totalProblems, isLoading }) {
    return (
        <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6">
            <StatCard icon={UsersIcon} label="Active Sessions" value={activeSessionsCount} accent="primary" loading={isLoading} />
            <StatCard icon={TrophyIcon} label="Your Past Sessions" value={recentSessionsCount} accent="secondary" loading={isLoading} />
            <StatCard icon={CheckCircle2Icon} label="Problems Solved" value={`${solvedCount}/${totalProblems}`} accent="accent" />
        </div>
    );
}

export default StatsCards;

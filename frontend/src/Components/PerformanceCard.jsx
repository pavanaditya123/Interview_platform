/** A visual scorecard: big ring for the headline score plus a bar per criterion. */
function Ring({ value, max, label }) {
    const pct = value == null ? 0 : Math.max(0, Math.min(1, value / max));
    const r = 52;
    const c = 2 * Math.PI * r;
    const tone = value == null ? "text-base-content/20" : pct >= 0.75 ? "text-success" : pct >= 0.5 ? "text-warning" : "text-error";
    return (
        <div className="relative size-36 shrink-0" role="img" aria-label={`${label}: ${value ?? "not available"} out of ${max}`}>
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-base-300" />
                <circle
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    className={`${tone} transition-[stroke-dashoffset] duration-700`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{value ?? "–"}</span>
                <span className="text-xs opacity-60">/ {max}</span>
            </div>
        </div>
    );
}

export default function PerformanceCard({ title, subtitle, headline, bars = [], badges = null, children }) {
    return (
        <div className="card bg-gradient-to-br from-base-100 to-base-200 border border-primary/20 shadow-xl">
            <div className="card-body gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <Ring value={headline.value} max={headline.max} label={headline.label} />
                    <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-xs uppercase tracking-widest font-bold text-primary">{headline.label}</p>
                        <h2 className="text-2xl font-black leading-tight">{title}</h2>
                        {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
                        {badges && <div className="flex flex-wrap gap-2 pt-1">{badges}</div>}
                    </div>
                </div>

                {bars.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {bars.map((b) => {
                            const pct = b.value ? (b.value / b.max) * 100 : 0;
                            const tone = !b.value ? "progress" : pct >= 75 ? "progress-success" : pct >= 50 ? "progress-warning" : "progress-error";
                            return (
                                <div key={b.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{b.label}</span>
                                        <span className="font-mono opacity-70">{b.value ? `${b.value}/${b.max}` : "–"}</span>
                                    </div>
                                    <progress className={`progress ${tone} w-full`} value={b.value || 0} max={b.max} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

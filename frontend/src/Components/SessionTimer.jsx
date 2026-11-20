import { useEffect, useRef, useState } from "react";
import { TimerIcon } from "lucide-react";
import toast from "react-hot-toast";

const fmt = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Countdown for timed interviews (or elapsed time when untimed). */
export default function SessionTimer({ startedAt, durationMinutes }) {
    const [now, setNow] = useState(() => Date.now());
    const warned = useRef({ five: false, end: false });

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const elapsed = now - new Date(startedAt).getTime();
    const limitMs = durationMinutes * 60_000;
    const remaining = limitMs - elapsed;

    useEffect(() => {
        if (!durationMinutes) return;
        if (remaining <= 5 * 60_000 && remaining > 0 && !warned.current.five) {
            warned.current.five = true;
            toast("5 minutes left", { icon: "⏳" });
        }
        if (remaining <= 0 && !warned.current.end) {
            warned.current.end = true;
            toast("Time is up!", { icon: "⏰" });
        }
    }, [remaining, durationMinutes]);

    if (!durationMinutes) {
        return (
            <span className="badge badge-ghost gap-1 font-mono" title="Time since the session started">
                <TimerIcon className="size-3" /> {fmt(elapsed)}
            </span>
        );
    }

    const tone = remaining <= 0 ? "badge-error" : remaining <= 5 * 60_000 ? "badge-warning" : "badge-success";
    return (
        <span className={`badge ${tone} gap-1 font-mono`} title={`${durationMinutes} minute interview`} role="timer">
            <TimerIcon className="size-3" />
            {remaining <= 0 ? `+${fmt(-remaining)} over` : `${fmt(remaining)} left`}
        </span>
    );
}

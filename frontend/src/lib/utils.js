export const getDifficultyBadgeClass = (difficulty = "") => {
    switch (String(difficulty).toLowerCase()) {
        case "easy":
            return "badge-success";
        case "medium":
            return "badge-warning";
        case "hard":
            return "badge-error";
        default:
            return "badge-ghost";
    }
};

export const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const timeAgo = (date) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    const units = [
        ["year", 31536000],
        ["month", 2592000],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
    ];
    for (const [name, secs] of units) {
        const n = Math.floor(seconds / secs);
        if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
    }
    return "just now";
};

export const formatDuration = (start, end) => {
    const mins = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

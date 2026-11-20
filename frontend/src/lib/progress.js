// Per-browser conveniences: solved problems and auto-saved drafts. All access is guarded
// because storage can be unavailable (private mode, blocked cookies).

const SOLVED_KEY = "interviewhub:solved";
const draftKey = (problemId, language) => `interviewhub:draft:${problemId}:${language}`;

const read = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
};
const write = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore quota / unavailable storage
    }
};

export const getSolvedProblems = () => new Set(read(SOLVED_KEY, []));

const setSolved = (ids) => {
    write(SOLVED_KEY, [...new Set(ids)]);
    window.dispatchEvent(new Event("interviewhub:progress"));
};

export const markProblemSolved = (problemId) => {
    const solved = getSolvedProblems();
    solved.add(problemId);
    setSolved(solved);
    // Save to the account too (fire and forget; local copy already updated).
    import("./axios")
        .then(({ default: api }) => api.post("/users/me/progress", { problemIds: [problemId] }))
        .catch(() => {});
};

let syncPromise = null;
/** Merges this browser's progress with the account's, once per page load. */
export const syncProgress = () => {
    syncPromise ??= (async () => {
        try {
            const { default: api } = await import("./axios");
            const local = [...getSolvedProblems()];
            const { data } = local.length
                ? await api.post("/users/me/progress", { problemIds: local })
                : await api.get("/users/me/progress");
            setSolved([...local, ...(data.solvedProblems ?? [])]);
        } catch {
            syncPromise = null; // try again next time
        }
    })();
    return syncPromise;
};

export const getDraft = (problemId, language) => read(draftKey(problemId, language), null);
export const saveDraft = (problemId, language, code) => write(draftKey(problemId, language), code);
export const clearDraft = (problemId, language) => {
    try {
        localStorage.removeItem(draftKey(problemId, language));
    } catch {
        // ignore
    }
};

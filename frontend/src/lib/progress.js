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

export const markProblemSolved = (problemId) => {
    const solved = getSolvedProblems();
    solved.add(problemId);
    write(SOLVED_KEY, [...solved]);
    window.dispatchEvent(new Event("interviewhub:progress"));
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

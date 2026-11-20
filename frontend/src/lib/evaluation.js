export const SCORE_CRITERIA = [
    { key: "problemSolving", label: "Problem solving" },
    { key: "codeQuality", label: "Code quality" },
    { key: "communication", label: "Communication" },
    { key: "technicalKnowledge", label: "Technical knowledge" },
    { key: "testing", label: "Testing & edge cases" },
];

export const RECOMMENDATIONS = [
    { value: "strong_hire", label: "Strong hire", tone: "badge-success" },
    { value: "hire", label: "Hire", tone: "badge-success" },
    { value: "lean_hire", label: "Lean hire", tone: "badge-info" },
    { value: "no_hire", label: "No hire", tone: "badge-warning" },
    { value: "strong_no_hire", label: "Strong no hire", tone: "badge-error" },
];

export const recommendationOf = (value) => RECOMMENDATIONS.find((r) => r.value === value);

export const averageScore = (scores = {}) => {
    const vals = SCORE_CRITERIA.map((c) => scores[c.key]).filter((n) => n > 0);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
};

/** Reads "AI score: N/10" out of a generated report. */
export const parseAiScore = (report = "") => {
    const m = String(report).match(/AI score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    return m ? Math.min(10, Number(m[1])) : null;
};

// Pure helpers for comparing program output with expected output (unit tested).

export const normalizeOutput = (output = "") =>
    String(output)
        .replace(/\r\n/g, "\n")
        .trim()
        .split("\n")
        .map((line) =>
            line
                .trim()
                .replace(/\[\s+/g, "[")
                .replace(/\s+\]/g, "]")
                .replace(/\s*,\s*/g, ",")
        )
        .filter((line) => line.length > 0)
        .join("\n");

export const linesMatch = (actual, expected) => normalizeOutput(actual) === normalizeOutput(expected);

export function buildTestResults(actualOutput, expectedOutput) {
    const expectedLines = normalizeOutput(expectedOutput).split("\n");
    const actualLines = normalizeOutput(actualOutput).split("\n");

    const testCaseResults = expectedLines.map((expected, index) => {
        const actual = actualLines[index] ?? "";
        return { passed: linesMatch(actual, expected), actual, expected };
    });

    return { testCaseResults, allPassed: testCaseResults.every((t) => t.passed) };
}

// Mirrors how console.log output is compared: arrays/objects as compact JSON, primitives as text.
export function formatValue(value) {
    if (typeof value === "string") return value;
    if (value === undefined) return "undefined";
    if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
    if (typeof value === "bigint") return `${value}n`;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (value && typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

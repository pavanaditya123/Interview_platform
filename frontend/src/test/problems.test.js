import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { PROBLEMS, LANGUAGE_CONFIG } from "../data/problems";
import { buildTestResults, formatValue } from "../lib/judge";
import { JS_SOLUTIONS, PY_SOLUTIONS, harnessOf } from "./referenceSolutions";

const problems = Object.values(PROBLEMS);

// Runs JS the same way the browser worker does: console.log args formatted with formatValue.
const runJs = (code) => {
    const out = [];
    const log = (...args) => out.push(args.map(formatValue).join(" "));
    new Function("console", code)({ log, info: log, warn: log, error: log });
    return out.join("\n");
};

const python = ["python3", "python"].find((bin) => spawnSync(bin, ["--version"]).status === 0);

describe("problem catalogue", () => {
    it.each(problems.map((p) => [p.id, p]))("%s has a complete definition", (id, p) => {
        expect(p.id).toBe(id);
        expect(["Easy", "Medium", "Hard"]).toContain(p.difficulty);
        expect(p.description.text.length).toBeGreaterThan(10);
        expect(p.examples.length).toBeGreaterThan(0);
        for (const lang of Object.keys(LANGUAGE_CONFIG)) {
            expect(p.starterCode[lang], `${id} ${lang} starter`).toBeTruthy();
            expect(p.expectedOutput[lang], `${id} ${lang} expected`).toBeTruthy();
            // one expected line per printed test case
            const prints = (p.starterCode[lang].match(/console\.log\(|print\(|System\.out\.println\(/g) || []).length;
            expect(p.expectedOutput[lang].split("\n").length, `${id} ${lang} test count`).toBe(prints);
        }
    });

    it("has a unique title per problem (sessions look problems up by title)", () => {
        const titles = problems.map((p) => p.title);
        expect(new Set(titles).size).toBe(titles.length);
    });

    it("every problem has reference solutions", () => {
        for (const p of problems) {
            expect(JS_SOLUTIONS[p.id], p.id).toBeTruthy();
            expect(PY_SOLUTIONS[p.id], p.id).toBeTruthy();
        }
    });
});

describe("JavaScript expected outputs are correct", () => {
    it.each(problems.map((p) => [p.id, p]))("%s", (id, p) => {
        const code = `${JS_SOLUTIONS[id]}\n${harnessOf(p.starterCode.javascript, "// Test cases")}`;
        const { allPassed, testCaseResults } = buildTestResults(runJs(code), p.expectedOutput.javascript);
        expect(testCaseResults.filter((t) => !t.passed)).toEqual([]);
        expect(allPassed).toBe(true);
    });

    it.each(problems.map((p) => [p.id, p]))("%s starter code does not pass", (id, p) => {
        const { allPassed } = buildTestResults(runJs(p.starterCode.javascript), p.expectedOutput.javascript);
        expect(allPassed).toBe(false);
    });
});

describe.skipIf(!python)("Python expected outputs are correct", () => {
    it.each(problems.map((p) => [p.id, p]))("%s", (id, p) => {
        const code = `${PY_SOLUTIONS[id]}\n\n${harnessOf(p.starterCode.python, "# Test cases")}`;
        const res = spawnSync(python, ["-I", "-c", code], { encoding: "utf8" });
        expect(res.stderr).toBe("");
        const { testCaseResults, allPassed } = buildTestResults(res.stdout, p.expectedOutput.python);
        expect(testCaseResults.filter((t) => !t.passed)).toEqual([]);
        expect(allPassed).toBe(true);
    });
});

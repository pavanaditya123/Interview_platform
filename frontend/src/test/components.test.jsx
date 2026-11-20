import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OutputPanel from "../Components/OutputPanel";
import ProblemDescription from "../Components/ProblemDescription";
import { PROBLEMS } from "../data/problems";

describe("OutputPanel", () => {
    it("shows a placeholder before the first run", () => {
        render(<OutputPanel output={null} isRunning={false} />);
        expect(screen.getByText(/run code to view output/i)).toBeInTheDocument();
    });

    it("shows a loader while running", () => {
        render(<OutputPanel output={null} isRunning />);
        expect(screen.getByText(/running tests/i)).toBeInTheDocument();
    });

    it("shows runtime errors with partial output", () => {
        render(<OutputPanel output={{ success: false, error: "ReferenceError: x", output: "partial" }} isRunning={false} />);
        expect(screen.getByText("ReferenceError: x")).toBeInTheDocument();
        expect(screen.getByText("partial")).toBeInTheDocument();
    });

    it("shows Accepted and lets you switch between cases", () => {
        const output = {
            success: true,
            allPassed: false,
            testCaseResults: [
                { passed: true, actual: "1", expected: "1" },
                { passed: false, actual: "5", expected: "2" },
            ],
        };
        render(<OutputPanel output={output} isRunning={false} />);
        expect(screen.getByText("Wrong Answer")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Case 2"));
        expect(screen.getByText("Case 2 Details")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
    });
});

describe("ProblemDescription", () => {
    const problem = PROBLEMS["two-sum"];

    it("renders the problem without a selector in session mode", () => {
        render(<ProblemDescription problem={problem} />);
        expect(screen.getByRole("heading", { name: /two sum/i })).toBeInTheDocument();
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("renders a problem selector in practice mode", () => {
        render(
            <ProblemDescription
                problem={problem}
                currentProblemId="two-sum"
                onProblemChange={() => {}}
                allProblems={Object.values(PROBLEMS)}
            />
        );
        expect(screen.getByRole("combobox")).toHaveValue("two-sum");
    });

    it("shows a solved indicator", () => {
        render(<ProblemDescription problem={problem} isSolved />);
        expect(screen.getByLabelText("Solved")).toBeInTheDocument();
    });
});

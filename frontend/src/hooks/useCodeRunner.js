import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { executeCode } from "../lib/piston";
import { buildTestResults } from "../lib/judge";

let confettiModule = null;
const celebrate = async () => {
    // canvas-confetti is only downloaded the first time someone passes all tests.
    confettiModule ??= (await import("canvas-confetti")).default;
    confettiModule({ particleCount: 80, spread: 250, origin: { x: 0.2, y: 0.6 } });
    confettiModule({ particleCount: 80, spread: 250, origin: { x: 0.8, y: 0.6 } });
};

export function useCodeRunner({ onAllPassed } = {}) {
    const [output, setOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const running = useRef(false);

    const run = useCallback(
        async (language, code, expectedOutput) => {
            if (running.current) return;
            running.current = true;
            setIsRunning(true);
            setOutput(null);

            try {
                const result = await executeCode(language, code);
                if (result.success) {
                    const { testCaseResults, allPassed } = buildTestResults(result.output, expectedOutput);
                    setOutput({ ...result, testCaseResults, allPassed });
                    if (allPassed) {
                        celebrate();
                        toast.success("All tests passed!");
                        onAllPassed?.();
                    } else {
                        toast.error("Some tests failed.");
                    }
                } else {
                    setOutput(result);
                    toast.error("Your code produced an error");
                }
            } catch (error) {
                console.error("Run code error:", error);
                setOutput({ success: false, error: "Failed to run code" });
                toast.error("Failed to run code");
            } finally {
                running.current = false;
                setIsRunning(false);
            }
        },
        [onAllPassed]
    );

    return { output, setOutput, isRunning, run };
}

import { useEffect, useState } from "react";
import { getSolvedProblems, syncProgress } from "../lib/progress";

export function useSolvedProblems() {
    const [solved, setSolved] = useState(() => getSolvedProblems());

    useEffect(() => {
        const refresh = () => setSolved(getSolvedProblems());
        syncProgress();
        window.addEventListener("interviewhub:progress", refresh);
        window.addEventListener("storage", refresh); // other tabs
        return () => {
            window.removeEventListener("interviewhub:progress", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    return solved;
}

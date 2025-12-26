import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router';
import { PROBLEMS } from '../data/problems';
import Navbar from "../Components/Navbar";
import ProblemDescription from "../Components/ProblemDescription";
import CodeEditorPanel from "../Components/CodeEditorPanel";
import OutputPanel from "../Components/OutputPanel";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import toast from 'react-hot-toast';
import confetti from "canvas-confetti";
import { executeCode } from "../lib/piston.js";

const ProblemPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [currentProblemId, setcurrentProblemId] = useState("two-sum");
    const [selectedlanguage, setselectedlanguage] = useState("javascript");
    const [output, setoutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [code, setcode] = useState(PROBLEMS[currentProblemId].starterCode.javascript);

    const currentproblem = PROBLEMS[currentProblemId];

    const handleLanguagechange = (e) => {
        const newlang = e.target.value;
        setselectedlanguage(newlang);
        setcode(currentproblem.starterCode[newlang]);
        setoutput(null);
    };

    const triggerConfetti = () => {
        confetti({ particleCount: 80, spread: 250, origin: { x: 0.2, y: 0.6 } });
        confetti({ particleCount: 80, spread: 250, origin: { x: 0.8, y: 0.6 } });
    };

    const handleproblemchange = (newProblemId) => navigate(`/problem/${newProblemId}`);

    const normalizeOutput = (output) => {
        return output
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
    };

    const checkiftestcasespassed = (actualoutput, expectedOutput) => {
        const normalizedActual = normalizeOutput(actualoutput);
        const normalizedExpected = normalizeOutput(expectedOutput);
        return normalizedActual === normalizedExpected;
    };

    const handleRunCode = async () => {
        setIsRunning(true); // Start loading state
        setoutput(null);    // Clear previous output

        try {
            const result = await executeCode(selectedlanguage, code);

            if (result.success) {
                const expectedLines = currentproblem.expectedOutput[selectedlanguage].trim().split("\n");
                const actualLines = result.output.trim().split("\n");

                const testCaseResults = expectedLines.map((expected, index) => {
                    const actual = actualLines[index] || "";
                    return {
                        passed: checkiftestcasespassed(actual, expected),
                        actual: actual,
                        expected: expected
                    };
                });

                const allPassed = testCaseResults.every(test => test.passed);

                if (allPassed) {
                    triggerConfetti();
                    toast.success("All tests passed!");
                } else {
                    toast.error("Some tests failed.");
                }

                setoutput({ ...result, testCaseResults, allPassed });
            } else {
                setoutput(result);
                toast.error("Logical Error!");
            }
        } catch (error) {
            console.error("Run Code Error:", error);
            toast.error("Failed to connect to execution server.");
            setoutput({ success: false, error: "Network Error" });
        } finally {
            setIsRunning(false);
        }
    };

    useEffect(() => {
        if (id && PROBLEMS[id]) {
            setcurrentProblemId(id);
            setcode(PROBLEMS[id].starterCode[selectedlanguage]);
            setoutput(null);
        }
    }, [id, selectedlanguage]);

    return (
        <div className='h-screen w-screen bg-base-100 flex flex-col'>
            <Navbar />
            <div className="flex-1">
                <PanelGroup direction="horizontal">
                    <Panel defaultSize={40} minSize={30}>
                        <ProblemDescription
                            problem={currentproblem}
                            currentProblemId={currentProblemId}
                            onProblemChange={handleproblemchange}
                            allProblems={Object.values(PROBLEMS)}
                        />
                    </Panel>
                    <PanelResizeHandle className='w-2 bg-base-200 hover:bg-primary transition-colors cursor-col-resize' />
                    <Panel defaultSize={50} minSize={30}>
                        <PanelGroup direction='vertical'>
                            <Panel defaultSize={70} minSize={30}>
                                <CodeEditorPanel
                                    selectedLanguage={selectedlanguage}
                                    code={code}
                                    isRunning={isRunning}
                                    onLanguageChange={handleLanguagechange}
                                    onCodeChange={setcode}
                                    onRunCode={handleRunCode}
                                />
                            </Panel>
                            <PanelResizeHandle className='h-2 bg-base-200 hover:bg-primary transition-colors cursor-row-resize' />
                            <Panel defaultSize={30} minSize={20}>
                                <OutputPanel output={output} isRunning={isRunning} />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
};

export default ProblemPage;
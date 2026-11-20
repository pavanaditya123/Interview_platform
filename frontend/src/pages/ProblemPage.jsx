import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { PROBLEMS } from "../data/problems";
import Navbar from "../Components/Navbar";
import ProblemDescription from "../Components/ProblemDescription";
import CodeEditorPanel from "../Components/CodeEditorPanel";
import OutputPanel from "../Components/OutputPanel";
import AiAssistantPanel from "../Components/AiAssistantPanel";
import { SparklesIcon, TerminalIcon } from "lucide-react";
import { useCodeRunner } from "../hooks/useCodeRunner";
import { useSolvedProblems } from "../hooks/useSolvedProblems";
import { clearDraft, getDraft, markProblemSolved, saveDraft } from "../lib/progress";
import { preloadPython } from "../lib/piston";

const ALL_PROBLEMS = Object.values(PROBLEMS);

const ProblemPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const problem = PROBLEMS[id];

    const [language, setLanguage] = useState("javascript");
    const [bottomTab, setBottomTab] = useState("output");
    const [code, setCode] = useState(() => (problem ? getDraft(id, "javascript") ?? problem.starterCode.javascript : ""));
    const solved = useSolvedProblems();

    const onAllPassed = useCallback(() => markProblemSolved(id), [id]);
    const { output, setOutput, isRunning, run } = useCodeRunner({ onAllPassed });

    // Load the saved draft (or starter code) whenever the problem or language changes.
    useEffect(() => {
        if (!problem) return;
        setCode(getDraft(id, language) ?? problem.starterCode[language]);
        setOutput(null);
    }, [id, language, problem, setOutput]);

    // Debounced autosave.
    const saveTimer = useRef(null);
    const handleCodeChange = useCallback(
        (value) => {
            setCode(value);
            clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => saveDraft(id, language, value), 400);
        },
        [id, language]
    );
    useEffect(() => () => clearTimeout(saveTimer.current), []);

    const handleLanguageChange = useCallback((e) => {
        const next = e.target.value;
        if (next === "python") preloadPython();
        setLanguage(next);
    }, []);

    const handleReset = useCallback(() => {
        clearDraft(id, language);
        setCode(problem.starterCode[language]);
        setOutput(null);
    }, [id, language, problem, setOutput]);

    const handleRunCode = useCallback(() => {
        setBottomTab("output");
        return run(language, code, problem.expectedOutput[language]);
    }, [run, language, code, problem]);

    const handleProblemChange = useCallback((newId) => navigate(`/problem/${newId}`), [navigate]);

    const isSolved = useMemo(() => solved.has(id), [solved, id]);

    if (!problem) return <Navigate to="/problems" replace />;

    return (
        <div className="h-dvh w-full bg-base-100 flex flex-col overflow-hidden">
            <Navbar />
            <div className="flex-1 min-h-0">
                <PanelGroup direction="horizontal" autoSaveId="problem-layout-h">
                    <Panel defaultSize={40} minSize={25}>
                        <ProblemDescription
                            problem={problem}
                            currentProblemId={id}
                            onProblemChange={handleProblemChange}
                            allProblems={ALL_PROBLEMS}
                            isSolved={isSolved}
                        />
                    </Panel>
                    <PanelResizeHandle className="w-2 bg-base-200 hover:bg-primary transition-colors cursor-col-resize" />
                    <Panel defaultSize={60} minSize={30}>
                        <PanelGroup direction="vertical" autoSaveId="problem-layout-v">
                            <Panel defaultSize={70} minSize={30}>
                                <CodeEditorPanel
                                    selectedLanguage={language}
                                    code={code}
                                    isRunning={isRunning}
                                    onLanguageChange={handleLanguageChange}
                                    onCodeChange={handleCodeChange}
                                    onRunCode={handleRunCode}
                                    onResetCode={handleReset}
                                />
                            </Panel>
                            <PanelResizeHandle className="h-2 bg-base-200 hover:bg-primary transition-colors cursor-row-resize" />
                            <Panel defaultSize={30} minSize={15}>
                                <div className="h-full flex flex-col">
                                    <div role="tablist" className="tabs tabs-border bg-base-100 px-2 shrink-0">
                                        <button
                                            role="tab"
                                            className={`tab gap-1 ${bottomTab === "output" ? "tab-active" : ""}`}
                                            onClick={() => setBottomTab("output")}
                                        >
                                            <TerminalIcon className="size-4" /> Output
                                        </button>
                                        <button
                                            role="tab"
                                            className={`tab gap-1 ${bottomTab === "ai" ? "tab-active" : ""}`}
                                            onClick={() => setBottomTab("ai")}
                                        >
                                            <SparklesIcon className="size-4" /> AI Assistant
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        {/* both stay mounted so switching tabs keeps their state */}
                                        <div className={bottomTab === "output" ? "h-full" : "hidden"}>
                                            <OutputPanel output={output} isRunning={isRunning} />
                                        </div>
                                        <div className={bottomTab === "ai" ? "h-full" : "hidden"}>
                                            <AiAssistantPanel problem={problem} language={language} code={code} />
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
};

export default ProblemPage;

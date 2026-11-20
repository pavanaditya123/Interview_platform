import { memo, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Loader2Icon, PlayIcon, RotateCcwIcon, RadioIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "../data/problems";

function CodeEditorPanel({
    selectedLanguage,
    code,
    isRunning,
    onLanguageChange,
    onCodeChange,
    onRunCode,
    onResetCode,
    isLiveSynced = false,
}) {
    // Keep the latest run handler for the Monaco keybinding (registered once on mount).
    const runRef = useRef(onRunCode);
    useEffect(() => {
        runRef.current = onRunCode;
    }, [onRunCode]);

    const handleMount = (editor, monaco) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    };

    const lang = LANGUAGE_CONFIG[selectedLanguage];

    return (
        <div className="h-full flex flex-col overflow-hidden rounded-xl border border-base-300 shadow-xl bg-base-200">
            <div className="bg-base-300 border-b border-base-300 rounded-t-xl px-4 py-2 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={lang.icon} alt={lang.name} className="size-6" width="24" height="24" />
                    <select
                        className="select select-sm select-bordered bg-base-200 text-xs font-bold uppercase tracking-widest focus:outline-none"
                        value={selectedLanguage}
                        onChange={onLanguageChange}
                        aria-label="Language"
                    >
                        {Object.entries(LANGUAGE_CONFIG).map(([key, l]) => (
                            <option key={key} value={key} className="bg-base-200 text-base-content">
                                {l.name}
                            </option>
                        ))}
                    </select>
                    {isLiveSynced && (
                        <span className="badge badge-success badge-sm gap-1" title="Your edits are shared live with the other participant">
                            <RadioIcon className="size-3 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {onResetCode && (
                        <button className="btn btn-sm btn-ghost gap-1" onClick={onResetCode} disabled={isRunning} title="Reset to starter code">
                            <RotateCcwIcon className="size-4" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                    <button
                        disabled={isRunning}
                        onClick={onRunCode}
                        title="Run code (Ctrl/Cmd + Enter)"
                        className={`btn btn-sm px-6 uppercase tracking-widest font-extrabold transition duration-300 ${
                            isRunning ? "btn-disabled" : "btn-success shadow-md hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                        }`}
                    >
                        {isRunning ? (
                            <>
                                <Loader2Icon className="size-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <PlayIcon className="size-4 fill-current" />
                                Run Code
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-base-200 min-h-0">
                <Editor
                    height="100%"
                    language={lang.monacoLang}
                    value={code}
                    onChange={(value) => onCodeChange(value ?? "")}
                    onMount={handleMount}
                    theme="vs-dark"
                    loading={<span className="loading loading-spinner loading-md text-primary" />}
                    options={{
                        fontSize: 15,
                        minimap: { enabled: false },
                        padding: { top: 20, bottom: 20 },
                        cursorBlinking: "expand",
                        smoothScrolling: true,
                        automaticLayout: true,
                        bracketPairColorization: { enabled: true },
                        renderLineHighlight: "all",
                        scrollBeyondLastLine: false,
                        mouseWheelScrollSensitivity: 1.2,
                        tabSize: 4,
                        scrollbar: {
                            vertical: "visible",
                            horizontal: "visible",
                            verticalScrollbarSize: 8,
                            handleMouseWheel: true,
                            alwaysConsumeMouseWheel: false, // let the page scroll when the editor reaches its end
                        },
                    }}
                />
            </div>
        </div>
    );
}

export default memo(CodeEditorPanel);

import Editor from "@monaco-editor/react";
import { Loader2Icon, PlayIcon, Code2 } from "lucide-react";
import { LANGUAGE_CONFIG } from "../data/problems";

function CodeEditorPanel({
    selectedLanguage,
    code,
    isRunning,
    onLanguageChange,
    onCodeChange,
    onRunCode
}) { 
    return (
        <div className="h-full flex flex-col overflow-hidden rounded-xl border border-base-300 shadow-xl bg-base-200">

            {/* TOP BAR - Run button aligned right */}
            <div className="navbar bg-base-300 border-b border-base-300 rounded-t-xl px-4 py-2 flex justify-between">

                {/* LEFT GROUP */}
                <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <img
                        src={LANGUAGE_CONFIG[selectedLanguage].icon}
                        alt={LANGUAGE_CONFIG[selectedLanguage].name}
                        className="size-6"
                    />
                    <select
                        className="select select-sm select-bordered bg-base-200 text-xs font-bold uppercase tracking-widest focus:outline-none"
                        value={selectedLanguage}
                        onChange={onLanguageChange}
                    >
                        {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
                            <option key={key} value={key} className="bg-base-200 text-base-content">
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* RIGHT GROUP */}
                <div className="flex items-center gap-3">
                    <button
                        disabled={isRunning}
                        onClick={onRunCode}
                        className={`btn btn-sm px-6 uppercase tracking-widest font-extrabold transition duration-300 ${isRunning
                            ? "btn-disabled"
                            : "btn-success shadow-md hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
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

            {/* EDITOR */}
            <div className="flex-1 bg-base-200">
                <Editor
                    height="100%"
                    language={LANGUAGE_CONFIG[selectedLanguage].monacoLang}
                    value={code}
                    onChange={onCodeChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 15,
                        minimap: { enabled: true },
                        padding: { top: 20, bottom: 20 },
                        cursorBlinking: "expand",
                        smoothScrolling: true,
                        automaticLayout: true,
                        bracketPairColorization: { enabled: true },
                        renderLineHighlight: "all",
                        scrollBeyondLastLine: true,
                        mouseWheelScrollSensitivity: 1.2,
                        scrollbar: {
                            vertical: "visible",
                            horizontal: "visible",
                            verticalScrollbarSize: 7,
                            handleMouseWheel: true,
                        },
                    }}
                />
            </div>
        </div>
    );
}

export default CodeEditorPanel;

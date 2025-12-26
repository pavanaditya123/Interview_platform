import React, { useEffect, useState } from "react";
import { Terminal, XCircle, Info } from "lucide-react";

const OutputPanel = ({ output, isRunning }) => {
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (output?.testCaseResults) setActiveTab(0);
    }, [output]);

    // Before first run
    if (!output && !isRunning) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-base-200 text-base-content/50">
                <Terminal className="size-8" />
                <p className="font-medium">Run code to view output</p>
            </div>
        );
    }

    // While running
    if (isRunning) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-base-200">
                <span className="loading loading-ring loading-lg text-primary"></span>
                <p className="font-bold uppercase text-xs tracking-widest animate-pulse text-primary">
                    Running Tests...
                </p>
            </div>
        );
    }

    // Runtime error
    if (!output.success && !output.testCaseResults) {
        return (
            <div className="h-full bg-base-200 p-4 overflow-y-auto">
                <div className="alert alert-error mb-4">
                    <XCircle className="size-5" />
                    <span>Runtime Error</span>
                </div>

                <pre className="bg-error text-error-content rounded p-4 whitespace-pre-wrap font-mono text-sm">
                    {output.error || "unknown error"}
                </pre>
            </div>
        );
    }

    const { testCaseResults, allPassed } = output;

    return (
        <div className="h-full flex flex-col bg-base-200 overflow-hidden">
            {/* Status Bar */}
            <div className="p-3 border-b border-base-300 bg-base-100">
                <span
                    className={`badge badge-lg font-bold ${allPassed ? "badge-success" : "badge-error"
                        }`}
                >
                    {allPassed ? "Accepted" : "Wrong Answer"}
                </span>
            </div>

            {/* Output Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Testcase buttons */}
                <div className="flex flex-wrap gap-2">
                    {testCaseResults.map((test, index) => (
                        <button
                            key={index}
                            className={`btn btn-xs ${test.passed ? "btn-success" : "btn-error"
                                } ${activeTab === index ? "ring-2 ring-primary" : "btn-outline"}`}
                            onClick={() => setActiveTab(index)}
                        >
                            Case {index + 1}
                        </button>
                    ))}
                </div>

                {/* Case header */}
                <span className="text-[11px] font-bold uppercase text-base-content/60 flex items-center gap-2">
                    <Info className="size-3" />
                    Case {activeTab + 1} Details
                </span>

                {/* Output grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-mono">
                    {/* Your Output */}
                    <div className="relative p-2">
                        <p className="text-[10px] uppercase font-bold text-base-content/50 mb-1">
                            Your Output
                        </p>

                        <span
                            className={`absolute top-2 right-4 text-lg ${testCaseResults[activeTab].passed ? "text-success" : "text-error"
                                }`}
                        >
                            {testCaseResults[activeTab].passed ? "✓" : "✗"}
                        </span>

                        <div
                            className={`min-h-14 rounded border p-3 overflow-x-auto ${testCaseResults[activeTab].passed
                                    ? "bg-success/15 border-success/40 text-success"
                                    : "bg-error/15 border-error/40 text-error"
                                }`}
                        >
                            <code className="whitespace-pre-wrap block">
                                {testCaseResults[activeTab].actual || "no-output"}
                            </code>
                        </div>

                        <button
                            onClick={() =>
                                navigator.clipboard.writeText(
                                    testCaseResults[activeTab].actual || ""
                                )
                            }
                            className="absolute bottom-2 right-4 text-xs btn btn-ghost btn-xs opacity-60 hover:opacity-100"
                        >
                            📋 Copy
                        </button>
                    </div>

                    {/* Expected Output */}
                    <div className="relative p-2">
                        <p className="text-[10px] uppercase font-bold text-base-content/50 mb-1">
                            Expected Output
                        </p>

                        <div className="min-h-14 bg-neutral/40 text-neutral-content rounded border border-neutral/20 p-3 overflow-x-auto">
                            <code className="whitespace-pre-wrap block">
                                {testCaseResults[activeTab].expected}
                            </code>
                        </div>

                        <button
                            onClick={() =>
                                navigator.clipboard.writeText(testCaseResults[activeTab].expected)
                            }
                            className="absolute bottom-2 right-4 text-xs btn btn-ghost btn-xs opacity-60 hover:opacity-100"
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutputPanel;

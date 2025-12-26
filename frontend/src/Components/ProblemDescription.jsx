import { getDifficultyBadgeClass } from "../lib/utils";

function ProblemDescription({ problem, currentProblemId, onProblemChange, allProblems }) {
    return (
        <div className="h-full overflow-y-auto p-6 space-y-6 text-base-content bg-base-200/20">

            {/* HEADER */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 space-y-3  shadow-sm">
                <div className="flex items-start justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">{problem.title}</h1>
                    <span className={`badge ${getDifficultyBadgeClass(problem.difficulty)} font-bold`}>
                        {problem.difficulty}
                    </span>
                </div>

                <p className="text-base-content/60 font-medium">{problem.category}</p>

                <div className="pt-2">
                    <select
                        className="select select-bordered select-sm w-full focus:select-primary"
                        value={currentProblemId}
                        onChange={(e) => onProblemChange(e.target.value)}
                    >
                        {allProblems.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title} - {p.difficulty}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* DESCRIPTION */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 space-y-3 ">
                <h2 className="text-xl font-bold">Description</h2>
                <div className="space-y-2 leading-relaxed text-base-content/80">
                    <p>{problem.description.text}</p>
                    {problem.description.notes.map((note, index) => (
                        <div key={index} className="p-3 bg-base-200 rounded-lg italic text-sm border-l-4 border-info">
                            {note}
                        </div>
                    ))}
                </div>
            </div>

            {/* EXAMPLES */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold px-1">Examples</h2>
                {problem.examples.map((example, idx) => (
                    <div
                        key={idx}
                        className="group bg-base-100 border border-base-300 rounded-xl p-5 space-y-4 transition-all duration-300 hover:bg-success/5 hover:border-success/40 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="badge badge-sm group-hover:badge-success transition-colors font-bold">{idx + 1}</span>
                            <p className="font-bold group-hover:text-success transition-colors text-sm uppercase tracking-wider">Example {idx + 1}</p>
                        </div>

                        <div className="bg-base-200 rounded-lg p-4 font-mono text-sm space-y-2 border border-transparent group-hover:border-success/20">
                            <div className="flex gap-4">
                                <span className="text-primary font-bold min-w-[70px]">Input:</span>
                                <span className="break-all">{example.input}</span>
                            </div>

                            <div className="flex gap-4">
                                <span className="text-secondary font-bold min-w-[70px]">Output:</span>
                                <span className="break-all">{example.output}</span>
                            </div>

                            {example.explanation && (
                                <div className="pt-2 border-t border-base-300 mt-2">
                                    <span className="text-base-content/60 font-sans text-xs">
                                        <span className="font-bold text-base-content/80">Explanation:</span> {example.explanation}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* CONSTRAINTS */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 space-y-2 ">
                <h2 className="text-xl font-bold mb-2">Constraints</h2>
                <ul className="space-y-2">
                    {problem.constraints.map((constraint, idx) => (
                        <li key={idx} className="flex gap-2 items-center">
                            <span className="text-success font-bold">•</span>
                            <code className="text-sm bg-base-200 px-2 py-0.5 rounded">{constraint}</code>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default ProblemDescription;
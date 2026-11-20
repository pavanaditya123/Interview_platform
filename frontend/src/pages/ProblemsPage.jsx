import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2Icon, ChevronsRightIcon, Code2Icon, SearchIcon } from "lucide-react";
import Navbar from "../Components/Navbar";
import { PROBLEMS } from "../data/problems";
import { getDifficultyBadgeClass } from "../lib/utils";
import { useSolvedProblems } from "../hooks/useSolvedProblems";

const ALL = Object.values(PROBLEMS);
const FILTERS = ["All", "Easy", "Medium", "Hard"];

const ProblemsPage = () => {
    const [query, setQuery] = useState("");
    const [difficulty, setDifficulty] = useState("All");
    const deferredQuery = useDeferredValue(query);
    const solved = useSolvedProblems();

    const counts = useMemo(
        () => ({
            Easy: ALL.filter((p) => p.difficulty === "Easy").length,
            Medium: ALL.filter((p) => p.difficulty === "Medium").length,
            Hard: ALL.filter((p) => p.difficulty === "Hard").length,
        }),
        []
    );

    const problems = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        return ALL.filter(
            (p) =>
                (difficulty === "All" || p.difficulty === difficulty) &&
                (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        );
    }, [deferredQuery, difficulty]);

    return (
        <div className="min-h-screen bg-base-200">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
                        <span className="text-base-content">Practice</span> <span className="text-green-400">Problems</span>
                    </h1>
                    <p className="text-base-content/70">
                        Sharpen your coding skills with these curated problems. Solved {solved.size} of {ALL.length}.
                    </p>
                    <progress className="progress progress-success w-full max-w-md mt-3" value={solved.size} max={ALL.length} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <label className="input input-bordered flex items-center gap-2 flex-1">
                        <SearchIcon className="size-4 opacity-60" />
                        <input
                            type="search"
                            className="grow"
                            placeholder="Search by title or topic (e.g. array, string)"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </label>
                    <div className="join">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                className={`btn join-item ${difficulty === f ? "btn-primary" : "btn-ghost bg-base-100"}`}
                                onClick={() => setDifficulty(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {problems.length === 0 && <p className="text-center py-12 opacity-60">No problems match your search.</p>}
                    {problems.map((problem) => (
                        <Link
                            key={problem.id}
                            to={`/problem/${problem.id}`}
                            className="card bg-base-100 border border-transparent transition-[box-shadow,transform] duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)] hover:scale-[1.01] will-change-transform"
                        >
                            <div className="card-body">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="size-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                                {solved.has(problem.id) ? (
                                                    <CheckCircle2Icon className="size-6 text-success" />
                                                ) : (
                                                    <Code2Icon className="size-6 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h2 className="text-xl font-bold">{problem.title}</h2>
                                                    <span className={`badge ${getDifficultyBadgeClass(problem.difficulty)}`}>
                                                        {problem.difficulty}
                                                    </span>
                                                    {solved.has(problem.id) && <span className="badge badge-outline badge-success">Solved</span>}
                                                </div>
                                                <p className="text-sm text-base-content/60">{problem.category}</p>
                                            </div>
                                        </div>
                                        <p className="text-base-content/80 line-clamp-2">{problem.description.text}</p>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2 text-primary">
                                        <span className="font-medium">Solve</span>
                                        <ChevronsRightIcon className="size-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-12 card bg-base-100 shadow-lg">
                    <div className="card-body">
                        <div className="stats stats-vertical lg:stats-horizontal">
                            <div className="stat">
                                <div className="stat-title">Total Problems</div>
                                <div className="stat-value text-primary">{ALL.length}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">Easy</div>
                                <div className="stat-value text-success">{counts.Easy}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">Medium</div>
                                <div className="stat-value text-warning">{counts.Medium}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">Hard</div>
                                <div className="stat-value text-error">{counts.Hard}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemsPage;

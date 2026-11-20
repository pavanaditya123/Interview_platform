import { useEffect, useRef } from "react";
import { Code2Icon, LoaderIcon, PlusIcon, XIcon } from "lucide-react";
import { PROBLEMS } from "../data/problems";
import { getDifficultyBadgeClass } from "../lib/utils";

function CreateSessionModal({ isOpen, onClose, roomConfig, setRoomConfig, onCreateRoom, isCreating }) {
    const dialogRef = useRef(null);
    const problems = Object.values(PROBLEMS);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen && !dialog.open) dialog.showModal();
        if (!isOpen && dialog.open) dialog.close();
    }, [isOpen]);

    const selected = problems.find((p) => p.title === roomConfig.problem);

    return (
        <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
            <div className="modal-box max-w-2xl">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={onClose} aria-label="Close">
                    <XIcon className="size-4" />
                </button>
                <h3 className="font-bold text-2xl mb-6">Create New Session</h3>

                <div className="space-y-6">
                    <label className="form-control w-full flex flex-col gap-2">
                        <span className="label-text font-semibold">
                            Select Problem <span className="text-error">*</span>
                        </span>
                        <select
                            className="select select-bordered w-full"
                            value={roomConfig.problem}
                            onChange={(e) => {
                                const problem = problems.find((p) => p.title === e.target.value);
                                setRoomConfig((c) => ({ ...c, problem: e.target.value, difficulty: problem?.difficulty ?? "" }));
                            }}
                        >
                            <option value="" disabled>
                                Choose a coding problem...
                            </option>
                            {problems.map((p) => (
                                <option key={p.id} value={p.title}>
                                    {p.title} ({p.difficulty})
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="form-control w-full flex flex-col gap-2">
                        <span className="label-text font-semibold">Time limit</span>
                        <select
                            className="select select-bordered w-full"
                            value={roomConfig.durationMinutes}
                            onChange={(e) => setRoomConfig((c) => ({ ...c, durationMinutes: Number(e.target.value) }))}
                        >
                            <option value={0}>No time limit</option>
                            {[15, 30, 45, 60, 90].map((m) => (
                                <option key={m} value={m}>
                                    {m} minutes (timed mock interview)
                                </option>
                            ))}
                        </select>
                    </label>

                    <details className="collapse collapse-arrow bg-base-200 border border-base-300">
                        <summary className="collapse-title font-semibold">
                            Role requirements <span className="text-xs font-normal opacity-60">(optional · only you see this)</span>
                        </summary>
                        <div className="collapse-content space-y-3">
                            <p className="text-xs opacity-70">Used for your private notes and the AI interview report after the call.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    className="input input-bordered w-full"
                                    placeholder="Role, e.g. Backend Engineer"
                                    maxLength={120}
                                    value={roomConfig.role}
                                    onChange={(e) => setRoomConfig((c) => ({ ...c, role: e.target.value }))}
                                />
                                <input
                                    className="input input-bordered w-full"
                                    placeholder="Level, e.g. Mid / Senior"
                                    maxLength={60}
                                    value={roomConfig.level}
                                    onChange={(e) => setRoomConfig((c) => ({ ...c, level: e.target.value }))}
                                />
                            </div>
                            <textarea
                                className="textarea textarea-bordered w-full"
                                rows={3}
                                maxLength={2000}
                                placeholder="Required skills, e.g. Node.js, REST APIs, MongoDB, system design basics"
                                value={roomConfig.skills}
                                onChange={(e) => setRoomConfig((c) => ({ ...c, skills: e.target.value }))}
                            />
                        </div>
                    </details>

                    {selected && (
                        <div className="alert alert-success alert-soft">
                            <Code2Icon className="size-5" />
                            <div className="text-left">
                                <p className="font-semibold">Room summary</p>
                                <p className="text-sm">
                                    Problem: <span className="font-medium">{selected.title}</span>{" "}
                                    <span className={`badge badge-sm ${getDifficultyBadgeClass(selected.difficulty)}`}>
                                        {selected.difficulty}
                                    </span>
                                </p>
                                <p className="text-sm">
                                    Max participants: 2 (1-on-1) ·{" "}
                                    {roomConfig.durationMinutes ? `${roomConfig.durationMinutes} min limit` : "untimed"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary gap-2" onClick={onCreateRoom} disabled={isCreating || !roomConfig.problem}>
                        {isCreating ? <LoaderIcon className="size-5 animate-spin" /> : <PlusIcon className="size-5" />}
                        {isCreating ? "Creating..." : "Create Session"}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button aria-label="Close">close</button>
            </form>
        </dialog>
    );
}

export default CreateSessionModal;

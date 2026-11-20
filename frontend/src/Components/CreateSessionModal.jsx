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
                                setRoomConfig({ problem: e.target.value, difficulty: problem?.difficulty ?? "" });
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
                                <p className="text-sm">Max participants: 2 (1-on-1 session)</p>
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

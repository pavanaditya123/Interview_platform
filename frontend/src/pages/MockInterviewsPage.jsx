import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRightIcon, BotIcon, BrainIcon, CheckCircle2Icon, FileUpIcon, HandshakeIcon, LayersIcon, Loader2Icon, XIcon } from "lucide-react";
import Navbar from "../Components/Navbar";
import { mockApi } from "../api/sessions";
import { getErrorMessage } from "../lib/axios";
import { MAX_RESUME_CHARS, extractResumeText } from "../lib/resume";
import { timeAgo } from "../lib/utils";

const FOCUS = [
    { value: "technical", label: "Technical", desc: "Fundamentals, your stack, system design", icon: BrainIcon },
    { value: "behavioral", label: "Behavioral", desc: "Real situations, STAR answers", icon: HandshakeIcon },
    { value: "mixed", label: "Mixed", desc: "A realistic blend of both", icon: LayersIcon },
];

function ResumeDrop({ resume, setResume }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [showPaste, setShowPaste] = useState(false);

    const handleFile = async (file) => {
        if (!file) return;
        setBusy(true);
        try {
            const text = await extractResumeText(file);
            setResume({ name: file.name, text });
            toast.success("Resume read successfully");
        } catch (error) {
            toast.error(error.message || "Couldn't read that file");
        } finally {
            setBusy(false);
        }
    };

    if (resume.text && !showPaste) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/30">
                <CheckCircle2Icon className="size-6 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{resume.name || "Pasted resume"}</p>
                    <p className="text-xs opacity-70">{resume.text.length.toLocaleString()} characters · Ava will tailor questions to it</p>
                </div>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setResume({ name: "", text: "" })} aria-label="Remove resume">
                    <XIcon className="size-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {showPaste ? (
                <textarea
                    className="textarea textarea-bordered w-full min-h-40 text-sm"
                    placeholder="Paste your resume text here"
                    maxLength={MAX_RESUME_CHARS}
                    value={resume.text}
                    onChange={(e) => setResume({ name: "Pasted resume", text: e.target.value })}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`w-full rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                        dragging ? "border-primary bg-primary/10" : "border-base-content/20 hover:border-primary/60 hover:bg-base-200"
                    }`}
                >
                    {busy ? (
                        <Loader2Icon className="size-8 mx-auto animate-spin text-primary" />
                    ) : (
                        <FileUpIcon className="size-8 mx-auto text-primary" />
                    )}
                    <p className="font-semibold mt-2">{busy ? "Reading your resume…" : "Drop your resume here or click to upload"}</p>
                    <p className="text-xs opacity-60 mt-1">PDF or TXT, up to 5 MB. Parsed in your browser.</p>
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
            <button type="button" className="link link-hover text-xs opacity-70" onClick={() => setShowPaste((v) => !v)}>
                {showPaste ? "Upload a file instead" : "Or paste resume text"}
            </button>
        </div>
    );
}

export default function MockInterviewsPage() {
    const navigate = useNavigate();
    const [resume, setResume] = useState({ name: "", text: "" });
    const [form, setForm] = useState({ role: "", level: "", focus: "mixed", totalQuestions: 5, jobDescription: "" });
    const history = useQuery({ queryKey: ["mock-interviews"], queryFn: mockApi.list });

    const create = useMutation({
        mutationFn: mockApi.create,
        onSuccess: (data) => navigate(`/mock/${data.interview._id}`),
        onError: (error) => toast.error(getErrorMessage(error, "Couldn't start the interview")),
    });

    const start = (e) => {
        e.preventDefault();
        if (!form.role.trim()) return toast.error("Tell Ava which role you're preparing for");
        create.mutate({ ...form, resumeText: resume.text });
    };

    return (
        <div className="min-h-dvh bg-base-300">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-10">
                <div className="text-center mb-10 space-y-3">
                    <div className="size-20 mx-auto rounded-full orb orb-speaking flex items-center justify-center">
                        <BotIcon className="size-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black">
                        Interview with <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Ava</span>
                    </h1>
                    <p className="text-lg opacity-70 max-w-2xl mx-auto">
                        A realistic AI mock interview tailored to your resume and target role. Speak or type your answers, then get a personal report on
                        what went well and where you lacked.
                    </p>
                </div>

                <div className="grid lg:grid-cols-5 gap-6">
                    <form onSubmit={start} className="lg:col-span-3 card bg-base-100 shadow-xl">
                        <div className="card-body gap-6">
                            <div>
                                <p className="font-bold mb-2">1. Your resume <span className="text-xs font-normal opacity-60">(recommended)</span></p>
                                <ResumeDrop resume={resume} setResume={setResume} />
                            </div>

                            <div>
                                <p className="font-bold mb-2">2. Target role</p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <input
                                        className="input input-bordered w-full"
                                        placeholder="e.g. Frontend Engineer"
                                        maxLength={120}
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        required
                                    />
                                    <select className="select select-bordered w-full" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                                        <option value="">Any level</option>
                                        {["Intern", "Junior", "Mid-level", "Senior", "Staff"].map((l) => (
                                            <option key={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <details className="mt-3">
                                    <summary className="text-sm cursor-pointer opacity-70">Add a job description (optional)</summary>
                                    <textarea
                                        className="textarea textarea-bordered w-full mt-2 text-sm"
                                        rows={4}
                                        maxLength={6000}
                                        placeholder="Paste the job description so questions match it"
                                        value={form.jobDescription}
                                        onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                                    />
                                </details>
                            </div>

                            <div>
                                <p className="font-bold mb-2">3. Interview type</p>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    {FOCUS.map((f) => (
                                        <button
                                            type="button"
                                            key={f.value}
                                            onClick={() => setForm({ ...form, focus: f.value })}
                                            className={`text-left p-4 rounded-2xl border-2 transition-all ${
                                                form.focus === f.value ? "border-primary bg-primary/10 scale-[1.02]" : "border-base-300 hover:border-primary/40"
                                            }`}
                                            aria-pressed={form.focus === f.value}
                                        >
                                            <f.icon className={`size-6 mb-2 ${form.focus === f.value ? "text-primary" : "opacity-60"}`} />
                                            <p className="font-semibold">{f.label}</p>
                                            <p className="text-xs opacity-60">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <p className="font-bold">4. Number of questions</p>
                                    <span className="badge badge-primary">{form.totalQuestions}</span>
                                </div>
                                <input
                                    type="range"
                                    min={3}
                                    max={10}
                                    value={form.totalQuestions}
                                    onChange={(e) => setForm({ ...form, totalQuestions: Number(e.target.value) })}
                                    className="range range-primary range-sm"
                                    aria-label="Number of questions"
                                />
                                <p className="text-xs opacity-60 mt-1">About {form.totalQuestions * 3} minutes</p>
                            </div>

                            <button className="btn btn-primary btn-lg gap-2" disabled={create.isPending}>
                                {create.isPending ? <Loader2Icon className="size-5 animate-spin" /> : <BotIcon className="size-5" />}
                                Start interview
                            </button>
                        </div>
                    </form>

                    <aside className="lg:col-span-2 card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Your AI interviews</h2>
                            {history.isLoading ? (
                                <span className="loading loading-dots text-primary" />
                            ) : history.data?.interviews?.length ? (
                                <ul className="space-y-2 max-h-[34rem] overflow-y-auto scroll-area pr-1">
                                    {history.data.interviews.map((iv) => {
                                        const done = iv.status === "completed";
                                        return (
                                            <li key={iv._id}>
                                                <Link
                                                    to={done ? `/mock/${iv._id}/report` : `/mock/${iv._id}`}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors"
                                                >
                                                    <div
                                                        className={`size-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                                            iv.scores?.overall ? "bg-primary text-primary-content" : "bg-base-300"
                                                        }`}
                                                    >
                                                        {iv.scores?.overall || "–"}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold truncate">{iv.role}</p>
                                                        <p className="text-xs opacity-60">
                                                            {iv.focus} · {iv.totalQuestions} questions · {timeAgo(iv.createdAt)}
                                                        </p>
                                                    </div>
                                                    <span className={`badge badge-sm ${done ? "badge-success" : "badge-warning"}`}>{done ? "Report" : "Resume"}</span>
                                                    <ArrowRightIcon className="size-4 opacity-50" />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm opacity-60">No interviews yet. Your reports will show up here.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

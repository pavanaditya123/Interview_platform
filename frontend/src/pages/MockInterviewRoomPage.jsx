import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    BotIcon,
    FileTextIcon,
    FlagIcon,
    MicIcon,
    MicOffIcon,
    RotateCwIcon,
    SendIcon,
    UserIcon,
    Volume2Icon,
    VolumeXIcon,
} from "lucide-react";
import { mockApi } from "../api/sessions";
import { streamPost } from "../lib/sse";
import { useDictation, useSpeaker } from "../hooks/useSpeech";
import SessionTimer from "../Components/SessionTimer";

const VOICE_KEY = "interviewhub:ava-voice";

function Orb({ active, speaking }) {
    return (
        <div className="relative size-28 sm:size-40 lg:size-52 mx-auto shrink-0 aspect-square">
            {(active || speaking) && (
                <>
                    <span className="absolute inset-0 rounded-full orb orb-ring" />
                    <span className="absolute inset-0 rounded-full orb orb-ring [animation-delay:0.6s]" />
                </>
            )}
            <div className={`relative size-full rounded-full orb flex items-center justify-center ${active || speaking ? "orb-speaking" : ""}`}>
                <BotIcon className="size-16 sm:size-20 text-white/90" />
            </div>
        </div>
    );
}

export default function MockInterviewRoomPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data, isLoading, error } = useQuery({ queryKey: ["mock-interview", id], queryFn: () => mockApi.get(id), staleTime: Infinity });

    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState("in_progress");
    const [pending, setPending] = useState(null); // streaming interviewer text
    const [thinking, setThinking] = useState(false);
    const [turnError, setTurnError] = useState(null);
    const [answer, setAnswer] = useState("");
    const [voiceOn, setVoiceOn] = useState(() => {
        try {
            return localStorage.getItem(VOICE_KEY) !== "off";
        } catch {
            return true;
        }
    });

    const speaker = useSpeaker();
    const onFinal = useCallback((phrase) => setAnswer((a) => (a ? `${a} ${phrase}` : phrase)), []);
    const dictation = useDictation(onFinal);
    const transcriptRef = useRef(null);
    const controllerRef = useRef(null);
    const started = useRef(false);

    const iv = data?.interview;
    useEffect(() => {
        if (iv) {
            setMessages(iv.messages);
            setStatus(iv.status);
        }
    }, [iv]);

    const asked = messages.filter((m) => m.role === "interviewer").length + (pending != null ? 1 : 0);
    const total = iv?.totalQuestions ?? 5;
    const currentQ = Math.min(asked, total);

    // Keep the transcript scrolled to the newest message.
    useEffect(() => {
        const el = transcriptRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [messages, pending]);

    const takeTurn = useCallback(
        async (text) => {
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            setTurnError(null);
            setThinking(true);
            setPending("");
            speaker.stop();

            const result = await streamPost(`/mock-interviews/${id}/turn`, text ? { answer: text } : {}, {
                signal: controller.signal,
                onText: (_, full) => {
                    setThinking(false);
                    setPending(full);
                },
            });
            if (result.aborted) return;
            setThinking(false);
            setPending(null);

            if (result.error) {
                setTurnError(result.error);
                return;
            }
            const reply = result.text.trim();
            setMessages((m) => [...m, { role: "interviewer", content: reply }]);
            if (voiceOn) speaker.speak(reply);
            // Refresh from the server to pick up completion status.
            const fresh = await mockApi.get(id).catch(() => null);
            if (fresh) {
                setStatus(fresh.interview.status);
                qc.setQueryData(["mock-interview", id], fresh);
            }
        },
        [id, voiceOn, speaker, qc]
    );

    // Start (or resume after a failed turn) once loaded.
    useEffect(() => {
        if (!iv || started.current || iv.status !== "in_progress") return;
        const last = iv.messages.at(-1);
        if (!last || last.role === "candidate") {
            started.current = true;
            takeTurn();
        }
    }, [iv, takeTurn]);

    useEffect(() => () => controllerRef.current?.abort(), []);

    const send = () => {
        const text = answer.trim();
        if (!text || pending != null || status !== "in_progress") return;
        dictation.stop();
        setMessages((m) => [...m, { role: "candidate", content: text }]);
        setAnswer("");
        takeTurn(text);
    };

    const finishEarly = async () => {
        if (!confirm("End the interview now? Your report will cover the questions answered so far.")) return;
        controllerRef.current?.abort();
        speaker.stop();
        await mockApi.finish(id);
        navigate(`/mock/${id}/report`);
    };

    const toggleVoice = () => {
        const next = !voiceOn;
        setVoiceOn(next);
        if (!next) speaker.stop();
        try {
            localStorage.setItem(VOICE_KEY, next ? "on" : "off");
        } catch {
            // ignore
        }
    };

    if (isLoading) {
        return (
            <div className="h-dvh flex items-center justify-center bg-neutral">
                <span className="loading loading-ring loading-lg text-primary" />
            </div>
        );
    }
    if (error || !iv) {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-base-200">
                <p className="text-xl font-bold">Interview not found</p>
                <Link to="/mock" className="btn btn-primary">
                    Back
                </Link>
            </div>
        );
    }

    const lastInterviewer = pending ?? [...messages].reverse().find((m) => m.role === "interviewer")?.content ?? "";
    const busy = pending != null;
    const completed = status === "completed";
    const canAnswer = !busy && !completed && messages.at(-1)?.role === "interviewer";

    return (
        <div className="h-dvh flex flex-col bg-gradient-to-br from-neutral via-base-300 to-neutral text-base-content overflow-hidden">
            {/* top bar */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-base-100/40 backdrop-blur-md">
                <Link to="/mock" className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
                    <ArrowLeftIcon className="size-5" />
                </Link>
                <div className="min-w-0">
                    <p className="font-bold truncate">{iv.role}</p>
                    <p className="text-xs opacity-60 capitalize">
                        {iv.focus} interview{iv.level ? ` · ${iv.level}` : ""}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mx-auto" aria-label={`Question ${currentQ} of ${total}`}>
                    {Array.from({ length: total }, (_, i) => (
                        <span
                            key={i}
                            className={`h-2 rounded-full transition-all duration-500 ${
                                i < currentQ - (completed ? 0 : 1) ? "w-6 bg-success" : i === currentQ - 1 && !completed ? "w-10 bg-primary" : "w-6 bg-base-content/20"
                            }`}
                        />
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <SessionTimer startedAt={iv.createdAt} durationMinutes={0} />
                    {speaker.supported && (
                        <button className="btn btn-ghost btn-sm btn-circle" onClick={toggleVoice} title={voiceOn ? "Mute Ava" : "Let Ava speak"}>
                            {voiceOn ? <Volume2Icon className="size-5" /> : <VolumeXIcon className="size-5" />}
                        </button>
                    )}
                    {!completed && (
                        <button className="btn btn-sm btn-ghost text-error gap-1" onClick={finishEarly}>
                            <FlagIcon className="size-4" /> <span className="hidden sm:inline">End</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 min-h-0 grid lg:grid-cols-5">
                {/* stage */}
                <section className="lg:col-span-3 flex flex-col items-center justify-center gap-8 p-6 overflow-y-auto scroll-area">
                    <Orb active={busy} speaking={speaker.speaking} />
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
                            {completed ? "Interview complete" : thinking ? "Ava is thinking" : busy ? "Ava is asking" : `Question ${currentQ} of ${total}`}
                        </p>
                    </div>
                    <div className="max-w-2xl w-full text-center min-h-24" aria-live="polite">
                        {thinking ? (
                            <span className="loading loading-dots loading-lg text-primary" />
                        ) : (
                            <p className={`text-xl sm:text-2xl leading-relaxed font-medium ${busy ? "typing-caret" : ""}`}>{lastInterviewer}</p>
                        )}
                    </div>

                    {turnError && (
                        <div className="alert alert-warning max-w-xl">
                            <span>{turnError}</span>
                            <button className="btn btn-sm gap-1" onClick={() => takeTurn()}>
                                <RotateCwIcon className="size-4" /> Retry
                            </button>
                        </div>
                    )}

                    {!busy && !completed && !turnError && messages.at(-1)?.role === "candidate" && (
                        <button className="btn btn-primary gap-1" onClick={() => takeTurn()}>
                            <RotateCwIcon className="size-4" /> Continue
                        </button>
                    )}

                    {completed && (
                        <div className="flex flex-col items-center gap-3 ">
                            <p className="opacity-70">Great job finishing the interview! Your personal report is ready.</p>
                            <Link to={`/mock/${id}/report`} className="btn btn-primary btn-lg gap-2">
                                <FileTextIcon className="size-5" /> See my report
                            </Link>
                        </div>
                    )}
                </section>

                {/* transcript */}
                <aside className="lg:col-span-2 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-base-100/30 backdrop-blur">
                    <p className="px-4 pt-3 pb-2 text-xs uppercase tracking-widest opacity-60 font-bold">Transcript</p>
                    <div ref={transcriptRef} className="flex-1 overflow-y-auto scroll-area px-4 pb-4 space-y-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`chat ${m.role === "candidate" ? "chat-end" : "chat-start"}`}>
                                <div className="chat-image avatar avatar-placeholder">
                                    <div className={`w-8 rounded-full ${m.role === "candidate" ? "bg-secondary text-secondary-content" : "orb text-white"}`}>
                                        {m.role === "candidate" ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
                                    </div>
                                </div>
                                <div className={`chat-bubble text-sm ${m.role === "candidate" ? "chat-bubble-secondary" : ""}`}>{m.content}</div>
                            </div>
                        ))}
                        {busy && pending && (
                            <div className="chat chat-start">
                                <div className="chat-image avatar avatar-placeholder">
                                    <div className="w-8 rounded-full orb text-white">
                                        <BotIcon className="size-4" />
                                    </div>
                                </div>
                                <div className="chat-bubble text-sm typing-caret">{pending}</div>
                            </div>
                        )}
                    </div>

                    {/* composer */}
                    {!completed && (
                        <div className="p-3 border-t border-white/10 space-y-2">
                            {dictation.listening && (
                                <p className="text-xs text-primary flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-error animate-pulse" /> Listening… {dictation.interim && <em className="opacity-70">{dictation.interim}</em>}
                                </p>
                            )}
                            <div className="flex items-end gap-2">
                                {dictation.supported && (
                                    <button
                                        type="button"
                                        className={`btn btn-circle ${dictation.listening ? "btn-error" : "btn-ghost bg-base-100/50"}`}
                                        onClick={() => {
                                            if (dictation.listening) dictation.stop();
                                            else {
                                                speaker.stop();
                                                dictation.start();
                                            }
                                        }}
                                        disabled={!canAnswer}
                                        title={dictation.listening ? "Stop dictation" : "Answer by voice"}
                                        aria-pressed={dictation.listening}
                                    >
                                        {dictation.listening ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
                                    </button>
                                )}
                                <textarea
                                    className="textarea textarea-bordered flex-1 min-h-12 max-h-40 resize-none bg-base-100/70"
                                    rows={2}
                                    placeholder={canAnswer ? "Type your answer… (Ctrl+Enter to send)" : "Wait for Ava's question…"}
                                    value={answer}
                                    maxLength={8000}
                                    disabled={!canAnswer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            send();
                                        }
                                    }}
                                />
                                <button className="btn btn-primary btn-circle" onClick={send} disabled={!canAnswer || !answer.trim()} aria-label="Send answer">
                                    <SendIcon className="size-5" />
                                </button>
                            </div>
                            {!dictation.supported && <p className="text-[11px] opacity-50">Voice answers need Chrome or Edge.</p>}
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}


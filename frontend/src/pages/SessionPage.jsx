import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import { ClipboardListIcon, CopyIcon, Loader2Icon, LogOutIcon, PhoneOffIcon, UsersIcon, VideoIcon } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../Components/Navbar";
import ProblemDescription from "../Components/ProblemDescription";
import CodeEditorPanel from "../Components/CodeEditorPanel";
import OutputPanel from "../Components/OutputPanel";
import VideoCallUI from "../Components/VideoCallUI";
import InterviewerPanel from "../Components/InterviewerPanel";
import SessionTimer from "../Components/SessionTimer";
import { PROBLEMS } from "../data/problems";
import { useEndSession, useJoinSession, useSessionById } from "../hooks/useSessions";
import useStreamClient from "../hooks/useStreamClient";
import { useCodeSync } from "../hooks/useCodeSync";
import { useCodeRunner } from "../hooks/useCodeRunner";
import { capitalize, getDifficultyBadgeClass } from "../lib/utils";
import { preloadPython } from "../lib/piston";

const findProblem = (title) => Object.values(PROBLEMS).find((p) => p.title === title);

function CenteredMessage({ title, children }) {
    return (
        <div className="h-dvh bg-base-100 flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="card bg-base-200 shadow-xl max-w-md w-full">
                    <div className="card-body items-center text-center">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SessionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const { data, isLoading, error } = useSessionById(id);
    const joinSession = useJoinSession();
    const endSession = useEndSession();

    const session = data?.session;
    const isHost = session?.host?.clerkId === user?.id;
    const isParticipant = session?.participant?.clerkId === user?.id;

    const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
        session,
        isLoading,
        isHost,
        isParticipant
    );

    const problem = useMemo(() => findProblem(session?.problem), [session?.problem]);
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [rightTab, setRightTab] = useState("call");
    const { output, isRunning, run } = useCodeRunner();

    // Starter code once the problem is known.
    const initialised = useRef(false);
    useEffect(() => {
        if (problem && !initialised.current) {
            initialised.current = true;
            setCode(problem.starterCode.javascript);
        }
    }, [problem]);

    // Auto-join as the participant when opening an open session link.
    const joinAttempted = useRef(false);
    useEffect(() => {
        if (!session || !user || isHost || isParticipant || joinAttempted.current) return;
        if (session.status !== "active" || session.participant) return;
        joinAttempted.current = true;
        joinSession.mutate(id);
    }, [session, user, isHost, isParticipant, id, joinSession]);

    // When the host ends the session, send the participant back to the dashboard.
    const wasActive = useRef(false);
    useEffect(() => {
        if (session?.status === "active") wasActive.current = true;
        if (session?.status === "completed" && wasActive.current && !isHost) {
            toast("The host ended this session", { icon: "👋" });
            navigate("/dashboard");
        }
    }, [session?.status, isHost, navigate]);

    // ---- live code sync ----
    const latest = useRef({ code, language });
    useEffect(() => {
        latest.current = { code, language };
    }, [code, language]);

    const onRemoteUpdate = useCallback(({ code: remoteCode, language: remoteLang }) => {
        if (remoteLang && remoteLang !== latest.current.language) setLanguage(remoteLang);
        if (typeof remoteCode === "string") setCode(remoteCode);
    }, []);
    const getCurrent = useCallback(() => latest.current, []);
    const broadcast = useCodeSync(call, { onRemoteUpdate, getCurrent });

    const handleCodeChange = useCallback(
        (value) => {
            setCode(value);
            broadcast(value, latest.current.language);
        },
        [broadcast]
    );

    const handleLanguageChange = useCallback(
        (e) => {
            const next = e.target.value;
            if (next === "python") preloadPython();
            const starter = problem?.starterCode[next] ?? "";
            setLanguage(next);
            setCode(starter);
            broadcast(starter, next);
        },
        [problem, broadcast]
    );

    const handleReset = useCallback(() => {
        const starter = problem?.starterCode[language] ?? "";
        setCode(starter);
        broadcast(starter, language);
    }, [problem, language, broadcast]);

    const handleRunCode = useCallback(() => {
        if (problem) run(language, code, problem.expectedOutput[language]);
    }, [run, language, code, problem]);

    const handleEndSession = () => {
        if (!confirm("End this session for everyone? This cannot be undone.")) return;
        endSession.mutate(
            { id, finalCode: latest.current.code, finalLanguage: latest.current.language },
            { onSuccess: () => navigate(`/session/${id}/report`) }
        );
    };

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Invite link copied");
        } catch {
            toast.error("Could not copy link");
        }
    };

    // ---- states ----
    if (isLoading) {
        return (
            <CenteredMessage title="Loading session...">
                <Loader2Icon className="size-10 animate-spin text-primary" />
            </CenteredMessage>
        );
    }
    if (error || !session) {
        return (
            <CenteredMessage title="Session not found">
                <p className="opacity-70">This session doesn't exist or the link is wrong.</p>
                <Link to="/dashboard" className="btn btn-primary mt-4">
                    Back to dashboard
                </Link>
            </CenteredMessage>
        );
    }
    if (session.status === "completed") {
        return (
            <CenteredMessage title="Session ended">
                <p className="opacity-70">This session is over. Check your past sessions on the dashboard.</p>
                <div className="flex gap-2 mt-4">
                    {isHost && (
                        <Link to={`/session/${id}/report`} className="btn btn-primary">
                            View interview report
                        </Link>
                    )}
                    <Link to="/dashboard" className={`btn ${isHost ? "btn-ghost" : "btn-primary"}`}>
                        Back to dashboard
                    </Link>
                </div>
            </CenteredMessage>
        );
    }
    if (!isHost && !isParticipant && session.participant) {
        return (
            <CenteredMessage title="Session is full">
                <p className="opacity-70">Sessions are 1-on-1 and this one already has two people.</p>
                <Link to="/dashboard" className="btn btn-primary mt-4">
                    Find another session
                </Link>
            </CenteredMessage>
        );
    }

    return (
        <div className="h-dvh bg-base-100 flex flex-col overflow-hidden">
            <Navbar />

            <div className="flex-1 min-h-0">
                <PanelGroup direction="horizontal" autoSaveId="session-layout-h">
                    {/* LEFT: problem + editor */}
                    <Panel defaultSize={55} minSize={30}>
                        <PanelGroup direction="vertical" autoSaveId="session-layout-v">
                            <Panel defaultSize={45} minSize={15}>
                                <div className="h-full flex flex-col bg-base-200">
                                    <div className="px-6 py-3 bg-base-100 border-b border-base-300 flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h1 className="text-xl font-bold truncate">{session.problem}</h1>
                                                <span className={`badge ${getDifficultyBadgeClass(session.difficulty)}`}>
                                                    {capitalize(session.difficulty)}
                                                </span>
                                            </div>
                                            <div className="text-sm opacity-80 flex items-center gap-2 flex-wrap">
                                                <span className="flex items-center gap-1 opacity-75">
                                                    <UsersIcon className="size-3" />
                                                    Host: {session.host?.name} · {session.participant ? "2/2" : "1/2"} participants
                                                </span>
                                                <SessionTimer startedAt={session.createdAt} durationMinutes={session.durationMinutes ?? 0} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="btn btn-sm btn-ghost gap-1" onClick={copyInvite} title="Copy invite link">
                                                <CopyIcon className="size-4" />
                                                Invite
                                            </button>
                                            {isHost ? (
                                                <button
                                                    className="btn btn-error btn-sm gap-1"
                                                    onClick={handleEndSession}
                                                    disabled={endSession.isPending}
                                                >
                                                    {endSession.isPending ? (
                                                        <Loader2Icon className="size-4 animate-spin" />
                                                    ) : (
                                                        <LogOutIcon className="size-4" />
                                                    )}
                                                    End Session
                                                </button>
                                            ) : (
                                                <Link to="/dashboard" className="btn btn-sm btn-ghost gap-1">
                                                    <LogOutIcon className="size-4" />
                                                    Leave
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        {problem ? (
                                            <ProblemDescription problem={problem} />
                                        ) : (
                                            <p className="p-6 opacity-70">Problem details are unavailable.</p>
                                        )}
                                    </div>
                                </div>
                            </Panel>
                            <PanelResizeHandle className="h-2 bg-base-200 hover:bg-primary transition-colors cursor-row-resize" />
                            <Panel defaultSize={35} minSize={20}>
                                {problem && (
                                    <CodeEditorPanel
                                        selectedLanguage={language}
                                        code={code}
                                        isRunning={isRunning}
                                        onLanguageChange={handleLanguageChange}
                                        onCodeChange={handleCodeChange}
                                        onRunCode={handleRunCode}
                                        onResetCode={handleReset}
                                        isLiveSynced={Boolean(call && session.participant)}
                                    />
                                )}
                            </Panel>
                            <PanelResizeHandle className="h-2 bg-base-200 hover:bg-primary transition-colors cursor-row-resize" />
                            <Panel defaultSize={20} minSize={10}>
                                <OutputPanel output={output} isRunning={isRunning} />
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="w-2 bg-base-200 hover:bg-primary transition-colors cursor-col-resize" />

                    {/* RIGHT: video + chat */}
                    <Panel defaultSize={45} minSize={25}>
                        <div className="h-full bg-base-200 flex flex-col overflow-hidden">
                            {isHost && (
                                <div role="tablist" className="tabs tabs-box bg-base-100 m-3 mb-0 shrink-0">
                                    <button
                                        role="tab"
                                        className={`tab gap-2 ${rightTab === "call" ? "tab-active" : ""}`}
                                        onClick={() => setRightTab("call")}
                                    >
                                        <VideoIcon className="size-4" /> Call
                                    </button>
                                    <button
                                        role="tab"
                                        className={`tab gap-2 ${rightTab === "notes" ? "tab-active" : ""}`}
                                        onClick={() => setRightTab("notes")}
                                    >
                                        <ClipboardListIcon className="size-4" /> Notes &amp; scorecard
                                    </button>
                                </div>
                            )}
                            {isHost && rightTab === "notes" && problem && (
                                <div className="flex-1 min-h-0">
                                    <InterviewerPanel sessionId={id} problem={problem} language={language} code={code} />
                                </div>
                            )}
                            {/* the call stays mounted while the notes tab is open so it never drops */}
                            <div className={`flex-1 min-h-0 p-3 ${isHost && rightTab === "notes" ? "hidden" : ""}`}>
                            {isInitializingCall || joinSession.isPending ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <Loader2Icon className="size-12 mx-auto animate-spin text-primary mb-4" />
                                        <p className="text-lg">Connecting to video call...</p>
                                    </div>
                                </div>
                            ) : !streamClient || !call ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="card bg-base-100 shadow-xl max-w-md">
                                        <div className="card-body items-center text-center">
                                            <div className="size-20 bg-error/10 rounded-full flex items-center justify-center mb-2">
                                                <PhoneOffIcon className="size-10 text-error" />
                                            </div>
                                            <h2 className="card-title text-2xl">Connection failed</h2>
                                            <p className="text-base-content/70">Unable to connect to the video call.</p>
                                            <button className="btn btn-primary mt-2" onClick={() => window.location.reload()}>
                                                Retry
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <StreamVideo client={streamClient}>
                                    <StreamCall call={call}>
                                        <VideoCallUI chatClient={chatClient} channel={channel} isHost={isHost} />
                                    </StreamCall>
                                </StreamVideo>
                            )}
                            </div>
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

export default SessionPage;

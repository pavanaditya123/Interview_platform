import { useState } from "react";
import { useNavigate } from "react-router";
import { CallControls, CallingState, SpeakerLayout, useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import toast from "react-hot-toast";
import { Channel, ChannelHeader, Chat, MessageComposer, MessageList, Thread } from "stream-chat-react";
import { CircleIcon, Loader2Icon, MessageSquareIcon, SquareIcon, UsersIcon, XIcon } from "lucide-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/index.css";

function RecordButton() {
    const call = useCall();
    const { useIsCallRecordingInProgress } = useCallStateHooks();
    const recording = useIsCallRecordingInProgress();
    const [busy, setBusy] = useState(false);

    const toggle = async () => {
        setBusy(true);
        try {
            if (recording) {
                await call.stopRecording();
                toast.success("Recording saved. Find it in the interview report.");
            } else {
                await call.startRecording();
                toast.success("Recording started");
            }
        } catch (error) {
            console.error("Recording error:", error);
            toast.error("Recording is not available. Enable it for the default call type in your Stream dashboard.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={busy}
            className={`btn btn-sm gap-2 ${recording ? "btn-error" : "btn-ghost"}`}
            title={recording ? "Stop recording" : "Record this interview"}
        >
            {recording ? <SquareIcon className="size-4 fill-current" /> : <CircleIcon className="size-4 text-error fill-error" />}
            {recording ? "Stop" : "Record"}
        </button>
    );
}

function VideoCallUI({ chatClient, channel, isHost = false }) {
    const navigate = useNavigate();
    const { useCallCallingState, useParticipantCount, useIsCallRecordingInProgress } = useCallStateHooks();
    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();
    const recording = useIsCallRecordingInProgress();
    const [isChatOpen, setIsChatOpen] = useState(false);

    if (callingState === CallingState.JOINING) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Loader2Icon className="size-12 mx-auto animate-spin text-primary mb-4" />
                    <p className="text-lg">Joining call...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex gap-3 relative str-video">
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex items-center justify-between gap-2 bg-base-100 p-3 rounded-lg shadow">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="size-5 text-primary" />
                        <span className="font-semibold">
                            {participantCount} {participantCount === 1 ? "participant" : "participants"}
                        </span>
                        {recording && (
                            <span className="badge badge-error badge-sm gap-1 animate-pulse">
                                <CircleIcon className="size-2 fill-current" /> REC
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                    {isHost && <RecordButton />}
                    {chatClient && channel && (
                        <button
                            onClick={() => setIsChatOpen((v) => !v)}
                            className={`btn btn-sm gap-2 ${isChatOpen ? "btn-primary" : "btn-ghost"}`}
                            title={isChatOpen ? "Hide chat" : "Show chat"}
                        >
                            <MessageSquareIcon className="size-4" />
                            Chat
                        </button>
                    )}
                    </div>
                </div>

                <div className="flex-1 bg-base-300 rounded-lg overflow-hidden relative min-h-0">
                    <SpeakerLayout participantsBarPosition="bottom" />
                </div>

                <div className="bg-base-100 p-3 rounded-lg shadow flex justify-center">
                    <CallControls onLeave={() => navigate("/dashboard")} />
                </div>
            </div>

            {chatClient && channel && (
                <div
                    className={`flex flex-col rounded-lg shadow overflow-hidden bg-[#272a30] transition-all duration-300 ${
                        isChatOpen ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"
                    }`}
                >
                    {isChatOpen && (
                        <>
                            <div className="bg-[#1c1e22] p-3 border-b border-[#3a3d44] flex items-center justify-between">
                                <h3 className="font-semibold text-white">Session Chat</h3>
                                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close chat">
                                    <XIcon className="size-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden stream-chat-dark">
                                <Chat client={chatClient} theme="str-chat__theme-dark">
                                    <Channel channel={channel}>
                                        <div className="flex flex-col h-full">
                                            <ChannelHeader />
                                            <div className="flex-1 min-h-0">
                                                <MessageList />
                                            </div>
                                            <MessageComposer />
                                        </div>
                                        <Thread />
                                    </Channel>
                                </Chat>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default VideoCallUI;

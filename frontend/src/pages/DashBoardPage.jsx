import { useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import Navbar from "../Components/Navbar";
import WelcomeSection from "../Components/dashboard/WelcomeSection";
import StatsCards from "../Components/dashboard/StatsCards";
import ActiveSessions from "../Components/dashboard/ActiveSessions";
import RecentSessions from "../Components/dashboard/RecentSessions";
import InterviewerDashboard from "../Components/dashboard/InterviewerDashboard";
import MockInterviewCta from "../Components/dashboard/MockInterviewCta";
import CreateSessionModal from "../Components/CreateSessionModal";
import { useActiveSessions, useCreateSession, useMyRecentSessions } from "../hooks/useSessions";
import { useSolvedProblems } from "../hooks/useSolvedProblems";
import { PROBLEMS } from "../data/problems";

const EMPTY_ROOM = { problem: "", difficulty: "", durationMinutes: 0, role: "", level: "", skills: "" };

const DashBoardPage = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [roomConfig, setRoomConfig] = useState(EMPTY_ROOM);

    const createSession = useCreateSession();
    const { data: activeData, isLoading: loadingActive } = useActiveSessions();
    const { data: recentData, isLoading: loadingRecent } = useMyRecentSessions();
    const solved = useSolvedProblems();

    const activeSessions = activeData?.sessions ?? [];
    const recentSessions = recentData?.sessions ?? [];

    const handleCreateRoom = () => {
        if (!roomConfig.problem || !roomConfig.difficulty) return;
        createSession.mutate(
            {
                problem: roomConfig.problem,
                difficulty: roomConfig.difficulty.toLowerCase(),
                durationMinutes: roomConfig.durationMinutes,
                requirements: { role: roomConfig.role, level: roomConfig.level, skills: roomConfig.skills },
            },
            {
                onSuccess: (data) => {
                    setShowCreateModal(false);
                    setRoomConfig(EMPTY_ROOM);
                    navigate(`/session/${data.session._id}`);
                },
                onError: (error) => {
                    // Already hosting: take the user back to their session.
                    const existing = error?.response?.data?.session;
                    if (error?.response?.status === 409 && existing?._id) {
                        setShowCreateModal(false);
                        navigate(`/session/${existing._id}`);
                    }
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-base-300">
            <Navbar />
            <WelcomeSection onCreateSession={() => setShowCreateModal(true)} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatsCards
                        activeSessionsCount={activeSessions.length}
                        recentSessionsCount={recentSessions.length}
                        solvedCount={solved.size}
                        totalProblems={Object.keys(PROBLEMS).length}
                        isLoading={loadingActive || loadingRecent}
                    />
                    <ActiveSessions sessions={activeSessions} isLoading={loadingActive} userId={user?.id} />
                </div>

                <MockInterviewCta />
                <InterviewerDashboard />
                <RecentSessions sessions={recentSessions} isLoading={loadingRecent} />
            </div>

            <CreateSessionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                roomConfig={roomConfig}
                setRoomConfig={setRoomConfig}
                onCreateRoom={handleCreateRoom}
                isCreating={createSession.isPending}
            />
        </div>
    );
};

export default DashBoardPage;

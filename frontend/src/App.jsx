import { lazy, Suspense, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import { Toaster } from "react-hot-toast";

// Route-level code splitting: each page (and heavy deps like Monaco / Stream) loads only when visited.
const HomePage = lazy(() => import("./pages/HomePage"));
const DashBoardPage = lazy(() => import("./pages/DashBoardPage"));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage"));
const ProblemPage = lazy(() => import("./pages/ProblemPage"));
const SessionPage = lazy(() => import("./pages/SessionPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const InterviewReportPage = lazy(() => import("./pages/InterviewReportPage"));
const MockInterviewsPage = lazy(() => import("./pages/MockInterviewsPage"));
const MockInterviewRoomPage = lazy(() => import("./pages/MockInterviewRoomPage"));
const MockReportPage = lazy(() => import("./pages/MockReportPage"));

function PageLoader() {
    return (
        <div className="h-dvh flex items-center justify-center bg-base-100">
            <span className="loading loading-spinner loading-lg text-primary" />
        </div>
    );
}

// Reset scroll on navigation (but keep it for back/forward via the browser's own restoration).
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);
    return null;
}

function App() {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) return <PageLoader />;

    const protect = (el) => (isSignedIn ? el : <Navigate to="/" replace />);

    return (
        <>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={!isSignedIn ? <HomePage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={protect(<DashBoardPage />)} />
                    <Route path="/problems" element={protect(<ProblemsPage />)} />
                    <Route path="/problem/:id" element={protect(<ProblemPage />)} />
                    <Route path="/session/:id" element={protect(<SessionPage />)} />
                    <Route path="/session/:id/report" element={protect(<InterviewReportPage />)} />
                    <Route path="/mock" element={protect(<MockInterviewsPage />)} />
                    <Route path="/mock/:id" element={protect(<MockInterviewRoomPage />)} />
                    <Route path="/mock/:id/report" element={protect(<MockReportPage />)} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        </>
    );
}

export default App;

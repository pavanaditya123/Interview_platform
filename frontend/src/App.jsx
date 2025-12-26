import {
    SignedOut,
    SignOutButton,
    SignedIn,
    SignInButton,
    UserButton,
    useUser,
} from "@clerk/clerk-react";
import { Routes, Route, Navigate } from "react-router";
import HomePage from "./pages/HomePage";
import ProbemsPage from "./pages/ProblemsPage";
import ProblemPage from "./pages/ProblemPage";
import { Toaster } from "react-hot-toast";
import DashBoardPage from "./pages/DashBoardPage";
function App() {
    const { isSignedIn, isLoaded } = useUser();
    if (!isLoaded) {
        return null;
    }
    return (
        <>
            <Routes>
                <Route path="/" element={!isSignedIn ? <HomePage /> : <Navigate to={"/dashboard"} />} />
                <Route path='/dashboard' element={isSignedIn ? <DashBoardPage /> : <Navigate to={"/"} />} />
                <Route path="/problems" element={isSignedIn ? <ProbemsPage /> : <Navigate to={"/"} />} />
                <Route path="/problem/:id" element={isSignedIn ? <ProblemPage /> : <Navigate to={"/"} />} />

            </Routes>
            <Toaster />
        </>
    );
}

export default App;

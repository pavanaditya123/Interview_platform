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
import { Toaster } from "react-hot-toast";
function App() {
  const { isSignedIn } = useUser();

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/problems" element={isSignedIn ? <ProbemsPage /> : <Navigate to={"/"} />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;

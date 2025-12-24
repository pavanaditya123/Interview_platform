import {
    SignedIn,
    SignedOut,
    SignInButton,
    SignOutButton,
    UserButton,
} from "@clerk/clerk-react";

function HomePage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center">

            {/* When user is LOGGED OUT */}
            <button className="btn btn-secondary" onClick={() => toast.success("this is a Sucess toast")}>Click me </button>
            <SignedOut>
                <div className="card bg-base-100 shadow-xl p-6">
                    <h2 className="text-xl mb-4">Welcome! Please sign in</h2>

                    <SignInButton mode="modal">
                        <button className="btn btn-primary w-full">Log in</button>
                    </SignInButton>
                </div>
            </SignedOut>

            {/* When user is LOGGED IN */}
            <SignedIn>
                <div className="card bg-base-100 shadow-xl p-6">
                    <h2 className="text-xl mb-4">You are logged in 🎉</h2>

                    <UserButton />
                    <div className="mt-4">
                        <SignOutButton />
                    </div>
                </div>
            </SignedIn>

        </div>
    );
}

export default HomePage;

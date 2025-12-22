import {
  SignedOut,
  SignOutButton,
  SignedIn,
  SignInButton,
  UserButton
} from "@clerk/clerk-react";

import "./App.css";

function App() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal">
          <button>Login</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton />
        <SignOutButton />
      </SignedIn>
    </header>
  );
}

export default App;

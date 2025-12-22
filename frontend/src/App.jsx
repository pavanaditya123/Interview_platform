import { SignedOut, SignOutButton, SignedIn, SignInButton, UserButton } from '@clerk/clerk-react';
import './App.css'

function App() {

  return (
    <header>

      <SignedOut>
        <SignInButton mode='modal' >
          <Button className="">
            Login.
          </Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <SignOutButton />
      </SignedIn>

      <UserButton />
    </header>
  );
}

export default App

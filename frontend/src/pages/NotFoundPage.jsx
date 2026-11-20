import { Link } from "react-router";

export default function NotFoundPage() {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-base-200 p-6 text-center">
            <p className="text-7xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">404</p>
            <h1 className="text-2xl font-bold">Page not found</h1>
            <p className="opacity-70">The page you're looking for doesn't exist.</p>
            <Link to="/" className="btn btn-primary">
                Go home
            </Link>
        </div>
    );
}

import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl font-bold font-mono text-primary/20">404</div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-xs text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link href="/">
          <button className="px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Go Home
          </button>
        </Link>
      </div>
    </div>
  );
}

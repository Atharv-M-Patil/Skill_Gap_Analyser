import { Link, useLocation } from "wouter";
import { FileText, ScanSearch, LogIn, BriefcaseBusiness, UserRound, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItem = (href: string, label: string, Icon: React.ElementType) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href}>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-lg shadow-primary/10 transition-colors group-hover:border-primary/60">
            <img src="/images/resumehub-logo.svg" alt="ResumeHub" className="w-full h-full object-cover" />
          </div>
          <div><span className="block font-semibold tracking-tight">Resume<span className="text-primary">Hub</span></span><span className="hidden text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Career intelligence</span></div>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {navItem("/student", "Dashboard", LayoutDashboard)}
          {navItem("/resume", "My resume", UserRound)}
          {navItem("/builder", "Builder", FileText)}
          {navItem("/screener", "Screener", ScanSearch)}
          {navItem("/jobs", "Jobs", BriefcaseBusiness)}
          {navItem("/login", "Sign in", LogIn)}
        </div>
      </div>
    </nav>
  );
}

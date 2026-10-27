import { Link, useLocation } from "wouter";
import { FileText, ScanSearch, LogIn } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItem = (href: string, label: string, Icon: React.ElementType) => {
    const active = location === href;
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
    <nav className="border-b border-white/[0.06] bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/20 group-hover:border-primary/40 transition-colors bg-primary/10">
            <img src="/images/resumehub-logo.svg" alt="ResumeHub" className="w-full h-full object-cover" />
          </div>
          <span className="font-mono font-bold text-sm tracking-tight">
            Resume<span className="text-primary">Hub</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItem("/builder", "Builder", FileText)}
          {navItem("/screener", "Screener", ScanSearch)}
          {navItem("/login", "Login", LogIn)}
        </div>
      </div>
    </nav>
  );
}

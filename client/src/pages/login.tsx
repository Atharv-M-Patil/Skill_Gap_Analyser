import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, UserPlus, ArrowRight } from "lucide-react";

type AuthConfig = { googleConfigured: boolean; demoAuthEnabled: boolean; localAuthEnabled: boolean };

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isLoading, isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errorParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("error") : null;
  const errorMsg = errorParam === "google_not_configured" ? "Google sign-in is not configured."
    : errorParam === "google_auth_failed" ? "Google authentication failed."
    : errorParam ? "Sign-in failed. Please try again." : null;

  useEffect(() => {
    fetch("/api/auth/config", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setConfig(d));
  }, []);

  const handleAuth = async () => {
    setError(null);
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) { setError(data.message || "Authentication failed."); return; }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/builder");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm glass rounded-xl p-6 space-y-4">
          <div>
            <h1 className="text-base font-semibold">Sign In</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Access your ResumeHub account</p>
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">Checking session...</p>}

          {!isLoading && isAuthenticated && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                Signed in as {user?.displayName || user?.email}
              </p>
              <button onClick={() => setLocation("/builder")} className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Go to Builder <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleLogout} className="w-full py-2 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                Logout
              </button>
            </div>
          )}

          {!isLoading && !isAuthenticated && (
            <>
              {(errorMsg || error) && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {errorMsg || error}
                </p>
              )}

              {config?.localAuthEnabled && (
                <div className="space-y-3">
                  {/* Mode toggle */}
                  <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
                    <button
                      onClick={() => setMode("login")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${mode === "login" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LogIn className="w-3 h-3" /> Sign In
                    </button>
                    <button
                      onClick={() => setMode("register")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${mode === "register" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <UserPlus className="w-3 h-3" /> Register
                    </button>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Name</label>
                      <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name"
                        className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                      onKeyDown={e => e.key === "Enter" && handleAuth()}
                      className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                  </div>

                  <button onClick={handleAuth} disabled={loading}
                    className="w-full py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => { window.location.href = `/api/auth/google?next=${encodeURIComponent("/builder")}`; }}
                  disabled={!config?.googleConfigured}
                  className="w-full py-2 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue with Google
                </button>
                {config?.demoAuthEnabled && !config?.googleConfigured && (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/auth/dev-login", { method: "POST", credentials: "include" });
                      if (res.ok) { await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); setLocation("/builder"); }
                    }}
                    className="w-full py-2 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Continue in Demo Mode
                  </button>
                )}
              </div>

              {!config?.googleConfigured && (
                <p className="text-xs text-muted-foreground/60">Google login requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.</p>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.06] py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Developed as an academic mini project under <span className="text-foreground/60 font-medium">REVA University</span>.
        </p>
      </footer>
    </div>
  );
}

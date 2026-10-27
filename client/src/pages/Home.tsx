import { Link } from "wouter";
import { ArrowRight, FileText, ScanSearch, Zap, ShieldCheck, Bot } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
            <Zap className="w-3 h-3" />
            ATS Optimization Engine
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Beat the <span className="gradient-text">Bots</span>.<br />
            Land the <span className="gradient-text">Interview</span>.
          </h1>

          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Build ATS-optimized resumes and screen them against job descriptions — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/builder">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Build Resume
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/screener">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-foreground rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                Screen Resume
                <ScanSearch className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Bot className="w-5 h-5 text-primary" />}
            title="Smart Skill Matching"
            description="Extracts key skills from job descriptions and compares them against your profile."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-accent" />}
            title="AI Bullet Generator"
            description="Transforms weak experience points into powerful, action-driven statements."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            title="ATS Score Prediction"
            description="Predicts how your resume performs in major Applicant Tracking Systems."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Developed as an academic mini project under <span className="text-foreground/60 font-medium">REVA University</span>.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass glass-hover rounded-xl p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-background/60 border border-white/[0.06] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

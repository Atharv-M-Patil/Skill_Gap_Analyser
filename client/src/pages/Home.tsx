import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, BriefcaseBusiness, CheckCircle2, FileText, Search, Sparkles, Target } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

export default function Home() {
  const { data: stats } = useQuery<{ postings: number; companies: number; roleFamilies: number }>({ queryKey: ["/api/platform/stats"] });
  return (
    <div className="page-shell">
      <Navbar />
      <main>
        <section className="page-content relative overflow-hidden pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
          <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-8 bg-primary" /> Career intelligence platform</div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] sm:text-6xl lg:text-7xl">Turn your <span className="gradient-text">potential</span> into placement momentum.</h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground">Build a stronger resume, discover the right opportunities, and close the exact skill gaps standing between you and your next interview.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/student" className="btn-primary">Open my dashboard <ArrowUpRight className="h-4 w-4" /></Link>
                <Link href="/jobs" className="btn-secondary">Explore opportunities <BriefcaseBusiness className="h-4 w-4" /></Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground">
                {["Resume intelligence", "Skill gap analysis", "Placement readiness"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{item}</span>)}
              </div>
            </div>
            <div className="relative">
              <div className="glass rounded-3xl p-4 shadow-2xl shadow-black/30">
                <div className="rounded-2xl border border-white/10 bg-[#111b24] p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs text-muted-foreground">Your readiness snapshot</p><p className="mt-1 text-lg font-semibold">Good foundation</p></div><div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary/30 text-lg font-bold text-primary">72%</div></div>
                  <div className="grid grid-cols-2 gap-3 py-5"><Metric label="Job postings" value={String(stats?.postings ?? "—")} tone="text-primary" /><Metric label="Companies" value={String(stats?.companies ?? "—")} tone="text-accent" /><Metric label="Role families" value={String(stats?.roleFamilies ?? "—")} tone="text-emerald-400" /><Metric label="Student metrics" value="Sign in" tone="text-amber-300" /></div>
                  <div className="rounded-xl bg-white/[0.04] p-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">For students</span><Target className="h-4 w-4 text-primary" /></div><p className="mt-2 text-sm">Sign in to see your personal readiness snapshot.</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-1.5 w-1/3 rounded-full bg-primary" /></div></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs shadow-xl sm:block"><span className="text-primary">+24%</span><br /><span className="text-muted-foreground">profile signal</span></div>
            </div>
          </div>
        </section>
        <section className="border-y border-white/[0.07] bg-white/[0.02]">
          <div className="page-content py-14"><div className="mb-9 max-w-xl"><p className="eyebrow">One connected workflow</p><h2 className="mt-3 text-3xl">Everything you need to move forward.</h2><p className="mt-3 text-muted-foreground">Stop guessing what recruiters are looking for. Use real signals to make every application sharper.</p></div><div className="grid gap-4 md:grid-cols-3"><Feature icon={<FileText />} number="01" title="Build with intent" text="Create a clean, ATS-ready resume that reflects your strongest evidence." /><Feature icon={<Search />} number="02" title="Find your fit" text="Explore individual postings and understand what each role really needs." /><Feature icon={<BarChart3 />} number="03" title="Close the gap" text="See matched and missing skills with a clear next action for each opportunity." /></div></div>
        </section>
      </main>
      <footer className="page-content flex flex-col gap-2 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>ResumeHub · Career intelligence for ambitious students</span><span>REVA University academic project</span></footer>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="rounded-xl bg-white/[0.035] p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p></div>; }
function Feature({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) { return <div className="glass glass-hover rounded-2xl p-6"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><span className="font-mono text-xs text-muted-foreground">{number}</span></div><h3 className="mt-6 text-lg">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }

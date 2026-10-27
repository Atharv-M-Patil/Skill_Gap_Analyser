import { Navbar } from "@/components/layout/Navbar";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Plus, Trash2, Download, Eye, EyeOff, FileUp, X, LogIn, UserPlus } from "lucide-react";
import { ResumePreview } from "./ResumePreview";
import { downloadResumePDF } from "./pdf-export";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { extractTextFromFile } from "@/lib/pdf-reader";

async function parseResumeFile(file: File): Promise<string> {
  return extractTextFromFile(file);
}

function extractPersonalInfo(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const emailM = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneM = text.match(/[+]?[\d\s\-().]{10,15}/);
  const linkedinM = text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i);
  const githubM = text.match(/github\.com\/[a-zA-Z0-9\-_%]+/i);
  const nameLine = lines.find(l => { const wc = l.split(/\s+/).length; return wc >= 2 && wc <= 5 && /^[A-Za-z\s.\-]+$/.test(l) && !/@|linkedin|github|phone/i.test(l); }) ?? "";
  const headlineM = text.match(/\b(software engineer|frontend developer|backend developer|full.?stack developer|data scientist|data analyst|devops engineer|machine learning engineer|android developer|ios developer|web developer)\b/i);
  let summary = "";
  const sumIdx = lines.findIndex(l => /^(summary|objective|profile|about)$/i.test(l));
  if (sumIdx >= 0) { const sl: string[] = []; for (let i = sumIdx+1; i < Math.min(lines.length,sumIdx+6); i++) { if (/^(education|experience|skills|projects|certifications|achievements)$/i.test(lines[i])) break; if (lines[i].length > 30) sl.push(lines[i]); } summary = sl.slice(0,3).join(" "); }
  const skillsIdx = lines.findIndex(l => /^(skills|technical skills|technologies|tech stack)$/i.test(l));
  let skills = "";
  if (skillsIdx >= 0) { const sl: string[] = []; for (let i = skillsIdx+1; i < Math.min(lines.length,skillsIdx+8); i++) { if (/^(education|experience|projects|certifications|achievements|summary)$/i.test(lines[i])) break; sl.push(lines[i]); } skills = sl.join(", ").replace(/[|]/g,",").replace(/,+/g,",").trim(); }
  const cityM = text.match(/\b(Bengaluru|Bangalore|Mumbai|Delhi|Pune|Hyderabad|Chennai|Kolkata|Noida|Gurugram|Gurgaon|Ahmedabad|Jaipur)\b/i);
  return { name: nameLine, headline: headlineM ? headlineM[0].replace(/\b\w/g, (c:string) => c.toUpperCase()) : "", email: emailM?.[0] ?? "", phone: phoneM?.[0]?.trim() ?? "", location: cityM?.[0] ?? "", linkedin: linkedinM?.[0] ?? "", github: githubM?.[0] ?? "", summary, skills };
}

const ACTION_VERBS = ["Developed","Implemented","Engineered","Designed","Built","Optimized","Delivered","Led","Architected","Automated","Integrated","Deployed","Collaborated","Reduced","Improved","Launched","Managed","Streamlined","Refactored","Migrated"];
const IMPACT_PHRASES = ["improving system reliability and performance","resulting in faster delivery and reduced downtime","enhancing user experience and engagement","supporting scalable and maintainable architecture","enabling cross-functional team collaboration","reducing operational overhead by optimizing workflows","improving code quality and test coverage","accelerating feature delivery across sprint cycles"];

function aiEnhance(raw: string, ctx: "experience" | "project"): string {
  const lines = raw.split("\n").map(l => l.replace(/^[*-]\s*/, "").trim()).filter(Boolean);
  if (lines.length === 0) {
    return "Developed scalable solutions using modern technologies, improving system performance and reliability.\nCollaborated with cross-functional teams to deliver features on time, enhancing product quality.";
  }
  const out: string[] = [];
  for (let i = 0; i < lines.length && out.length < 4; i++) {
    const line = lines[i];
    const words = line.split(/\s+/).filter(Boolean);
    const verb = ACTION_VERBS[i % ACTION_VERBS.length];
    const impact = IMPACT_PHRASES[i % IMPACT_PHRASES.length];
    const lower = line.charAt(0).toLowerCase() + line.slice(1);
    const alreadyStrong = words.length >= 10;
    const alreadyVerb = /^[A-Z][a-z]+(ed|ing)\b/.test(line);
    if (alreadyStrong) { out.push("" + line.charAt(0).toUpperCase() + line.slice(1) + (line.endsWith(".") ? "" : ".")); }
    else if (alreadyVerb) { out.push("" + line + (line.endsWith(".") ? "" : ", " + impact + ".")); }
    else { out.push("" + verb + " " + lower + (lower.endsWith(".") ? "" : ", " + impact + ".")); }
    if (words.length < 6 && out.length < 4) {
      const v2 = ACTION_VERBS[(i+3) % ACTION_VERBS.length];
      const i2 = IMPACT_PHRASES[(i+2) % IMPACT_PHRASES.length];
      if (ctx === "experience") out.push("" + v2 + " end-to-end implementation of " + lower.replace(/\.$/, "") + ", " + i2 + ".");
      else out.push("" + v2 + " core features for " + lower.replace(/\.$/, "") + ", " + i2 + ".");
    }
  }
  return out.slice(0,4).join("\n");
}

export type PersonalInfo = { name: string; headline: string; email: string; phone: string; location: string; linkedin: string; github: string; summary: string; skills: string; achievements: string; certifications: string; };
export type Experience = { id: number; title: string; company: string; duration: string; description: string };
export type Project = { id: number; title: string; technologies: string; description: string };
export type Education = { id: number; school: string; degree: string; year: string; score: string };
export type ResumeData = { personalInfo: PersonalInfo; experiences: Experience[]; projects: Project[]; education: Education[]; template: string; };

const TEMPLATES = [
  { id:"modern",   label:"Modern" },
  { id:"executive",label:"Executive" },
  { id:"academic", label:"Academic" },
  { id:"twocol",   label:"Two-Column" },
  { id:"clean",    label:"Clean" },
];

export default function BuilderPage() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("upload");
  const [isImporting, setIsImporting] = useState(false);
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login"|"register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [includeFooter, setIncludeFooter] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name:"",headline:"",email:"",phone:"",location:"",linkedin:"",github:"",summary:"",skills:"",achievements:"",certifications:"" });
  const [experiences, setExperiences] = useState<Experience[]>([{ id:1,title:"",company:"",duration:"",description:"" }]);
  const [projects, setProjects] = useState<Project[]>([{ id:1,title:"",technologies:"",description:"" }]);
  const [education, setEducation] = useState<Education[]>([{ id:1,school:"",degree:"",year:"",score:"" }]);

  const resumeData: ResumeData = { personalInfo, experiences, projects, education, template: selectedTemplate };
  const updatePI = (field: keyof PersonalInfo, value: string) => setPersonalInfo(prev => ({ ...prev, [field]: value }));
  const addExp = () => setExperiences(p => [...p, { id:Date.now(),title:"",company:"",duration:"",description:"" }]);
  const removeExp = (id: number) => setExperiences(p => p.filter(e => e.id !== id));
  const updateExp = (id: number, field: keyof Experience, value: string) => setExperiences(p => p.map(e => e.id===id ? {...e,[field]:value} : e));
  const addProj = () => setProjects(p => [...p, { id:Date.now(),title:"",technologies:"",description:"" }]);
  const removeProj = (id: number) => setProjects(p => p.filter(e => e.id !== id));
  const updateProj = (id: number, field: keyof Project, value: string) => setProjects(p => p.map(e => e.id===id ? {...e,[field]:value} : e));
  const addEdu = () => setEducation(p => [...p, { id:Date.now(),school:"",degree:"",year:"",score:"" }]);
  const removeEdu = (id: number) => setEducation(p => p.filter(e => e.id !== id));
  const updateEdu = (id: number, field: keyof Education, value: string) => setEducation(p => p.map(e => e.id===id ? {...e,[field]:value} : e));

  const handleEnhanceExp = (id: number) => {
    const exp = experiences.find(e => e.id === id); if (!exp) return;
    setEnhancing("exp-" + id);
    setTimeout(() => { updateExp(id, "description", aiEnhance(exp.description || exp.title || "software development", "experience")); setEnhancing(null); toast({ title: "Enhanced!", description: "Description upgraded with professional bullets." }); }, 600);
  };
  const handleEnhanceProj = (id: number) => {
    const proj = projects.find(p => p.id === id); if (!proj) return;
    setEnhancing("proj-" + id);
    setTimeout(() => { updateProj(id, "description", aiEnhance(proj.description || proj.title || "project", "project")); setEnhancing(null); toast({ title: "Enhanced!", description: "Description upgraded with professional bullets." }); }, 600);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true);
    const text = await parseResumeFile(file);
    if (!text.trim()) { toast({ title:"Could not read file", description:"Try a text-based PDF or DOCX.", variant:"destructive" }); setIsImporting(false); return; }
    const parsed = extractPersonalInfo(text);
    setPersonalInfo(prev => ({ ...prev, name: parsed.name||prev.name, headline: parsed.headline||prev.headline, email: parsed.email||prev.email, phone: parsed.phone||prev.phone, location: parsed.location||prev.location, linkedin: parsed.linkedin||prev.linkedin, github: parsed.github||prev.github, summary: parsed.summary||prev.summary, skills: parsed.skills||prev.skills }));
    setIsImporting(false);
    setActiveSection("personal");
    toast({ title:"Resume imported", description:"Personal details filled in. Review and continue." });
    if (importRef.current) importRef.current.value = "";
  };

  const saveResume = async () => {
    try {
      await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: personalInfo.name || "My Resume", data: resumeData }),
      });
    } catch { /* silent */ }
  };

  const doDownload = async () => {
    if (!personalInfo.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setIsDownloading(true);
    setShowDownloadModal(false);
    try {
      await downloadResumePDF(resumeData, includeFooter);
      if (isAuthenticated) await saveResume();
      toast({ title: "Downloaded!", description: isAuthenticated ? "Resume saved to your account." : "Sign in to save resumes." });
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
    finally { setIsDownloading(false); }
  };

  const handleDownloadClick = () => {
    if (!personalInfo.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (isAuthenticated) { doDownload(); return; }
    setShowDownloadModal(true);
  };

  const handleModalAuth = async () => {
    setAuthError("");
    if (!authEmail.trim() || !authPassword) { setAuthError("Email and password required."); return; }
    if (authMode === "register" && authPassword.length < 8) { setAuthError("Password must be at least 8 characters."); return; }
    setAuthLoading(true);
    try {
      const res = await fetch(authMode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ email: authEmail, password: authPassword, displayName: authName }),
      });
      const d = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) { setAuthError(d.message || "Authentication failed."); return; }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: authMode === "register" ? "Account created!" : "Signed in!" });
      doDownload();
    } finally { setAuthLoading(false); }
  };

  const sections = [
    { id: "upload", label: "Import" },
    { id: "personal", label: "Personal" },
    { id: "experience", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "education", label: "Education" },
    { id: "skills", label: "Skills & More" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ── Download / Auth Modal ─────────────────────────────────────────── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Save & Download Resume</h2>
              <button onClick={() => setShowDownloadModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Sign in to save your resume to your account, or continue as guest to just download.</p>

            {/* Mode toggle */}
            <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
              <button onClick={() => setAuthMode("login")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${authMode==="login" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <LogIn className="w-3 h-3" /> Sign In
              </button>
              <button onClick={() => setAuthMode("register")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${authMode==="register" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <UserPlus className="w-3 h-3" /> Register
              </button>
            </div>

            {authMode === "register" && (
              <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name"
                className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
            )}
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email"
              className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password (min 8 chars)"
              onKeyDown={e => e.key === "Enter" && handleModalAuth()}
              className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />

            {authError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">{authError}</p>}

            <button onClick={handleModalAuth} disabled={authLoading}
              className="w-full py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {authLoading ? "Please wait..." : authMode === "register" ? "Create Account & Download" : "Sign In & Download"}
            </button>

            <div className="relative flex items-center gap-2">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            <button onClick={doDownload} className="w-full py-2 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              Continue as Guest (Download only)
            </button>

            {/* Footer toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <div>
                <p className="text-xs font-medium">Include Declaration Footer</p>
                <p className="text-xs text-muted-foreground">Adds "I hereby certify..." declaration at the end</p>
              </div>
              <button
                onClick={() => setIncludeFooter(f => !f)}
                className={`relative w-9 h-5 rounded-full transition-colors ${includeFooter ? "bg-primary" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeFooter ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold">Resume Builder</h1>
            <p className="text-xs text-muted-foreground">
              {isAuthenticated ? `Signed in as ${user?.displayName || user?.email} — resumes auto-saved` : "Build and download your resume as PDF"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "Hide Preview" : "Preview"}
            </button>
            <button onClick={handleDownloadClick} disabled={isDownloading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className={`grid gap-4 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"}`}>
          <div className="space-y-3">
            {/* Template */}
            <div className="glass rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Template</p>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selectedTemplate===t.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"}`}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Section nav */}
            <div className="flex gap-1 flex-wrap">
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeSection===s.id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>{s.label}</button>
              ))}
            </div>

            {/* IMPORT — shown when activeSection is upload */}
            <div className={activeSection === "upload" ? "" : "hidden"}>
              <div className="glass rounded-lg p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold mb-1">Import Existing Resume</h2>
                  <p className="text-xs text-muted-foreground">Upload your PDF or DOCX and we will auto-fill your personal details, summary, and skills.</p>
                </div>
                <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" ref={importRef} onChange={handleImport} />
                <button onClick={() => importRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-5 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isImporting ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</> : <><FileUp className="w-3.5 h-3.5" /> Upload Resume</>}
                </button>
                <button onClick={() => setActiveSection("personal")} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                  Skip — fill manually
                </button>
              </div>
            </div>

            {/* PERSONAL — always mounted, hidden when not active */}
            <div className={activeSection === "personal" ? "" : "hidden"}>
              <div className="glass rounded-lg p-4 space-y-3">
                <h2 className="text-sm font-medium">Personal Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name *" value={personalInfo.name} onChange={v => updatePI("name",v)} placeholder="John Doe" />
                  <Field label="Headline" value={personalInfo.headline} onChange={v => updatePI("headline",v)} placeholder="Software Engineer" />
                  <Field label="Email *" value={personalInfo.email} onChange={v => updatePI("email",v)} placeholder="john@example.com" type="email" />
                  <Field label="Phone" value={personalInfo.phone} onChange={v => updatePI("phone",v)} placeholder="+91 98765 43210" />
                  <Field label="Location" value={personalInfo.location} onChange={v => updatePI("location",v)} placeholder="Bengaluru, India" />
                  <Field label="LinkedIn" value={personalInfo.linkedin} onChange={v => updatePI("linkedin",v)} placeholder="linkedin.com/in/johndoe" />
                  <Field label="GitHub" value={personalInfo.github} onChange={v => updatePI("github",v)} placeholder="github.com/johndoe" className="col-span-2" />
                </div>
                <TextareaField label="Professional Summary" value={personalInfo.summary} onChange={v => updatePI("summary",v)} placeholder="Brief 2-3 sentence overview of your experience and goals..." rows={3} />
              </div>
            </div>

            {/* EXPERIENCE */}
            <div className={activeSection === "experience" ? "" : "hidden"}>
              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-muted-foreground">Experience {idx+1}</h3>
                      {experiences.length > 1 && <button onClick={() => removeExp(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Job Title" value={exp.title} onChange={v => updateExp(exp.id,"title",v)} placeholder="Software Engineer" />
                      <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id,"company",v)} placeholder="Google" />
                      <Field label="Duration" value={exp.duration} onChange={v => updateExp(exp.id,"duration",v)} placeholder="Jan 2022 - Present" className="col-span-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground font-medium">Description</label>
                        <button onClick={() => handleEnhanceExp(exp.id)} disabled={enhancing === "exp-"+exp.id} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50">
                          <Sparkles className="w-3 h-3" />{enhancing === "exp-"+exp.id ? "Enhancing..." : "AI Enhance"}
                        </button>
                      </div>
                      <textarea value={exp.description} onChange={e => updateExp(exp.id,"description",e.target.value)} placeholder={"Built REST APIs using Node.js\nReduced load time by 40%"} rows={4} className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono leading-relaxed" />
                    </div>
                  </div>
                ))}
                <button onClick={addExp} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Experience</button>
              </div>
            </div>

            {/* PROJECTS */}
            <div className={activeSection === "projects" ? "" : "hidden"}>
              <div className="space-y-3">
                {projects.map((proj, idx) => (
                  <div key={proj.id} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-muted-foreground">Project {idx+1}</h3>
                      {projects.length > 1 && <button onClick={() => removeProj(proj.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Project Title" value={proj.title} onChange={v => updateProj(proj.id,"title",v)} placeholder="E-Commerce App" />
                      <Field label="Technologies" value={proj.technologies} onChange={v => updateProj(proj.id,"technologies",v)} placeholder="React, Node.js, MongoDB" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground font-medium">Description</label>
                        <button onClick={() => handleEnhanceProj(proj.id)} disabled={enhancing === "proj-"+proj.id} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50">
                          <Sparkles className="w-3 h-3" />{enhancing === "proj-"+proj.id ? "Enhancing..." : "AI Enhance"}
                        </button>
                      </div>
                      <textarea value={proj.description} onChange={e => updateProj(proj.id,"description",e.target.value)} placeholder={"Built a full-stack e-commerce platform\nIntegrated Stripe payment gateway"} rows={3} className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono leading-relaxed" />
                    </div>
                  </div>
                ))}
                <button onClick={addProj} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Project</button>
              </div>
            </div>

            {/* EDUCATION */}
            <div className={activeSection === "education" ? "" : "hidden"}>
              <div className="space-y-3">
                {education.map((edu, idx) => (
                  <div key={edu.id} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-muted-foreground">Education {idx+1}</h3>
                      {education.length > 1 && <button onClick={() => removeEdu(edu.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="School / University" value={edu.school} onChange={v => updateEdu(edu.id,"school",v)} placeholder="REVA University" className="col-span-2" />
                      <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id,"degree",v)} placeholder="B.Tech" />
                      <Field label="Year" value={edu.year} onChange={v => updateEdu(edu.id,"year",v)} placeholder="2020 - 2024" />
                      <Field label="Score / CGPA" value={edu.score} onChange={v => updateEdu(edu.id,"score",v)} placeholder="8.5 / 10" className="col-span-2" />
                    </div>
                  </div>
                ))}
                <button onClick={addEdu} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Education</button>
              </div>
            </div>

            {/* SKILLS */}
            <div className={activeSection === "skills" ? "" : "hidden"}>
              <div className="glass rounded-lg p-4 space-y-3">
                <h2 className="text-sm font-medium">Skills & Additional Info</h2>
                <TextareaField label="Skills (comma separated)" value={personalInfo.skills} onChange={v => updatePI("skills",v)} placeholder="JavaScript, React, Node.js, Python, Docker, AWS..." rows={2} />
                <TextareaField label="Achievements" value={personalInfo.achievements} onChange={v => updatePI("achievements",v)} placeholder={"1st place at REVA Ideathon 2023\nPublished research paper on ML"} rows={3} />
                <TextareaField label="Certifications" value={personalInfo.certifications} onChange={v => updatePI("certifications",v)} placeholder={"AWS Certified Developer\nGoogle Cloud Associate"} rows={3} />
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="glass rounded-lg overflow-hidden">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-medium">Live Preview</span>
                <span className="text-xs text-muted-foreground">Matches download</span>
              </div>
              <div className="overflow-auto max-h-[calc(100vh-180px)]">
                <ResumePreview data={resumeData} />
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className="border-t border-white/[0.06] py-3 text-center">
        <p className="text-xs text-muted-foreground">Developed as an academic mini project under <span className="text-foreground/60 font-medium">REVA University</span>.</p>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type="text", className="" }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; className?:string; }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-colors" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows=3, className="" }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string; rows?:number; className?:string; }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-colors resize-none font-mono leading-relaxed" />
    </div>
  );
}

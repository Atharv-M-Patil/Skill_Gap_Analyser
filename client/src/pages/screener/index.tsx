import { Navbar } from "@/components/layout/Navbar";
import { useState, useRef } from "react";
import { Upload, FileText, BarChart2, CheckCircle2, AlertTriangle, Zap, RotateCcw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/pdf-reader";

// PDF/DOCX extraction handled by shared lib/pdf-reader.ts

// ── Smart JD keyword extraction ─────────────────────────────────────────────
// Strategy: only extract things that are actually skills/tools/qualifications
// NOT random sentence fragments

// Master list of known tech/skill terms — used for exact matching
const KNOWN_TERMS: string[] = [
  // Languages
  "JavaScript","TypeScript","Python","Java","C++","C#","C","Go","Golang","Rust","PHP","Swift","Kotlin","Scala","Ruby","R","MATLAB","Dart","Perl","Haskell","Elixir","Clojure","Groovy","Lua","Julia","Bash","Shell","PowerShell","VBA","COBOL","Fortran","Assembly",
  // Frontend
  "React","Vue","Angular","Next.js","Nuxt.js","Svelte","Remix","Gatsby","jQuery","Bootstrap","Tailwind","Tailwind CSS","Material UI","Chakra UI","Ant Design","Redux","Zustand","MobX","Recoil","Webpack","Vite","Babel","Rollup","Parcel","SASS","LESS","CSS","HTML","HTML5","CSS3","XML","JSON","GraphQL","REST","REST API","SOAP","WebSocket","gRPC","tRPC",
  // Backend
  "Node.js","Express","Express.js","Django","Flask","FastAPI","Spring","Spring Boot","Laravel","Rails","Ruby on Rails","ASP.NET",".NET","NestJS","Gin","Echo","Fiber","Actix","Rocket","Hapi","Koa","Fastify","Strapi","Prisma","Sequelize","TypeORM","Hibernate","SQLAlchemy",
  // Databases
  "MySQL","PostgreSQL","MongoDB","Redis","SQLite","Oracle","SQL Server","MariaDB","Cassandra","DynamoDB","Firebase","Firestore","Supabase","CouchDB","Neo4j","InfluxDB","Elasticsearch","Solr","Snowflake","BigQuery","Redshift","Hive","HBase","Cosmos DB",
  // Cloud & DevOps
  "AWS","Azure","GCP","Google Cloud","Docker","Kubernetes","Terraform","Ansible","Jenkins","GitHub Actions","GitLab CI","CircleCI","Travis CI","ArgoCD","Helm","Prometheus","Grafana","Datadog","New Relic","Splunk","ELK","Nginx","Apache","Linux","Ubuntu","CentOS","Debian","Unix","Bash","CI/CD","DevOps","SRE","IaC",
  // Tools
  "Git","GitHub","GitLab","Bitbucket","Jira","Confluence","Notion","Slack","Figma","Sketch","Adobe XD","Postman","Swagger","OpenAPI","Insomnia","VS Code","IntelliJ","Eclipse","Xcode","Android Studio","Vim","Neovim",
  // Data & ML
  "Machine Learning","Deep Learning","NLP","Computer Vision","Data Science","Data Analysis","Data Engineering","Data Visualization","Pandas","NumPy","SciPy","Matplotlib","Seaborn","Plotly","TensorFlow","PyTorch","Keras","Scikit-Learn","XGBoost","LightGBM","Hugging Face","OpenAI","LangChain","Spark","Hadoop","Kafka","Airflow","dbt","Tableau","Power BI","Looker","Metabase","Excel","SPSS","SAS","R Studio",
  // Mobile
  "React Native","Flutter","Android","iOS","Swift","Kotlin","Ionic","Expo","Xamarin","Cordova",
  // Testing
  "Jest","Mocha","Chai","Jasmine","Cypress","Playwright","Selenium","Pytest","JUnit","TestNG","Vitest","Testing Library","Storybook",
  // Methodologies
  "Agile","Scrum","Kanban","SAFe","Waterfall","TDD","BDD","DDD","SOLID","OOP","Microservices","Serverless","Event-Driven","CQRS","Clean Architecture",
  // Soft skills / qualifications that ATS checks
  "Communication","Problem Solving","Teamwork","Leadership","Analytical","Critical Thinking","Time Management","Collaboration","Presentation","Documentation",
  // Certifications
  "AWS Certified","Azure Certified","GCP Certified","PMP","CISSP","CPA","CFA","CCNA","CCNP","CompTIA","Scrum Master","Product Owner",
];

// Normalize for comparison
function norm(s: string) { return s.toLowerCase().replace(/\s+/g," ").trim(); }

// Whole-word match
function wholeWord(term: string, text: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![a-zA-Z0-9.+#])" + esc + "(?![a-zA-Z0-9.+#])", "i").test(text);
}

function extractJDKeywords(jd: string): string[] {
  const found = new Map<string, string>(); // norm -> display

  // Pass 1: Match known terms (longest first to avoid partial matches)
  const sorted = [...KNOWN_TERMS].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    if (wholeWord(term, jd)) {
      found.set(norm(term), term);
    }
  }

  // Pass 2: Extract tokens that look like tech/tools but aren't in our list
  // Rules: CamelCase, ALL_CAPS (2-8 chars), or has digit+letter combo, or dotted (node.js style)
  // Must be at least 2 chars, not a stop word
  const STOP = new Set(["the","and","for","with","from","that","this","your","are","our","will","have","has","must","should","ability","skills","experience","work","working","team","role","job","position","years","year","using","plus","good","strong","excellent","knowledge","required","preferred","about","after","also","been","before","being","between","both","come","could","does","done","each","here","into","just","like","make","many","more","most","much","need","only","other","over","same","some","such","than","their","them","then","there","these","they","those","through","under","until","very","want","well","were","what","when","where","which","while","would","you","we","as","at","be","by","do","if","in","is","it","no","of","on","or","so","to","up","us","can","may","new","own","per","set","use","via","who","why","yes","yet","able","across","along","already","always","another","around","build","built","candidate","company","develop","different","during","either","ensure","every","first","following","given","help","high","however","including","large","last","least","less","level","look","maintain","making","might","never","next","often","own","part","place","please","point","provide","rather","right","since","small","something","sometimes","still","take","things","think","time","together","toward","type","used","various","within","without","write","written","apply","based","bring","care","collaborate","communicate","day","drive","fast","focus","grow","hire","impact","join","learn","love","mission","move","open","opportunity","passion","people","product","quality","quickly","real","scale","seek","ship","solve","start","support","understand","value","world","collect","clean","identify","trends","patterns","business","strategies","create","dashboards","manipulate","data","cross","functional","present","findings","concise","manner","related","field","basic","understanding","analysis","techniques","cloud","platforms","analyze","insights","reports","extract","stakeholders","clear","communication","preprocessing","familiarity","proficiency","multiple","sources"]);

  // CamelCase tokens: ReactNative, TypeScript, PostgreSQL etc
  const camel = jd.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g) ?? [];
  for (const t of camel) {
    const k = norm(t);
    if (!STOP.has(k) && !found.has(k)) found.set(k, t);
  }

  // ALL-CAPS 2-8 chars: AWS, SQL, API, REST, HTML, CSS, JWT, OOP, SDK
  const caps = jd.match(/\b[A-Z]{2,8}\b/g) ?? [];
  for (const t of caps) {
    const k = norm(t);
    if (!STOP.has(k) && !found.has(k) && t.length >= 2) found.set(k, t);
  }

  // Slash combos: CI/CD, UI/UX, B2B
  const slash = jd.match(/\b[A-Za-z0-9]{2,}\/[A-Za-z0-9]{2,}\b/g) ?? [];
  for (const t of slash) {
    const k = norm(t);
    if (!STOP.has(k) && !found.has(k)) found.set(k, t);
  }

  // Dotted tech names: node.js, vue.js, next.js (lowercase)
  const dotted = jd.match(/\b[a-z][a-z0-9]+\.[a-z]{2,4}\b/gi) ?? [];
  for (const t of dotted) {
    const k = norm(t);
    if (!STOP.has(k) && !found.has(k)) found.set(k, t);
  }

  // Versioned tokens: Python3, ES6, HTML5, CSS3, Java8, .NET6
  const versioned = jd.match(/\b[A-Za-z]+[0-9]+\b/g) ?? [];
  for (const t of versioned) {
    const k = norm(t);
    if (!STOP.has(k) && !found.has(k) && t.length >= 3) found.set(k, t);
  }

  return Array.from(found.values());
}
function runATS(resume: string, jd: string) {
  const resumeLow = resume.toLowerCase();
  const jdKeywords = extractJDKeywords(jd);

  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of jdKeywords) {
    if (wholeWord(kw, resume) || resumeLow.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const skillScore = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 50;

  const sec = {
    contact:    /\b(email|phone|linkedin|github|@)\b/i.test(resume),
    summary:    /\b(summary|objective|profile|about)\b/i.test(resume),
    experience: /\b(experience|work|employment|internship)\b/i.test(resume),
    education:  /\b(education|university|college|degree|b\.?tech|bachelor|master|bca|mca)\b/i.test(resume),
    skills:     /\b(skills|technologies|tech stack|proficient)\b/i.test(resume),
  };
  const sectionScore = Math.round((Object.values(sec).filter(Boolean).length / 5) * 100);

  const verbs = ["developed","implemented","built","designed","led","optimized","delivered","engineered","created","managed","architected","deployed","automated","reduced","increased","improved","launched","integrated","migrated","collaborated","maintained","refactored","tested","documented"];
  const verbsFound = verbs.filter(v => resumeLow.includes(v));
  const verbScore = Math.min(100, Math.round((verbsFound.length / 8) * 100));

  const qm = resume.match(/\d+\s*(%|percent|x\b|users|customers|engineers|team members|projects|services|ms\b|seconds|hours|days|weeks|months)/gi) ?? [];
  const impactScore = Math.min(100, qm.length * 15);

  const titleM = jd.match(/\b(software engineer|frontend developer|backend developer|full.?stack|data scientist|data analyst|devops engineer|machine learning engineer|android developer|ios developer|product manager|ui.?ux designer|cloud engineer|security engineer)\b/i);
  const roleScore = titleM ? (resumeLow.includes(titleM[0].toLowerCase()) ? 100 : 40) : 60;

  const jdDeg = /\b(b\.?tech|bachelor|degree|engineering|computer science)\b/i.test(jd);
  const resDeg = /\b(b\.?tech|bachelor|degree|engineering|computer science|bca|mca)\b/i.test(resume);
  const eduScore = jdDeg ? (resDeg ? 100 : 30) : 80;

  const stopWords = new Set(["about","after","again","also","been","before","being","between","both","came","come","could","does","done","each","from","have","here","into","just","like","make","many","more","most","much","must","need","only","other","over","same","should","some","such","than","that","their","them","then","there","these","they","this","those","through","under","until","very","want","well","were","what","when","where","which","while","will","with","would","your","able","across","along","already","always","another","around","build","built","candidate","company","develop","different","during","either","ensure","every","first","following","given","help","high","however","including","large","last","least","less","level","look","maintain","making","might","never","next","often","other","own","part","place","please","point","provide","rather","right","since","small","something","sometimes","still","take","things","think","time","together","toward","type","used","using","various","within","without","write","written"]);
  const jdW = Array.from(new Set(jd.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>=5&&!stopWords.has(w))));
  const densityScore = jdW.length > 0 ? Math.round((jdW.filter(w=>resumeLow.includes(w)).length/jdW.length)*100) : 50;

  const overall = Math.round(skillScore*0.30+sectionScore*0.15+verbScore*0.15+impactScore*0.10+roleScore*0.10+eduScore*0.10+densityScore*0.10);

  const col = (n:number,hi:number,mid:number) => n>=hi?"#22c55e":n>=mid?"#eab308":"#ef4444";
  const breakdown = [
    { label:"Skill & Keyword Match", score:skillScore,   weight:"30%", color:col(skillScore,70,40) },
    { label:"Section Completeness",  score:sectionScore, weight:"15%", color:col(sectionScore,80,50) },
    { label:"Action Verbs",          score:verbScore,    weight:"15%", color:col(verbScore,60,30) },
    { label:"Quantified Impact",     score:impactScore,  weight:"10%", color:col(impactScore,40,20) },
    { label:"Role Alignment",        score:roleScore,    weight:"10%", color:col(roleScore,70,40) },
    { label:"Education Match",       score:eduScore,     weight:"10%", color:col(eduScore,80,50) },
    { label:"JD Keyword Density",    score:densityScore, weight:"10%", color:col(densityScore,50,30) },
  ];

  const tips: string[] = [];
  if (skillScore < 60 && missing.length) tips.push("Add missing keywords to your resume: " + missing.slice(0,5).join(", "));
  if (!sec.summary)     tips.push("Add a Professional Summary section — ATS systems specifically look for it.");
  if (!sec.contact)     tips.push("Ensure email, phone, and LinkedIn are clearly listed.");
  if (verbScore < 50)   tips.push("Use more action verbs: Developed, Built, Optimized, Led, Delivered...");
  if (impactScore < 30) tips.push("Add metrics to bullets — e.g. Reduced load time by 40% or Led team of 5.");
  if (!sec.skills)      tips.push("Add a dedicated Skills section — ATS parsers look for it explicitly.");

  return { overall, breakdown, matched, missing, sec, tips, jdKeywords };
}

const LEARN: Record<string,{url:string;tip:string}> = {
  "Docker":          {url:"https://docs.docker.com/get-started/",                    tip:"Containerize a small web app to add to your projects."},
  "AWS":             {url:"https://aws.amazon.com/training/",                        tip:"Start with EC2, S3, and RDS basics."},
  "Azure":           {url:"https://learn.microsoft.com/en-us/azure/",               tip:"Great for enterprise and Microsoft-stack roles."},
  "GCP":             {url:"https://cloud.google.com/training",                       tip:"Strong for ML and data engineering roles."},
  "GraphQL":         {url:"https://graphql.org/learn/",                              tip:"Modern API query language — increasingly required."},
  "TypeScript":      {url:"https://www.typescriptlang.org/docs/",                   tip:"Now expected in most frontend and Node.js roles."},
  "Machine Learning":{url:"https://www.coursera.org/learn/machine-learning",        tip:"Andrew Ng course is the gold standard."},
  "PostgreSQL":      {url:"https://www.postgresql.org/docs/",                       tip:"Most popular open-source relational database."},
  "Redis":           {url:"https://redis.io/docs/",                                  tip:"In-memory caching — key for performance-critical apps."},
  "TensorFlow":      {url:"https://www.tensorflow.org/learn",                       tip:"Google ML framework — widely used in industry."},
  "Django":          {url:"https://docs.djangoproject.com/",                        tip:"Python web framework — popular for backend roles."},
  "Next.js":         {url:"https://nextjs.org/docs",                                tip:"React framework for production — very in demand."},
  "Kubernetes":      {url:"https://kubernetes.io/docs/tutorials/kubernetes-basics/", tip:"Container orchestration — highly sought after."},
};

type ATSResult = ReturnType<typeof runATS>;

export default function ScreenerPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string|null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ATSResult|null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setFileName(file.name);
    const text = await extractTextFromFile(file);
    setResumeText(text); setUploading(false);
    if (!text.trim()) toast({ title:"Could not read file", description:"File may be image-based. Paste resume text below.", variant:"destructive" });
    else toast({ title:"Resume loaded", description:text.split(/\s+/).filter(Boolean).length + " words extracted" });
  };

  const handleAnalyze = () => {
    if (!resumeText.trim()) { toast({ title:"Resume is empty", description:"Upload a file or paste your resume text.", variant:"destructive" }); return; }
    if (!jdText.trim()) { toast({ title:"Job description missing", variant:"destructive" }); return; }
    setAnalyzing(true);
    setTimeout(() => { setResult(runATS(resumeText, jdText)); setAnalyzing(false); }, 1000);
  };

  const reset = () => { setResult(null); setFileName(null); setResumeText(""); setJdText(""); if (fileRef.current) fileRef.current.value = ""; };
  const canAnalyze = resumeText.trim().length > 10 && jdText.trim().length > 10;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold">ATS Screener</h1>
            <p className="text-xs text-muted-foreground">Real ATS analysis — extracts all keywords from JD and scores your resume</p>
          </div>
          {result && <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> New Analysis</button>}
        </div>

        {!result ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Your Resume</span></div>
              <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" ref={fileRef} onChange={handleUpload} />
              <div onClick={() => fileRef.current?.click()} className={"border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors " + (fileName && resumeText ? "border-primary/40 bg-primary/5" : fileName && !resumeText ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 hover:border-white/20")}>
                {uploading ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                  : fileName && resumeText ? <CheckCircle2 className="w-6 h-6 text-primary mb-1" />
                  : <Upload className="w-6 h-6 text-muted-foreground mb-1" />}
                <p className="text-xs font-medium">{uploading ? "Reading..." : fileName ?? "Click to upload"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fileName && resumeText ? resumeText.split(/\s+/).filter(Boolean).length + " words read" : fileName && !resumeText ? "No text found — paste below" : "PDF, DOCX, or TXT"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Or paste resume text</label>
                <textarea value={resumeText} onChange={e=>setResumeText(e.target.value)} placeholder="Paste resume here if file upload did not work..." rows={5} className="w-full px-2.5 py-1.5 rounded-md bg-input border border-white/[0.08] text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono leading-relaxed" />
              </div>
            </div>
            <div className="glass rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-accent" /><span className="text-sm font-medium">Job Description</span></div>
              <textarea value={jdText} onChange={e=>setJdText(e.target.value)} placeholder="Paste the full job description here..." className="flex-1 min-h-[220px] px-3 py-2 rounded-md bg-input border border-white/[0.08] text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono leading-relaxed" />
              <button onClick={handleAnalyze} disabled={analyzing||!canAnalyze} className="flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40">
                {analyzing ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : <><Zap className="w-3.5 h-3.5" /> Run ATS Analysis</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glass rounded-lg p-6 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">ATS Score</p>
                <div className={"text-6xl font-bold font-mono tracking-tighter mb-2 " + (result.overall>=75?"text-emerald-400":result.overall>=50?"text-yellow-400":"text-red-400")}>
                  {result.overall}<span className="text-2xl text-muted-foreground">%</span>
                </div>
                <span className={"text-xs px-2.5 py-0.5 rounded-full border font-medium " + (result.overall>=75?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":result.overall>=50?"bg-yellow-500/10 text-yellow-400 border-yellow-500/20":"bg-red-500/10 text-red-400 border-red-500/20")}>
                  {result.overall>=75?"Strong Match":result.overall>=50?"Needs Improvement":"Low Match"}
                </span>
                <p className="text-xs text-muted-foreground mt-3">{result.jdKeywords.length} keywords extracted from JD</p>
              </div>
              <div className="glass rounded-lg p-4 md:col-span-2">
                <p className="text-xs font-medium mb-3">Score Breakdown</p>
                <div className="space-y-2.5">
                  {result.breakdown.map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label} <span className="text-muted-foreground/40">({item.weight})</span></span>
                        <span className="font-mono font-medium">{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{width:item.score+"%",background:item.color}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs font-medium text-red-400">Missing Keywords ({result.missing.length})</span></div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {result.missing.length===0 ? <span className="text-xs text-muted-foreground">All keywords matched!</span>
                    : result.missing.map(s=><span key={s} className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-300 text-xs">{s}</span>)}
                </div>
                {result.missing.filter(s=>LEARN[s]).length>0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Learning Resources</p>
                    {result.missing.filter(s=>LEARN[s]).slice(0,3).map(s=>(
                      <div key={s} className="bg-white/[0.03] border border-white/[0.06] rounded-md p-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-primary">{s}</span>
                          <a href={LEARN[s].url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Docs <ExternalLink className="w-3 h-3" /></a>
                        </div>
                        <p className="text-xs text-muted-foreground">{LEARN[s].tip}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="glass rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">Matched Keywords ({result.matched.length})</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched.length===0 ? <span className="text-xs text-muted-foreground">No matches found.</span>
                    : result.matched.map(s=><span key={s} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">{s}</span>)}
                </div>
              </div>
            </div>

            {result.tips.length>0 && (
              <div className="glass rounded-lg p-4">
                <p className="text-xs font-medium mb-3">How to Improve Your Score</p>
                <div className="space-y-2">
                  {result.tips.map((t,i)=>(
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-0.5 shrink-0">→</span><span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="border-t border-white/[0.06] py-3 text-center mt-6">
        <p className="text-xs text-muted-foreground">Developed as an academic mini project under <span className="text-foreground/60 font-medium">REVA University</span>.</p>
      </footer>
    </div>
  );
}
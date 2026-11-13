import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  photo?: string;
  role: "student" | "officer";
};

const skillAliases: Record<string, string> = {
  javascript: "javascript", js: "javascript", typescript: "typescript", ts: "typescript",
  postgres: "postgresql", postgresql: "postgresql", "amazon web services": "aws", aws: "aws",
  "node.js": "node.js", nodejs: "node.js", reactjs: "react", "react.js": "react",
  "rest api": "rest apis", "restful apis": "rest apis",
};

function normalizeSkill(skill: string) {
  const cleaned = skill.toLowerCase().replace(/[.,]/g, "").trim();
  return skillAliases[cleaned] || cleaned;
}

function isValidSkill(skill: string) {
  const normalized = normalizeSkill(skill);
  return normalized.length > 1
    && !["not identified", "not identified yet", "n/a", "na", "none", "null", "undefined"].includes(normalized);
}

function skillsFromJobDescription(description: string) {
  const required: string[] = [];
  const requiredPattern = /(?:Hands-on with|Strong knowledge of)\s+([^\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = requiredPattern.exec(description))) {
    const skill = match[1].trim().replace(/[.]$/, "");
    if (isValidSkill(skill)) required.push(skill);
  }
  const preferred = description.split(/Good to Have:/i)[1]?.split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(isValidSkill) || [];
  const unique = (skills: string[]) => Array.from(new Map(skills.map((skill) => [normalizeSkill(skill), skill])).values());
  const requiredSkills = unique(required);
  const requiredNames = new Set(requiredSkills.map(normalizeSkill));
  return {
    required: requiredSkills,
    preferred: unique(preferred).filter((skill) => !requiredNames.has(normalizeSkill(skill))),
  };
}

function profileSkills(data: Record<string, unknown>) {
  const values: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    if (Array.isArray(value)) value.forEach(collect);
    if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(data.skills);
  collect(data.projects);
  collect(data.certifications);
  collect(data.internships);
  return new Set(values.flatMap((value) => value.split(/[,;|]/).map(normalizeSkill)));
}

const learningResources: Record<string, { resource: string; url: string; project: string }> = {
  aws: { resource: "AWS Skill Builder", url: "https://skillbuilder.aws/", project: "Deploy a containerized API with IAM and CloudWatch." },
  kubernetes: { resource: "Kubernetes Basics", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", project: "Deploy a multi-service app with a local Kubernetes cluster." },
  java: { resource: "Dev.java Learning", url: "https://dev.java/learn/", project: "Build a REST service with validation and tests." },
  "spring boot": { resource: "Spring Guides", url: "https://spring.io/guides", project: "Create a Spring Boot CRUD API backed by PostgreSQL." },
  sql: { resource: "SQLBolt", url: "https://sqlbolt.com/", project: "Model and query an analytics dataset with joins and indexes." },
  react: { resource: "React Learn", url: "https://react.dev/learn", project: "Build a data-driven dashboard with loading and error states." },
  typescript: { resource: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", project: "Convert a small JavaScript app to strict TypeScript." },
};

function buildAnalysis(job: Awaited<ReturnType<typeof storage.getJobPosting>>, resume: Awaited<ReturnType<typeof storage.getLatestResume>>, profile: Awaited<ReturnType<typeof storage.getStudentProfile>>) {
  if (!job || !resume) return undefined;
  const { required, preferred } = skillsFromJobDescription(job.jobDescription);
  const resumeData = (resume.data || {}) as Record<string, unknown>;
  const resumeText = String(resumeData.extractedText || "").toLowerCase();
  const explicitSkills = profileSkills((profile?.data || {}) as Record<string, unknown>);
  const profileText = Array.from(explicitSkills).join(" ");
  const evidenceFor = (skill: string) => {
    const normalized = normalizeSkill(skill);
    if (explicitSkills.has(normalized)) return "Explicitly listed in your profile.";
    if (resumeText.includes(normalized)) return "Detected in the uploaded resume text.";
    return "";
  };
  const classified = [...required.map((skill) => ({ skill, type: "required" })), ...preferred.map((skill) => ({ skill, type: "preferred" }))].map((item) => {
    const evidence = evidenceFor(item.skill);
    if (explicitSkills.has(normalizeSkill(item.skill))) return { kind: "matched" as const, item: { ...item, evidence, reason: "The skill is explicitly recorded in your student profile." } };
    if (evidence) return { kind: "partial" as const, item: { ...item, evidence, reason: "The keyword appears in the resume, but no structured project or experience evidence is recorded." } };
    return { kind: "missing" as const, item: { ...item, nextStep: learningResources[normalizeSkill(item.skill)]?.project || `Add a project or experience example demonstrating ${item.skill}.` } };
  });
  const matchedSkills = classified.filter((item) => item.kind === "matched").map((item) => item.item);
  const partialSkills = classified.filter((item) => item.kind === "partial").map((item) => item.item);
  const missingSkills = classified.filter((item) => item.kind === "missing").map((item) => item.item);
  const requiredScore = required.length ? (required.filter((skill) => explicitSkills.has(normalizeSkill(skill))).length + required.filter((skill) => !explicitSkills.has(normalizeSkill(skill)) && evidenceFor(skill)).length * 0.5) / required.length : 0;
  const preferredScore = preferred.length ? (preferred.filter((skill) => explicitSkills.has(normalizeSkill(skill))).length + preferred.filter((skill) => !explicitSkills.has(normalizeSkill(skill)) && evidenceFor(skill)).length * 0.5) / preferred.length : requiredScore;
  const keywordList = [...required, ...preferred];
  const keywordMatches = keywordList.filter((skill) => {
    const normalized = normalizeSkill(skill);
    return resumeText.includes(normalized) || profileText.includes(normalized);
  });
  const keywordCoverage = keywordList.length ? Math.round((keywordMatches.length / keywordList.length) * 100) : 0;
  const skillMatchScore = Math.round((requiredScore * 80 + preferredScore * 20) * 100) / 100;
  const atsScore = Math.round((keywordCoverage * 0.6) + (skillMatchScore * 0.4));
  const profileData = (profile?.data || {}) as Record<string, any>;
  const educationText = `${profileData.education?.degree || ""} ${profileData.education?.branch || ""}`.toLowerCase();
  return {
    atsScore, skillMatchScore, matchedSkills, partialSkills, missingSkills, keywordCoverage,
    keywordMatches,
    missingKeywords: keywordList.filter((skill) => {
      const normalized = normalizeSkill(skill);
      return !resumeText.includes(normalized) && !profileText.includes(normalized);
    }),
    eligibility: {
      degree: educationText ? (job.education.toLowerCase().includes("b.tech") && /b\.?tech|b\.?e|mca/.test(educationText) ? "Potentially eligible" : "Unknown / verify degree") : "Unknown / insufficient information",
      branch: educationText ? (/computer|software|information|it/.test(educationText) ? "Potentially eligible" : "Unknown / verify branch") : "Unknown / insufficient information",
      experience: "Unknown / insufficient information",
    },
    suggestions: [
      ...(missingSkills.length ? [`Add evidence for ${missingSkills.slice(0, 3).map((item) => item.skill).join(", ")} through a project or experience.`] : []),
      ...(keywordCoverage < 70 ? ["Use the selected job's language naturally in relevant resume bullets."] : []),
      ...(resumeText.length < 400 ? ["Add measurable outcomes and context to your resume sections."] : []),
    ],
    learningRecommendations: missingSkills.map((item) => ({ skill: item.skill, ...(learningResources[normalizeSkill(item.skill)] || { resource: "Practice project", url: "https://roadmap.sh/", project: item.nextStep }) })),
  };
}

function requireAuth(req: Request, res: Response) {
  if (!req.isAuthenticated?.()) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  return true;
}

function requireOfficer(req: Request, res: Response) {
  if (!requireAuth(req, res)) return false;
  if (req.user?.role !== "officer") {
    res.status(403).json({ message: "Placement officer access required" });
    return false;
  }
  return true;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, savedHash] = stored.split(":");
  if (!salt || !savedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  const savedHashBuffer = Buffer.from(savedHash, "hex");
  const computedHashBuffer = Buffer.from(computedHash, "hex");
  if (savedHashBuffer.length !== computedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(savedHashBuffer, computedHashBuffer);
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const demoAuthEnabled = process.env.NODE_ENV !== "production";
  const localAuthEnabled = true;
  const secureCookies = process.env.COOKIE_SECURE === "true";

  const MemoryStore = createMemoryStore(session);
  const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";

  app.set("trust proxy", 1);
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: AuthUser, done) => {
    done(null, user);
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(200).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      user: req.user,
    });
  });

  app.get("/api/auth/config", (_req, res) => {
    res.status(200).json({
      demoAuthEnabled,
      localAuthEnabled,
    });
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      if (!localAuthEnabled) {
        return res.status(403).json({ message: "Email/password sign-up is disabled." });
      }

      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const displayName = String(req.body?.displayName || "").trim();

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const existing = await storage.getUserByUsername(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const created = await storage.createUser({
        username: email,
        password: hashPassword(password),
      });

      const authUser: AuthUser = {
        id: created.id,
        displayName: displayName || email.split("@")[0],
        email,
        role: "student",
      };

      req.logIn(authUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(201).json({ ok: true, user: authUser });
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      if (!localAuthEnabled) {
        return res.status(403).json({ message: "Email/password login is disabled." });
      }

      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await storage.getUserByUsername(email);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const authUser: AuthUser = {
        id: user.id,
        displayName: email.split("@")[0],
        email,
        role: "student",
      };

      req.logIn(authUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ ok: true, user: authUser });
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((logoutErr) => {
      if (logoutErr) {
        return next(logoutErr);
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          return next(sessionErr);
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ ok: true });
      });
    });
  });

  app.post("/api/auth/dev-login", (req, res, next) => {
    if (!demoAuthEnabled) {
      return res.status(403).json({ message: "Demo login disabled in production." });
    }

    const demoUser: AuthUser = {
      id: "dev-user",
      displayName: "Demo User",
      email: "demo@resumehub.local",
      role: "student",
    };

    req.logIn(demoUser, (err) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({ ok: true, user: demoUser });
    });
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: "rest-express",
    });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      // Minimal runtime dependency check.
      await storage.getUserByUsername("__healthcheck__");

      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: "not_ready",
        message: "Storage dependency check failed",
      });
    }
  });

  app.get("/api/jobs", async (req, res, next) => {
        try {
          const jobs = await storage.listJobPostings();
          const query = String(req.query.search || "").toLowerCase().trim();
          const role = String(req.query.role || "").toLowerCase().trim();
          const company = String(req.query.company || "").toLowerCase().trim();
          const location = String(req.query.location || "").toLowerCase().trim();
          const filtered = jobs.filter((job) => {
            const haystack = `${job.jobTitle} ${job.company} ${job.roleCategory} ${job.location}`.toLowerCase();
            return (!query || haystack.includes(query))
              && (!role || job.roleCategory.toLowerCase() === role)
              && (!company || job.company.toLowerCase().includes(company))
              && (!location || job.location.toLowerCase().includes(location));
          });

          return res.json(filtered.map((job) => ({ ...job, ...skillsFromJobDescription(job.jobDescription), representative: job.dataSource === "synthetic_representative" })));
        } catch (error) {
          return next(error);
        }
  });

  app.get("/api/platform/stats", async (_req, res) => {
    const jobs = await storage.listJobPostings();
    return res.json({
      postings: jobs.length,
      companies: new Set(jobs.map((job) => job.company)).size,
      roleFamilies: new Set(jobs.map((job) => job.roleCategory)).size,
    });
  });

  app.get("/api/jobs/:jobId", async (req, res, next) => {
        try {
          const job = await storage.getJobPosting(req.params.jobId);
          if (!job) return res.status(404).json({ message: "Job posting not found" });
          return res.json({ ...job, ...skillsFromJobDescription(job.jobDescription), representative: job.dataSource === "synthetic_representative" });
        } catch (error) {
          return next(error);
        }
  });

  app.get("/api/student/profile", async (req, res) => {
        if (!requireAuth(req, res)) return;
        return res.json(await storage.getStudentProfile(req.user!.id) || { userId: req.user!.id, data: {}, completionPercent: 0 });
  });

  app.put("/api/student/profile", async (req, res, next) => {
        try {
          if (!requireAuth(req, res)) return;
          if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({ message: "Profile data must be an object." });
          }
          const profile = await storage.saveStudentProfile(req.user!.id, req.body);
          return res.json(profile);
        } catch (error) {
          return next(error);
        }
  });

  app.get("/api/jobs/:jobId/analyze", async (req, res, next) => {
        try {
          if (!requireAuth(req, res)) return;
          const job = await storage.getJobPosting(req.params.jobId);
          if (!job) return res.status(404).json({ message: "Job posting not found" });
          const profile = await storage.getStudentProfile(req.user!.id);
          const resume = await storage.getLatestResume(req.user!.id);
          if (!resume) return res.status(409).json({ message: "Upload a resume before analyzing this job.", code: "RESUME_REQUIRED" });
          const report = buildAnalysis(job, resume, profile);
          if (!report) return res.status(422).json({ message: "Unable to analyze this resume." });
          const saved = await storage.saveAnalysisReport(req.user!.id, job.jobId, resume.id, report);
          return res.json({ id: saved.id, jobId: job.jobId, resumeId: resume.id, resumeName: resume.name, createdAt: saved.createdAt, ...report });
        } catch (error) {
          return next(error);
        }
  });

  app.get("/api/student/resume", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const resume = await storage.getLatestResume(req.user!.id);
    return res.json(resume ? { id: resume.id, name: resume.name, updatedAt: resume.updatedAt, extractedText: String((resume.data as Record<string, unknown>).extractedText || "") } : null);
  });

  app.get("/api/student/analyses", async (req, res) => {
    if (!requireAuth(req, res)) return;
    return res.json(await storage.getAnalysisHistory(req.user!.id));
  });

  app.get("/api/student/analyses/:id", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const report = await storage.getAnalysisReport(req.user!.id, req.params.id);
    if (!report) return res.status(404).json({ message: "Analysis report not found" });
    return res.json(report);
  });

  app.get("/api/student/analytics", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const resume = await storage.getLatestResume(req.user!.id);
    const history = await storage.getAnalysisHistory(req.user!.id);
    const latest = history[0];
    return res.json({
      hasResume: Boolean(resume),
      resumeName: resume?.name,
      latestAnalysis: latest ? { id: latest.id, jobId: latest.jobId, ...(latest.report as Record<string, unknown>) } : null,
      analyses: history.slice(0, 5).map((item) => ({ id: item.id, jobId: item.jobId, createdAt: item.createdAt, atsScore: (item.report as Record<string, unknown>).atsScore, skillMatchScore: (item.report as Record<string, unknown>).skillMatchScore })),
    });
  });

  app.get("/api/officer/summary", async (req, res) => {
        if (!requireOfficer(req, res)) return;
        const jobs = await storage.listJobPostings();
        return res.json({
          totalJobs: jobs.length,
          activeJobs: jobs.filter((job) => job.status === "active").length,
          companies: new Set(jobs.map((job) => job.company)).size,
          roleCategories: new Set(jobs.map((job) => job.roleCategory)).size,
          dataSource: "Data/job_postings_dataset.json",
        });
  });

  // ── Resume CRUD ──────────────────────────────────────────────────────────────
  app.get("/api/resumes", async (req, res) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
    const resumes = await storage.getResumesByUser(req.user!.id);
    return res.json(resumes);
  });

  app.post("/api/resumes", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
      const { name, data } = req.body as { name?: string; data: any };
      if (!data) return res.status(400).json({ message: "Resume data is required" });
      const resume = await storage.createResume({ userId: req.user!.id, name: name || "Untitled Resume", data });
      return res.status(201).json(resume);
    } catch (e) { return next(e); }
  });

  app.put("/api/resumes/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
      const { name, data } = req.body as { name?: string; data?: any };
      const updated = await storage.updateResume(req.params.id, req.user!.id, { name, data });
      if (!updated) return res.status(404).json({ message: "Resume not found" });
      return res.json(updated);
    } catch (e) { return next(e); }
  });

  app.delete("/api/resumes/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
      const ok = await storage.deleteResume(req.params.id, req.user!.id);
      if (!ok) return res.status(404).json({ message: "Resume not found" });
      return res.json({ ok: true });
    } catch (e) { return next(e); }
  });

  return httpServer;
}

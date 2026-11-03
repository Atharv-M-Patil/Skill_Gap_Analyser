import { type User, type InsertUser, type Resume, type InsertResume, type JobPosting, type StudentProfile, type AnalysisReport } from "@shared/schema";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

export type StudentProfileData = {
  personal?: { fullName?: string; phone?: string; studentId?: string };
  education?: { university?: string; degree?: string; branch?: string; graduationYear?: string; cgpa?: string; backlogs?: string };
  skills?: { programmingLanguages?: string[]; frameworks?: string[]; databases?: string[]; cloud?: string[]; tools?: string[]; other?: string[] };
  projects?: Array<{ title: string; description?: string; technologies?: string[]; githubUrl?: string }>;
  certifications?: Array<{ name: string; issuer?: string; skills?: string[] }>;
  internships?: Array<{ company: string; role?: string; responsibilities?: string; technologies?: string[] }>;
};

export type AnalysisReportData = {
  atsScore: number;
  skillMatchScore: number;
  matchedSkills: Array<{ skill: string; type: string; evidence: string; reason: string }>;
  partialSkills: Array<{ skill: string; type: string; evidence: string; reason: string }>;
  missingSkills: Array<{ skill: string; type: string; nextStep: string }>;
  keywordCoverage: number;
  keywordMatches: string[];
  missingKeywords: string[];
  eligibility: { degree: string; branch: string; experience: string };
  suggestions: string[];
  learningRecommendations: Array<{ skill: string; resource: string; url: string; project: string }>;
};

function loadJobDataset(): JobPosting[] {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "Data/job_postings_dataset.json"), "utf8")) as Array<Record<string, unknown>>;
  const seen = new Set<string>();
  return raw.flatMap((item) => {
    const jobId = typeof item.job_id === "string" ? item.job_id.trim() : "";
    if (!jobId || seen.has(jobId)) return [];
    seen.add(jobId);
    const now = new Date();
    return [{
      id: randomUUID(),
      jobId,
      roleCategory: String(item.role_category || ""),
      jobTitle: String(item.job_title || ""),
      company: String(item.company || ""),
      companyType: String(item.company_type || ""),
      location: String(item.location || ""),
      experienceLevel: String(item.experience_level || ""),
      minExpYears: Number(item.min_exp_years || 0),
      maxExpYears: Number(item.max_exp_years || 0),
      salaryRangeLpa: String(item.salary_range_lpa || ""),
      education: String(item.education || ""),
      responsibilities: String(item.responsibilities || ""),
      jobDescription: String(item.job_description || ""),
      dataSource: String(item.data_source || "unknown"),
      status: "active",
      createdAt: now,
      updatedAt: now,
    } satisfies JobPosting];
  });
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Resume CRUD
  getResume(id: string): Promise<Resume | undefined>;
  getResumesByUser(userId: string): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, userId: string, data: { name?: string; data?: any }): Promise<Resume | undefined>;
  deleteResume(id: string, userId: string): Promise<boolean>;
  listJobPostings(): Promise<JobPosting[]>;
  getJobPosting(jobId: string): Promise<JobPosting | undefined>;
  getStudentProfile(userId: string): Promise<StudentProfile | undefined>;
  saveStudentProfile(userId: string, data: StudentProfileData): Promise<StudentProfile>;
  getLatestResume(userId: string): Promise<Resume | undefined>;
  saveAnalysisReport(userId: string, jobId: string, resumeId: string, report: AnalysisReportData): Promise<AnalysisReport>;
  getAnalysisReport(userId: string, id: string): Promise<AnalysisReport | undefined>;
  getAnalysisHistory(userId: string): Promise<AnalysisReport[]>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private resumes = new Map<string, Resume>();
  private jobs = new Map<string, JobPosting>(loadJobDataset().map((job) => [job.jobId, job]));
  private profiles = new Map<string, StudentProfile>();
  private reports = new Map<string, AnalysisReport>();

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getResume(id: string) { return this.resumes.get(id); }
  async getResumesByUser(userId: string) {
    return Array.from(this.resumes.values()).filter(r => r.userId === userId);
  }
  async createResume(insert: InsertResume): Promise<Resume> {
    const id = randomUUID();
    const now = new Date();
    const resume: Resume = { id, userId: insert.userId, name: insert.name ?? "Untitled Resume", data: insert.data, createdAt: now, updatedAt: now };
    this.resumes.set(id, resume);
    return resume;
  }
  async updateResume(id: string, userId: string, patch: { name?: string; data?: any }) {
    const existing = this.resumes.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    const updated: Resume = { ...existing, ...patch, updatedAt: new Date() };
    this.resumes.set(id, updated);
    return updated;
  }
  async deleteResume(id: string, userId: string) {
    const existing = this.resumes.get(id);
    if (!existing || existing.userId !== userId) return false;
    this.resumes.delete(id);
    return true;
  }

  async listJobPostings() { return Array.from(this.jobs.values()); }
  async getJobPosting(jobId: string) { return this.jobs.get(jobId); }
  async getStudentProfile(userId: string) { return this.profiles.get(userId); }
  async saveStudentProfile(userId: string, data: StudentProfileData) {
    const existing = this.profiles.get(userId);
    const sections = [data.personal, data.education, data.skills, data.projects?.length ? data.projects : undefined, data.certifications?.length ? data.certifications : undefined, data.internships?.length ? data.internships : undefined];
    const completionPercent = Math.round((sections.filter(Boolean).length / sections.length) * 100);
    const profile: StudentProfile = {
      id: existing?.id || randomUUID(),
      userId,
      data,
      completionPercent,
      updatedAt: new Date(),
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  async getLatestResume(userId: string) {
    return Array.from(this.resumes.values()).filter((resume) => resume.userId === userId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  }
  async saveAnalysisReport(userId: string, jobId: string, resumeId: string, report: AnalysisReportData) {
    const saved: AnalysisReport = { id: randomUUID(), userId, jobId, resumeId, report, createdAt: new Date() };
    this.reports.set(saved.id, saved);
    return saved;
  }
  async getAnalysisReport(userId: string, id: string) {
    const report = this.reports.get(id);
    return report?.userId === userId ? report : undefined;
  }
  async getAnalysisHistory(userId: string) {
    return Array.from(this.reports.values()).filter((report) => report.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();

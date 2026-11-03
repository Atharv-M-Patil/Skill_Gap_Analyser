import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled Resume"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().unique(),
  roleCategory: text("role_category").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  companyType: text("company_type").notNull(),
  location: text("location").notNull(),
  experienceLevel: text("experience_level").notNull(),
  minExpYears: integer("min_exp_years").notNull(),
  maxExpYears: integer("max_exp_years").notNull(),
  salaryRangeLpa: text("salary_range_lpa").notNull(),
  education: text("education").notNull(),
  responsibilities: text("responsibilities").notNull(),
  jobDescription: text("job_description").notNull(),
  dataSource: text("data_source").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobRequiredSkills = pgTable("job_required_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobPostingId: varchar("job_posting_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  normalizedSkillName: text("normalized_skill_name").notNull(),
  skillType: text("skill_type").notNull(),
});

export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  completionPercent: integer("completion_percent").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analysisReports = pgTable("analysis_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobPostings.jobId, { onDelete: "cascade" }),
  resumeId: varchar("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  report: jsonb("report").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertResumeSchema = createInsertSchema(resumes).pick({ userId: true, name: true, data: true });

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type JobRequiredSkill = typeof jobRequiredSkills.$inferSelect;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type AnalysisReport = typeof analysisReports.$inferSelect;

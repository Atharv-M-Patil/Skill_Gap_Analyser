import { type User, type InsertUser, type Resume, type InsertResume } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private resumes = new Map<string, Resume>();

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
}

export const storage = new MemStorage();

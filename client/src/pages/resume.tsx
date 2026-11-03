import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { apiRequest } from "@/lib/queryClient";
import { extractTextFromFile } from "@/lib/pdf-reader";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

type Resume = { id: string; name: string; updatedAt: string; extractedText: string };

export default function ResumePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: resume, isLoading } = useQuery<Resume | null>({ queryKey: ["/api/student/resume"], retry: false, enabled: isAuthenticated });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText) throw new Error("No readable text was found in this file.");
      return apiRequest("POST", "/api/resumes", { name: file.name, data: { fileName: file.name, fileType: file.type, extractedText, uploadedAt: new Date().toISOString() } });
    },
    onSuccess: () => { setMessage("Resume saved. You can now analyze it against any job."); void client.invalidateQueries({ queryKey: ["/api/student/resume"] }); void client.invalidateQueries({ queryKey: ["/api/student/analytics"] }); },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Resume upload failed.";
      if (message.startsWith("401:")) {
        setLocation("/login?next=%2Fresume");
        return;
      }
      setMessage(message);
    },
  });
  return <div className="page-shell"><Navbar /><main className="page-content max-w-4xl"><p className="eyebrow">My resume</p><h1 className="mt-3 text-4xl">One upload. Every opportunity.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Upload your PDF or DOCX once. ResumeHub extracts searchable evidence and reuses the saved version for every personalized job analysis.</p>
    <section className="glass mt-8 rounded-2xl p-7"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck /></div><div><h2 className="text-xl">Your resume vault</h2><p className="mt-2 text-sm text-muted-foreground">Your resume belongs to your authenticated account and is never shared with other students.</p></div></div>{authLoading || isLoading ? <p className="mt-8 text-muted-foreground">Checking your account...</p> : !isAuthenticated ? <div className="mt-8 rounded-xl border border-amber-300/20 bg-amber-300/5 p-7"><h3 className="text-lg text-amber-200">Sign in to upload your resume</h3><p className="mt-2 text-sm text-muted-foreground">Your resume is saved privately to your student account and reused for every job analysis.</p><a href="/login?next=%2Fresume" className="btn-primary mt-5">Sign in to continue</a></div> : resume ? <div className="mt-8 flex flex-col justify-between gap-5 rounded-xl border border-primary/20 bg-primary/[0.05] p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><FileCheck2 className="h-6 w-6 text-primary" /><div><p className="font-semibold">{resume.name}</p><p className="mt-1 text-xs text-muted-foreground">Saved {new Date(resume.updatedAt).toLocaleString()} · {resume.extractedText.length.toLocaleString()} characters extracted</p></div></div><button onClick={() => inputRef.current?.click()} className="btn-secondary">Replace resume</button></div> : <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center"><FileUp className="mx-auto h-8 w-8 text-primary" /><h3 className="mt-3">No resume uploaded yet</h3><p className="mt-2 text-sm text-muted-foreground">Upload a PDF or DOCX to unlock personalized analysis.</p><button onClick={() => inputRef.current?.click()} className="btn-primary mt-5">Choose resume</button></div>}<input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); }} />{upload.isPending && <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Extracting and saving your resume...</p>}{message && <p className={`mt-5 text-sm ${message.includes("saved") ? "text-emerald-400" : "text-destructive"}`}>{message}</p>}</section>
  </main></div>;
}

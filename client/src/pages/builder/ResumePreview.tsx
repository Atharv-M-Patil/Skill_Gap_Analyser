import type { ResumeData } from "./index";

function buls(text: string) {
  return text.split("\n").map(l => l.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean);
}
function skillList(text: string) {
  return text.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

export function ResumePreview({ data }: { data: ResumeData }) {
  const { template } = data;
  if (template === "executive") return <ExecutiveTemplate data={data} />;
  if (template === "academic")  return <AcademicTemplate data={data} />;
  if (template === "twocol")    return <TwoColTemplate data={data} />;
  if (template === "clean")     return <CleanTemplate data={data} />;
  if (template === "modern")    return <ModernTemplate data={data} />;
  return <ModernTemplate data={data} />;
}

/* ── Clickable contact link helper ──────────────────────────────────────────
   email     → mailto:
   linkedin  → https://linkedin.com/...
   github    → https://github.com/...
   phone     → tel:
   anything else → plain text
*/
function contactHref(value: string): string | null {
  if (!value) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/linkedin\.com/i.test(value)) {
    const clean = value.replace(/^https?:\/\//i, "");
    return `https://${clean}`;
  }
  if (/github\.com/i.test(value)) {
    const clean = value.replace(/^https?:\/\//i, "");
    return `https://${clean}`;
  }
  if (/^[+\d\s\-().]{7,}$/.test(value)) return `tel:${value.replace(/\s/g, "")}`;
  return null;
}

function ContactItem({ value, style }: { value: string; style?: React.CSSProperties }) {
  const href = contactHref(value);
  const base: React.CSSProperties = { color: "inherit", textDecoration: "none", ...style };
  if (href) {
    return (
      <a href={href} target={href.startsWith("mailto:") || href.startsWith("tel:") ? "_self" : "_blank"} rel="noopener noreferrer" style={{ ...base, textDecoration: "underline", textDecorationColor: "rgba(0,0,0,0.25)", cursor: "pointer" }}>
        {value}
      </a>
    );
  }
  return <span style={base}>{value}</span>;
}

/* shared helpers */

/* ─── 1. MODERN ──────────────────────────────────────────────────────── */
function ModernTemplate({ data }: { data: ResumeData }) {
  const { personalInfo: p, experiences, projects, education } = data;
  return (
    <div style={{ fontFamily:"Arial,sans-serif", fontSize:"10px", color:"#1a1a1a", background:"#fff", padding:"28px 34px", minHeight:"297mm", lineHeight:1.5 }}>
      <div style={{ borderBottom:"2.5px solid #6d28d9", paddingBottom:"10px", marginBottom:"12px" }}>
        <div style={{ fontSize:"21px", fontWeight:700, color:"#6d28d9" }}>{p.name||"Your Name"}</div>
        {p.headline && <div style={{ fontSize:"10px", color:"#555", marginTop:"2px" }}>{p.headline}</div>}
        <div style={{ fontSize:"8.5px", color:"#444", marginTop:"5px", display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).map((c,i) => (
            <ContactItem key={i} value={c} />
          ))}
        </div>
      </div>
      {p.summary && <MS title="Summary"><p style={{margin:0,color:"#333",fontSize:"9px"}}>{p.summary}</p></MS>}
      {p.skills && <MS title="Technical Skills"><p style={{margin:0,color:"#333",fontSize:"9px"}}>{skillList(p.skills).join("  •  ")}</p></MS>}
      {experiences.some(e=>e.title||e.company) && <MS title="Experience">{experiences.filter(e=>e.title||e.company).map((exp,i)=>(
        <div key={i} style={{marginBottom:"9px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{exp.title}</b><span style={{fontSize:"8.5px",color:"#666"}}>{exp.duration}</span></div>
          <div style={{color:"#6d28d9",fontSize:"8.5px",marginBottom:"2px"}}>{exp.company}</div>
          {buls(exp.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",color:"#333",fontSize:"9px",marginBottom:"1px"}}>• {b}</div>)}
        </div>
      ))}</MS>}
      {projects.some(pr=>pr.title) && <MS title="Projects">{projects.filter(pr=>pr.title).map((proj,i)=>(
        <div key={i} style={{marginBottom:"9px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{proj.title}</b><span style={{color:"#6d28d9",fontSize:"8.5px"}}>{proj.technologies}</span></div>
          {buls(proj.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",color:"#333",fontSize:"9px",marginBottom:"1px"}}>• {b}</div>)}
        </div>
      ))}</MS>}
      {education.some(e=>e.school) && <MS title="Education">{education.filter(e=>e.school).map((edu,i)=>(
        <div key={i} style={{marginBottom:"7px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{edu.school}</b><span style={{fontSize:"8.5px",color:"#666"}}>{edu.year}</span></div>
          <div style={{color:"#555",fontSize:"8.5px"}}>{edu.degree}{edu.score?` | ${edu.score}`:""}</div>
        </div>
      ))}</MS>}
      {p.achievements && <MS title="Achievements">{buls(p.achievements).map((b,i)=><div key={i} style={{paddingLeft:"10px",color:"#333",fontSize:"9px",marginBottom:"1px"}}>• {b}</div>)}</MS>}
      {p.certifications && <MS title="Certifications">{buls(p.certifications).map((b,i)=><div key={i} style={{paddingLeft:"10px",color:"#333",fontSize:"9px",marginBottom:"1px"}}>• {b}</div>)}</MS>}
    </div>
  );
}
function MS({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"11px"}}><div style={{fontSize:"9px",fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:"1px solid #ede9fe",paddingBottom:"2px",marginBottom:"5px"}}>{title}</div>{children}</div>;
}

/* ─── 2. EXECUTIVE ───────────────────────────────────────────────────── */
function ExecutiveTemplate({ data }: { data: ResumeData }) {
  const { personalInfo: p, experiences, projects, education } = data;
  return (
    <div style={{ fontFamily:"Arial,sans-serif", fontSize:"10px", color:"#1a1a1a", background:"#fff", minHeight:"297mm", lineHeight:1.5 }}>
      <div style={{ background:"#1e293b", color:"#fff", padding:"22px 34px 18px" }}>
        <div style={{ fontSize:"21px", fontWeight:700 }}>{p.name||"Your Name"}</div>
        {p.headline && <div style={{ fontSize:"9.5px", color:"#94a3b8", marginTop:"2px" }}>{p.headline}</div>}
        <div style={{ fontSize:"8.5px", color:"#cbd5e1", marginTop:"6px", display:"flex", flexWrap:"wrap", gap:"12px" }}>
          {[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).map((c,i) => (
            <ContactItem key={i} value={c} style={{ color:"#cbd5e1" }} />
          ))}
        </div>
      </div>
      <div style={{ padding:"18px 34px" }}>
        {p.summary && <ES title="Executive Summary"><p style={{margin:0,color:"#334155",fontSize:"9px"}}>{p.summary}</p></ES>}
        {p.skills && <ES title="Core Competencies"><p style={{margin:0,color:"#334155",fontSize:"9px"}}>{skillList(p.skills).join("  •  ")}</p></ES>}
        {experiences.some(e=>e.title||e.company) && <ES title="Professional Experience">{experiences.filter(e=>e.title||e.company).map((exp,i)=>(
          <div key={i} style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #e2e8f0",paddingBottom:"2px",marginBottom:"3px"}}><b style={{color:"#1e293b",fontSize:"9.5px"}}>{exp.title}</b><span style={{color:"#64748b",fontSize:"8.5px"}}>{exp.duration}</span></div>
            <div style={{color:"#475569",fontSize:"8.5px",fontStyle:"italic",marginBottom:"3px"}}>{exp.company}</div>
            {buls(exp.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",color:"#334155",fontSize:"9px",marginBottom:"1px"}}>▸ {b}</div>)}
          </div>
        ))}</ES>}
        {projects.some(pr=>pr.title) && <ES title="Key Projects">{projects.filter(pr=>pr.title).map((proj,i)=>(
          <div key={i} style={{marginBottom:"9px"}}>
            <b style={{color:"#1e293b",fontSize:"9.5px"}}>{proj.title}</b>{proj.technologies&&<span style={{color:"#64748b",fontSize:"8.5px"}}> | {proj.technologies}</span>}
            {buls(proj.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",color:"#334155",fontSize:"9px",marginBottom:"1px"}}>▸ {b}</div>)}
          </div>
        ))}</ES>}
        {education.some(e=>e.school) && <ES title="Education">{education.filter(e=>e.school).map((edu,i)=>(
          <div key={i} style={{marginBottom:"7px"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><b style={{color:"#1e293b",fontSize:"9.5px"}}>{edu.school}</b><span style={{color:"#64748b",fontSize:"8.5px"}}>{edu.year}</span></div>
            <div style={{color:"#475569",fontSize:"8.5px"}}>{edu.degree}{edu.score?` | ${edu.score}`:""}</div>
          </div>
        ))}</ES>}
        {p.achievements && <ES title="Achievements">{buls(p.achievements).map((b,i)=><div key={i} style={{paddingLeft:"10px",color:"#334155",fontSize:"9px",marginBottom:"1px"}}>▸ {b}</div>)}</ES>}
        {p.certifications && <ES title="Certifications">{buls(p.certifications).map((b,i)=><div key={i} style={{paddingLeft:"10px",color:"#334155",fontSize:"9px",marginBottom:"1px"}}>▸ {b}</div>)}</ES>}
      </div>
    </div>
  );
}
function ES({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"12px"}}><div style={{fontSize:"9px",fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.8px",background:"#f8fafc",padding:"2px 6px",marginBottom:"5px",borderLeft:"3px solid #1e293b"}}>{title}</div>{children}</div>;
}

/* ─── 3. ACADEMIC ────────────────────────────────────────────────────── */
function AcademicTemplate({ data }: { data: ResumeData }) {
  const { personalInfo: p, experiences, projects, education } = data;
  return (
    <div style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:"10px", color:"#111", background:"#fff", padding:"28px 40px", minHeight:"297mm", lineHeight:1.55 }}>
      <div style={{ textAlign:"center", marginBottom:"8px" }}>
        <div style={{ fontSize:"22px", fontWeight:700, letterSpacing:"1px" }}>{p.name||"Your Name"}</div>
        {p.headline && <div style={{ fontSize:"10px", color:"#444", marginTop:"2px", fontStyle:"italic" }}>{p.headline}</div>}
        <div style={{ fontSize:"8.5px", color:"#333", marginTop:"5px", display:"flex", justifyContent:"center", flexWrap:"wrap", gap:"10px" }}>
          {[p.phone, p.email, p.linkedin, p.github, p.location].filter(Boolean).map((c,i) => (
            <ContactItem key={i} value={c} />
          ))}
        </div>
      </div>
      {education.some(e=>e.school) && <AS title="Education">{education.filter(e=>e.school).map((edu,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
          <div><b style={{fontSize:"10px"}}>{edu.school}</b><div style={{fontStyle:"italic",fontSize:"9px",color:"#333"}}>{edu.degree}{edu.score?`, CGPA: ${edu.score}`:""}</div></div>
          <div style={{textAlign:"right",fontSize:"9px",color:"#333"}}><div>{p.location||""}</div><div>{edu.year}</div></div>
        </div>
      ))}</AS>}
      {experiences.some(e=>e.title||e.company) && <AS title="Experience">{experiences.filter(e=>e.title||e.company).map((exp,i)=>(
        <div key={i} style={{marginBottom:"8px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"10px"}}>{exp.title}</b><span style={{fontSize:"9px",color:"#333"}}>{exp.duration}</span></div>
          <div style={{fontStyle:"italic",fontSize:"9px",color:"#333",marginBottom:"2px"}}>{exp.company}</div>
          {buls(exp.description).map((b,j)=><div key={j} style={{paddingLeft:"12px",fontSize:"9px",marginBottom:"2px"}}>• {b}</div>)}
        </div>
      ))}</AS>}
      {projects.some(pr=>pr.title) && <AS title="Projects">{projects.filter(pr=>pr.title).map((proj,i)=>(
        <div key={i} style={{marginBottom:"8px"}}>
          <span style={{fontWeight:700,fontSize:"10px",textDecoration:"underline"}}>{proj.title}</span>
          {proj.technologies&&<span style={{fontStyle:"italic",fontSize:"9px",color:"#333"}}> | {proj.technologies}</span>}
          {buls(proj.description).map((b,j)=><div key={j} style={{paddingLeft:"12px",fontSize:"9px",marginBottom:"2px"}}>• {b}</div>)}
        </div>
      ))}</AS>}
      {p.achievements && <AS title="Achievements">{buls(p.achievements).map((b,i)=><div key={i} style={{paddingLeft:"12px",fontSize:"9px",marginBottom:"2px"}}>• {b}</div>)}</AS>}
      {p.skills && <AS title="Technical Skills">
        <div style={{fontSize:"9px"}}><b>Languages &amp; Tools: </b>{skillList(p.skills).join(", ")}</div>
        {p.certifications&&<div style={{fontSize:"9px",marginTop:"3px"}}><b>Certifications: </b>{buls(p.certifications).map(b=>b).join(", ")}</div>}
      </AS>}
    </div>
  );
}
function AS({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"10px"}}><div style={{fontSize:"11px",fontWeight:700,fontVariant:"small-caps",borderBottom:"1px solid #111",paddingBottom:"1px",marginBottom:"5px",marginTop:"10px"}}>{title}</div>{children}</div>;
}

/* ─── 4. TWO-COLUMN (Purple sidebar like Korina template) ────────────── */
function TwoColTemplate({ data }: { data: ResumeData }) {
  const { personalInfo: p, experiences, projects, education } = data;
  return (
    <div style={{ fontFamily:"Arial,sans-serif", fontSize:"9.5px", color:"#1a1a1a", background:"#fff", minHeight:"297mm", lineHeight:1.5, display:"flex", flexDirection:"column" }}>
      {/* Top header bar */}
      <div style={{ background:"#4a1a6b", color:"#fff", padding:"20px 28px 16px" }}>
        <div style={{ fontSize:"22px", fontWeight:700, letterSpacing:"0.5px" }}>{p.name||"Your Name"}</div>
        {p.headline && <div style={{ fontSize:"9.5px", color:"#e2c4f5", marginTop:"2px", letterSpacing:"1.5px", textTransform:"uppercase" }}>{p.headline}</div>}
      </div>
      {/* Two column body */}
      <div style={{ display:"flex", flex:1 }}>
        {/* Left sidebar */}
        <div style={{ width:"36%", background:"#f5f0fa", padding:"18px 16px", borderRight:"1px solid #e8dff5" }}>
          <SB title="Contact">
            {p.phone&&<div style={{fontSize:"8.5px",marginBottom:"3px"}}><ContactItem value={p.phone} /></div>}
            {p.email&&<div style={{fontSize:"8.5px",marginBottom:"3px"}}><ContactItem value={p.email} /></div>}
            {p.location&&<div style={{fontSize:"8.5px",marginBottom:"3px"}}>{p.location}</div>}
            {p.linkedin&&<div style={{fontSize:"8.5px",marginBottom:"3px"}}><ContactItem value={p.linkedin} /></div>}
            {p.github&&<div style={{fontSize:"8.5px",marginBottom:"3px"}}><ContactItem value={p.github} /></div>}
          </SB>
          {p.skills && <SB title="Tech Skills">{skillList(p.skills).map((s,i)=><div key={i} style={{fontSize:"8.5px",paddingLeft:"6px",marginBottom:"2px"}}>• {s}</div>)}</SB>}
          {p.achievements && <SB title="Achievements">{buls(p.achievements).map((b,i)=><div key={i} style={{fontSize:"8.5px",paddingLeft:"6px",marginBottom:"3px",lineHeight:1.4}}>• {b}</div>)}</SB>}
          {p.certifications && <SB title="Certifications">{buls(p.certifications).map((b,i)=><div key={i} style={{fontSize:"8.5px",paddingLeft:"6px",marginBottom:"2px"}}>• {b}</div>)}</SB>}
        </div>
        {/* Right main */}
        <div style={{ flex:1, padding:"18px 20px" }}>
          {p.summary && <MB title="Profile"><p style={{margin:0,color:"#333",fontSize:"9px",textAlign:"justify"}}>{p.summary}</p></MB>}
          {education.some(e=>e.school) && <MB title="Education">{education.filter(e=>e.school).map((edu,i)=>(
            <div key={i} style={{marginBottom:"8px"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{edu.school}</b><span style={{fontSize:"8.5px",color:"#666"}}>{edu.year}</span></div>
              <div style={{fontSize:"8.5px",color:"#555",fontStyle:"italic"}}>{edu.degree}{edu.score?` | GPA: ${edu.score}`:""}</div>
            </div>
          ))}</MB>}
          {experiences.some(e=>e.title||e.company) && <MB title="Experience">{experiences.filter(e=>e.title||e.company).map((exp,i)=>(
            <div key={i} style={{marginBottom:"9px"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{exp.title}</b><span style={{fontSize:"8.5px",color:"#666"}}>{exp.duration}</span></div>
              <div style={{fontSize:"8.5px",color:"#4a1a6b",fontStyle:"italic",marginBottom:"2px"}}>{exp.company}</div>
              {buls(exp.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}
            </div>
          ))}</MB>}
          {projects.some(pr=>pr.title) && <MB title="Projects">{projects.filter(pr=>pr.title).map((proj,i)=>(
            <div key={i} style={{marginBottom:"9px"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{proj.title}</b><span style={{fontSize:"8.5px",color:"#4a1a6b"}}>{proj.technologies}</span></div>
              {buls(proj.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}
            </div>
          ))}</MB>}
        </div>
      </div>
    </div>
  );
}
function SB({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"14px"}}><div style={{fontSize:"9px",fontWeight:700,color:"#4a1a6b",textTransform:"uppercase",letterSpacing:"1px",borderBottom:"1.5px solid #4a1a6b",paddingBottom:"2px",marginBottom:"6px"}}>{title}</div>{children}</div>;
}
function MB({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"12px"}}><div style={{fontSize:"9px",fontWeight:700,color:"#4a1a6b",textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:"1.5px solid #4a1a6b",paddingBottom:"2px",marginBottom:"6px"}}>{title}</div>{children}</div>;
}

/* ─── 5. CLEAN PROFESSIONAL ──────────────────────────────────────────── */
function CleanTemplate({ data }: { data: ResumeData }) {
  const { personalInfo: p, experiences, projects, education } = data;
  return (
    <div style={{ fontFamily:"'Helvetica Neue',Arial,sans-serif", fontSize:"9.5px", color:"#1a1a1a", background:"#fff", padding:"28px 34px", minHeight:"297mm", lineHeight:1.55 }}>
      <div style={{ marginBottom:"14px" }}>
        <div style={{ fontSize:"22px", fontWeight:700, color:"#111", letterSpacing:"-0.5px" }}>{p.name||"Your Name"}</div>
        {p.headline && <div style={{ fontSize:"10px", color:"#555", marginTop:"2px" }}>{p.headline}</div>}
        <div style={{ fontSize:"8.5px", color:"#555", marginTop:"5px", borderTop:"1px solid #ddd", paddingTop:"5px", display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).map((c,i) => (
            <ContactItem key={i} value={c} />
          ))}
        </div>
      </div>
      {p.summary && <CL title="Profile"><p style={{margin:0,color:"#333",fontSize:"9px"}}>{p.summary}</p></CL>}
      {p.skills && <CL title="Skills"><p style={{margin:0,color:"#333",fontSize:"9px"}}>{skillList(p.skills).join("  •  ")}</p></CL>}
      {experiences.some(e=>e.title||e.company) && <CL title="Experience">{experiences.filter(e=>e.title||e.company).map((exp,i)=>(
        <div key={i} style={{marginBottom:"9px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><b style={{fontSize:"9.5px"}}>{exp.title}</b><span style={{fontSize:"8.5px",color:"#666"}}>{exp.duration}</span></div>
          <div style={{fontSize:"8.5px",color:"#555",marginBottom:"2px"}}>{exp.company}</div>
          {buls(exp.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}
        </div>
      ))}</CL>}
      {projects.some(pr=>pr.title) && <CL title="Projects">{projects.filter(pr=>pr.title).map((proj,i)=>(
        <div key={i} style={{marginBottom:"9px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><b style={{fontSize:"9.5px"}}>{proj.title}</b><span style={{fontSize:"8.5px",color:"#555"}}>{proj.technologies}</span></div>
          {buls(proj.description).map((b,j)=><div key={j} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}
        </div>
      ))}</CL>}
      {education.some(e=>e.school) && <CL title="Education">{education.filter(e=>e.school).map((edu,i)=>(
        <div key={i} style={{marginBottom:"7px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:"9.5px"}}>{edu.school}</b><span style={{fontSize:"8.5px",color:"#666"}}>{edu.year}</span></div>
          <div style={{fontSize:"8.5px",color:"#555"}}>{edu.degree}{edu.score?` | ${edu.score}`:""}</div>
        </div>
      ))}</CL>}
      {p.achievements && <CL title="Achievements">{buls(p.achievements).map((b,i)=><div key={i} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}</CL>}
      {p.certifications && <CL title="Certifications">{buls(p.certifications).map((b,i)=><div key={i} style={{paddingLeft:"10px",fontSize:"9px",color:"#333",marginBottom:"1px"}}>• {b}</div>)}</CL>}
    </div>
  );
}
function CL({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"11px"}}><div style={{fontSize:"9px",fontWeight:700,color:"#111",textTransform:"uppercase",letterSpacing:"1px",borderLeft:"3px solid #111",paddingLeft:"6px",marginBottom:"5px"}}>{title}</div>{children}</div>;
}
/**
 * Shared PDF/DOCX text extraction — pdfjs-dist v5
 * Uses CDN worker with exact installed version to avoid mismatch errors.
 */

let initialized = false;

async function initPdfjs() {
  const lib = await import("pdfjs-dist");
  if (!initialized) {
    // Exact version CDN — avoids the new URL() Vite resolution issues
    lib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.mjs`;
    initialized = true;
  }
  return lib;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const lib = await initPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await lib.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Group by Y to preserve reading order (top→bottom, left→right)
      const rows = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items as any[]) {
        const str: string = item.str ?? "";
        if (!str.trim()) continue;
        const y = Math.round((item.transform?.[5] ?? 0) / 2) * 2;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y)!.push({ x: item.transform?.[4] ?? 0, str });
      }

      const pageText = Array.from(rows.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(" "))
        .join("\n");

      pages.push(pageText);
    }
    return pages.join("\n").trim();
  } catch (err) {
    console.error("PDF extraction failed:", err);
    return "";
  }
}

export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value?.trim() ?? "";
  } catch (err) {
    console.error("DOCX extraction failed:", err);
    return "";
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return extractTextFromPDF(file);
  if (ext === "docx" || ext === "doc") return extractTextFromDOCX(file);
  try { return (await file.text()).trim(); } catch { return ""; }
}

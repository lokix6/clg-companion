// Client-side extractor for files uploaded to AI Assistant / Summarizer.
// - Images → base64 (kind: "image")
// - PDF    → base64 (kind: "pdf")
// - DOCX / PPTX / XLSX / CSV / TXT → plain text (kind: "text")
import mammoth from "mammoth";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export type ExtractedFile = {
  name: string;
  mime: string;
  size: number;
  kind: "image" | "pdf" | "text";
  base64?: string;
  text?: string;
};

const IMG = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export const ACCEPTED_MIME =
  "image/png,image/jpeg,image/webp," +
  "application/pdf," +
  "text/plain,text/csv," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const ACCEPTED_EXT = ".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.docx,.pptx,.xlsx";

async function toBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function extractPptxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort();
  const chunks: string[] = [];
  for (const name of slides) {
    const xml = await zip.files[name].async("string");
    const text = xml
      .replace(/<a:t[^>]*>/g, "")
      .replace(/<\/a:t>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n\n");
}

function extractXlsxText(buf: ArrayBuffer): string {
  const wb = XLSX.read(buf, { type: "array" });
  const parts: string[] = [];
  for (const sn of wb.SheetNames) {
    const sheet = wb.Sheets[sn];
    parts.push(`## Sheet: ${sn}\n${XLSX.utils.sheet_to_csv(sheet)}`);
  }
  return parts.join("\n\n");
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  if (file.size > MAX_SIZE) throw new Error(`${file.name}: file exceeds 20MB limit.`);
  const mime = file.type || "application/octet-stream";
  const name = file.name;
  const size = file.size;

  if (IMG.includes(mime)) {
    return { name, mime, size, kind: "image", base64: await toBase64(file) };
  }
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return { name, mime: "application/pdf", size, kind: "pdf", base64: await toBase64(file) };
  }
  if (mime === "text/plain" || mime === "text/csv" || /\.(txt|csv|md)$/i.test(name)) {
    return { name, mime, size, kind: "text", text: await file.text() };
  }
  if (name.toLowerCase().endsWith(".docx") || mime.includes("wordprocessingml")) {
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { name, mime, size, kind: "text", text: value };
  }
  if (name.toLowerCase().endsWith(".pptx") || mime.includes("presentationml")) {
    return { name, mime, size, kind: "text", text: await extractPptxText(file) };
  }
  if (name.toLowerCase().endsWith(".xlsx") || mime.includes("spreadsheetml")) {
    return { name, mime, size, kind: "text", text: extractXlsxText(await file.arrayBuffer()) };
  }
  throw new Error(`${name}: unsupported file type.`);
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { aiSummarizeNote } from "@/lib/ai.functions";
import { ACCEPTED_EXT, extractFile, formatSize, type ExtractedFile } from "@/lib/ai/file-extract";

export const Route = createFileRoute("/_authenticated/dashboard/summarizer")({
  head: () => ({
    meta: [
      { title: "AI Notes Summarizer — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Summary = {
  summary?: string;
  key_points?: string[];
  definitions?: { term: string; meaning: string }[];
  formulas?: { name: string; expression: string }[];
  exam_tips?: string[];
  learning_objectives?: string[];
};

function Page() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<ExtractedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fn = useServerFn(aiSummarizeNote);

  const loadFile = async (f: File) => {
    setBusy(true);
    try {
      const ex = await extractFile(f);
      if (ex.kind === "image") {
        toast.error("Summarizer needs a document. Upload a PDF, DOCX, PPTX, XLSX, CSV, or TXT file.");
        return;
      }
      if (ex.kind === "text" && !ex.text?.trim()) {
        toast.error("No readable text found in that file.");
        return;
      }
      setFile(ex);
      if (!title) setTitle(ex.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isPdf = file?.kind === "pdf";
  const fileText = file?.kind === "text" ? (file.text ?? "").trim() : "";
  const canRun = isPdf || fileText.length >= 20 || text.trim().length >= 20;

  const combinedText = [fileText, text.trim()].filter(Boolean).join("\n\n---\n\n");

  const run = useMutation({
    mutationFn: () =>
      fn({
        data: {
          text: combinedText ? combinedText : undefined,
          title: title || undefined,
          ...(isPdf && file?.base64
            ? { pdf: { filename: file.name, base64: file.base64 } }
            : {}),
        },
      }),
    onSuccess: (r) => setResult(r.summary as Summary),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Notes Summarizer"
        description="Upload notes (PDF, DOCX, PPTX, XLSX, CSV or TXT) or paste text to get an instant summary."
      />


      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={`rounded-xl border bg-card p-5 space-y-3 ${dragOver ? "ring-2 ring-primary" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void loadFile(f);
          }}
        >
          <Input
            placeholder="Optional note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 mr-2" />
              )}
              Upload file
            </Button>
            <span className="text-xs text-muted-foreground">or drag & drop, or paste text below</span>
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatSize(file.size)} ·{" "}
                  {file.kind === "pdf"
                    ? "PDF — sent to AI for summarization"
                    : `${(file.text ?? "").length} chars extracted`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setText("");
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Textarea
            placeholder={file ? "Optional extra context for the uploaded file…" : "Paste your notes here…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
          />

          <Button
            className="w-full"
            onClick={() => run.mutate()}
            disabled={run.isPending || !canRun}
          >
            {run.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Summarizing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Summarize
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-5">
          {!result && (
            <div className="text-sm text-muted-foreground text-center py-16">
              Your AI-generated summary will appear here.
            </div>
          )}
          {result && (
            <div className="space-y-5 text-sm">
              {result.summary && (
                <Section title="Summary"><p>{result.summary}</p></Section>
              )}
              {result.key_points?.length ? (
                <Section title="Key Points">
                  <ul className="list-disc pl-5 space-y-1">
                    {result.key_points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              ) : null}
              {result.definitions?.length ? (
                <Section title="Definitions">
                  <dl className="space-y-2">
                    {result.definitions.map((d, i) => (
                      <div key={i}>
                        <dt className="font-semibold">{d.term}</dt>
                        <dd className="text-muted-foreground">{d.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ) : null}
              {result.formulas?.length ? (
                <Section title="Formulas">
                  <ul className="space-y-1">
                    {result.formulas.map((f, i) => (
                      <li key={i}>
                        <span className="font-semibold">{f.name}:</span> <code>{f.expression}</code>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {result.exam_tips?.length ? (
                <Section title="Exam Tips">
                  <ul className="list-disc pl-5 space-y-1">
                    {result.exam_tips.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              ) : null}
              {result.learning_objectives?.length ? (
                <Section title="Learning Objectives">
                  <ul className="list-disc pl-5 space-y-1">
                    {result.learning_objectives.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

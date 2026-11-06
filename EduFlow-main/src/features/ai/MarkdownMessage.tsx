import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYWORDS =
  "abstract|and|as|assert|async|await|базов|bool|break|by|case|catch|char|class|const|constexpr|continue|def|default|del|delete|do|double|elif|else|enum|except|export|extends|extern|False|final|finally|float|for|from|func|function|global|go|if|impl|implements|import|in|include|instanceof|int|interface|is|lambda|let|long|match|mut|namespace|new|nil|None|not|null|or|package|pass|print|private|protected|public|raise|readonly|return|self|short|sizeof|static|str|struct|super|switch|template|this|throw|True|try|type|typedef|typeof|union|unsigned|use|using|var|void|when|where|while|with|yield";

type Tok = { t: string; c?: string };

/** Lightweight VS Code Dark+ style tokenizer (comments, strings, numbers, keywords, calls). */
function tokenize(code: string): Tok[] {
  const re = new RegExp(
    [
      "(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // comments
      "(`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')", // strings
      "\\b(" + KEYWORDS + ")\\b", // keywords
      "\\b(\\d+(?:\\.\\d+)?)\\b", // numbers
      "\\b([A-Za-z_$][\\w$]*)(?=\\s*\\()", // function calls
    ].join("|"),
    "g",
  );
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index) });
    const cls = m[1]
      ? "text-[#6A9955]"
      : m[2]
        ? "text-[#CE9178]"
        : m[3]
          ? "text-[#569CD6]"
          : m[4]
            ? "text-[#B5CEA8]"
            : "text-[#DCDCAA]";
    out.push({ t: m[0], c: cls });
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push({ t: code.slice(last) });
  return out;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenize(code);
  return (
    <div className="relative my-3 min-w-0 w-full max-w-full overflow-hidden rounded-lg border bg-background dark:border-[#2d2d2d] dark:bg-[#1e1e1e]">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border bg-muted/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground dark:border-[#3c3c3c] dark:bg-[#2d2d2d] dark:text-[#cccccc] dark:hover:text-white"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="block min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain p-3 pt-9 text-[12.5px] leading-relaxed dark:text-[#d4d4d4]">
        <code className="block w-max min-w-full font-mono">
          {tokens.map((tk, i) =>
            tk.c ? (
              <span key={i} className={tk.c}>
                {tk.t}
              </span>
            ) : (
              <span key={i}>{tk.t}</span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const el = node as { props?: { children?: ReactNode } };
  return el.props ? textOf(el.props.children) : "";
}

export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("min-w-0 w-full max-w-full overflow-hidden text-sm leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-2 mt-4 text-base font-semibold" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-4 text-[15px] font-semibold" {...p} />,
          h3: (p) => <h3 className="mb-1.5 mt-3 text-sm font-semibold" {...p} />,
          p: (p) => <p className="mb-3" {...p} />,
          ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...p} />,
          li: (p) => <li className="marker:text-muted-foreground" {...p} />,
          strong: (p) => <strong className="font-semibold" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          blockquote: (p) => (
            <blockquote className="mb-3 border-l-2 border-border pl-3 italic text-muted-foreground" {...p} />
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: (p) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...p} />
            </div>
          ),
          th: (p) => <th className="border px-2 py-1 text-left font-semibold" {...p} />,
          td: (p) => <td className="border px-2 py-1 align-top" {...p} />,
          pre: ({ children }) => <CodeBlock code={textOf(children).replace(/\n$/, "")} />,
          code: ({ className: cls, children, ...rest }) => {
            const isBlock = typeof cls === "string" && cls.includes("language-");
            if (isBlock) return <code className={cls} {...rest}>{children}</code>;
            return (
              <code className="rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-[12.5px]" {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

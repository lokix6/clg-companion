import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { MarkdownMessage } from "./MarkdownMessage";
import { aiChatSend, aiDeleteConversation, aiRenameConversation } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  aiKeys,
  conversationsQuery,
  messagesQuery,
  type AiMessage,
} from "@/features/ai/queries";
import { useVoiceInput, useVoiceOutput } from "@/features/ai/useVoice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_EXT,
  extractFile,
  formatSize,
  type ExtractedFile,
} from "@/lib/ai/file-extract";


type Props = {
  roleContext: "student" | "faculty";
  module?: "assistant" | "assignment_help";
  title?: string;
  suggestedPrompts?: string[];
};

export function AiChatWindow({
  roleContext,
  module = "assistant",
  title = "AI Study Assistant",
  suggestedPrompts = [],
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ExtractedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busyExtract, setBusyExtract] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const spokenRef = useRef<string | null>(null);

  const voice = useVoiceOutput();
  const mic = useVoiceInput((text) =>
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)),
  );


  const sendFn = useServerFn(aiChatSend);
  const deleteFn = useServerFn(aiDeleteConversation);
  const renameFn = useServerFn(aiRenameConversation);

  const convList = useQuery(conversationsQuery(user?.id ?? ""));
  const msgs = useQuery(messagesQuery(conversationId));

  const filteredConversations = useMemo(
    () => (convList.data ?? []).filter((c) => c.module === module),
    [convList.data, module],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.data, conversationId]);

  // Auto read the newest assistant reply aloud when voice replies are on.
  useEffect(() => {
    const list = msgs.data ?? [];
    const last = list[list.length - 1];
    if (!last || last.role !== "assistant") return;
    if (!autoSpeak) {
      spokenRef.current = last.id;
      return;
    }
    if (spokenRef.current === last.id) return;
    spokenRef.current = last.id;
    void voice.speak(last.id, last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.data, autoSpeak]);

  // Stop playback when switching conversations.
  useEffect(() => {
    voice.stop();
    spokenRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);


  const send = useMutation({
    mutationFn: (payload: { message: string; atts: ExtractedFile[] }) =>
      sendFn({
        data: {
          conversationId,
          module,
          roleContext,
          message: payload.message,
          attachments: payload.atts.map((a) => ({
            name: a.name,
            mime: a.mime,
            size: a.size,
            kind: a.kind,
            base64: a.base64,
            text: a.text,
          })),
        },
      }),
    onSuccess: async (res) => {
      setConversationId(res.conversationId);
      setInput("");
      setAttachments([]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: aiKeys.conversations(user?.id ?? "") }),
        qc.invalidateQueries({ queryKey: aiKeys.messages(res.conversationId) }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message ?? "AI request failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { conversationId: id } }),
    onSuccess: async (_r, id) => {
      if (conversationId === id) setConversationId(null);
      await qc.invalidateQueries({ queryKey: aiKeys.conversations(user?.id ?? "") });
      toast.success("Conversation deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: (v: { id: string; title: string }) =>
      renameFn({ data: { conversationId: v.id, title: v.title } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.conversations(user?.id ?? "") }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (attachments.length + arr.length > 10) {
      toast.error("Maximum 10 files per message.");
      return;
    }
    setBusyExtract(true);
    try {
      const results: ExtractedFile[] = [];
      for (const f of arr) {
        try {
          results.push(await extractFile(f));
        } catch (e) {
          toast.error((e as Error).message);
        }
      }
      setAttachments((prev) => [...prev, ...results]);
    } finally {
      setBusyExtract(false);
    }
  };

  const submit = () => {
    const t = input.trim();
    if ((!t && attachments.length === 0) || send.isPending) return;
    send.mutate({ message: t, atts: attachments });
  };

  const regenerate = () => {
    const lastUser = [...(msgs.data ?? [])].reverse().find((m) => m.role === "user");
    if (lastUser) send.mutate({ message: lastUser.content, atts: [] });
  };

  return (
    <div className="grid h-full min-h-0 w-full min-w-0 max-w-full gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="hidden h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-3 lg:flex">

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <Button size="sm" variant="ghost" onClick={() => setConversationId(null)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
          )}
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                conversationId === c.id && "bg-accent",
              )}
              onClick={() => setConversationId(c.id)}
            >
              <span className="truncate">{c.title}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = window.prompt("Rename conversation", c.title);
                    if (next && next.trim()) rename.mutate({ id: c.id, title: next.trim() });
                  }}
                  aria-label="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this conversation?")) remove.mutate(c.id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div
        className={cn(
          "min-w-0 max-w-full overflow-hidden rounded-xl border bg-card flex flex-col h-full min-h-0",
          dragOver && "ring-2 ring-primary",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (autoSpeak) voice.stop();
                setAutoSpeak((v) => !v);
              }}
              aria-pressed={autoSpeak}
              title={autoSpeak ? "Voice replies on" : "Voice replies off"}
            >
              {autoSpeak ? (
                <Volume2 className="h-4 w-4 mr-1 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 mr-1" />
              )}
              Voice
            </Button>
            {(msgs.data ?? []).length > 0 && (
              <Button size="sm" variant="ghost" onClick={regenerate} disabled={send.isPending}>
                <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
              </Button>
            )}
          </div>

        </div>

        <div ref={listRef} className="min-w-0 max-w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-4 space-y-4">
          {(!msgs.data || msgs.data.length === 0) && (
            <div className="text-center text-muted-foreground max-w-md mx-auto py-10">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-sm">
                Ask anything academic, or drop a PDF, image, DOCX, PPTX, XLSX, CSV or TXT to analyze.
              </p>
              {suggestedPrompts.length > 0 && (
                <div className="grid gap-2 mt-6 text-left">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => setInput(p)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-accent transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {(msgs.data ?? []).map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              onSpeak={(msg) => void voice.speak(msg.id, msg.content)}
              isSpeaking={voice.speakingId === m.id}
              isLoadingVoice={voice.loadingId === m.id}
            />
          ))}

          {send.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="border-t px-3 py-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <AttachmentChip
                key={`${a.name}-${i}`}
                a={a}
                onRemove={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}

        <form
          className="border-t p-3 flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED_EXT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon"
            variant={mic.recording ? "destructive" : "ghost"}
            onClick={() => (mic.recording ? void mic.stop() : void mic.start())}
            disabled={mic.transcribing || send.isPending}
            aria-label={mic.recording ? "Stop recording" : "Record voice message"}
            title={mic.recording ? "Stop and transcribe" : "Speak your question"}
          >
            {mic.transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mic.recording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={busyExtract || send.isPending}
            aria-label="Attach file"
          >
            {busyExtract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mic.recording ? "Listening… tap the stop button when done" : "Ask a question, speak, or drop a file…"}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button type="submit" disabled={send.isPending || (!input.trim() && attachments.length === 0)}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AttachmentChip({ a, onRemove }: { a: ExtractedFile; onRemove: () => void }) {
  const isImg = a.kind === "image" && a.base64;
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-xs">
      {isImg ? (
        <img
          src={`data:${a.mime};base64,${a.base64}`}
          alt={a.name}
          className="h-8 w-8 rounded object-cover"
        />
      ) : a.kind === "image" ? (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <div className="truncate max-w-[160px] font-medium">{a.name}</div>
        <div className="text-[10px] text-muted-foreground">{formatSize(a.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-muted-foreground hover:text-destructive"
        aria-label="Remove attachment"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MessageBubble({
  m,
  onSpeak,
  isSpeaking,
  isLoadingVoice,
}: {
  m: AiMessage;
  onSpeak: (m: AiMessage) => void;
  isSpeaking: boolean;
  isLoadingVoice: boolean;
}) {
  const isUser = m.role === "user";
  return (
    <div className={cn("flex min-w-0 max-w-full gap-3 overflow-hidden", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{m.content}</p>
        ) : (
          <MarkdownMessage content={m.content} />
        )}
        {!isUser && (
          <div className="mt-2 flex justify-end gap-3">
            <button
              onClick={() => onSpeak(m)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
            >
              {isLoadingVoice ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading
                </>
              ) : isSpeaking ? (
                <>
                  <Square className="h-3 w-3" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3" /> Read aloud
                </>
              )}
            </button>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(m.content);
                toast.success("Copied");
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

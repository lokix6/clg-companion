import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Search,
  MoreHorizontal,
  Star,
  Pencil,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiGenerateStudyPlan } from "@/lib/ai.functions";
import { aiKeys, studyPlansQuery, type StudyPlan } from "@/features/ai/queries";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/study-planner")({
  head: () => ({
    meta: [
      { title: "AI Study Planner — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Plan = {
  priority_subjects?: { subject: string; reason: string }[];
  weekly_plan?: { day: string; tasks: string[] }[];
  daily_plan?: { time: string; activity: string }[];
  revision_schedule?: { week: number; focus: string }[];
  advice?: string;
};

type Filter = "newest" | "oldest" | "favorites" | "week" | "month";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";
  const plansQ = useQuery(studyPlansQuery(userId));
  const plans = plansQ.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("newest");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudyPlan | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Auto-select the most recent plan initially or when selection is invalid.
  useEffect(() => {
    if (!plans.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !plans.some((p) => p.id === selectedId)) {
      setSelectedId(plans[0].id);
    }
  }, [plans, selectedId]);

  const selected = plans.find((p) => p.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const inRange = (iso: string, days: number) =>
      now - new Date(iso).getTime() <= days * 86400000;
    let list = plans.filter((p) => {
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.goals ?? "").toLowerCase().includes(q) ||
        fmtDate(p.created_at).toLowerCase().includes(q)
      );
    });
    if (filter === "favorites") list = list.filter((p) => p.is_favorite);
    if (filter === "week") list = list.filter((p) => inRange(p.updated_at, 7));
    if (filter === "month") list = list.filter((p) => inRange(p.updated_at, 30));
    if (filter === "oldest") list = [...list].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    else list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [plans, search, filter]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: aiKeys.plans(userId) });

  const rename = async (id: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    const { error } = await supabase
      .from("study_plans")
      .update({ title: t })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    await invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("study_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (selectedId === id) setSelectedId(null);
    await invalidate();
  };

  const duplicate = async (p: StudyPlan) => {
    const { data, error } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        title: `Copy of ${p.title}`,
        plan: p.plan as never,
        goals: p.goals,
        weekly_hours: p.weekly_hours,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    await invalidate();
    if (data?.id) setSelectedId(data.id);
  };

  const toggleFav = async (p: StudyPlan) => {
    const { error } = await supabase
      .from("study_plans")
      .update({ is_favorite: !p.is_favorite })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await invalidate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Study Planner"
        description="Generate, save, and revisit personalized study plans — like a document history."
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* History panel */}
        <aside className="rounded-xl border bg-card p-4 flex flex-col gap-3 h-fit lg:sticky lg:top-4">
          <Button size="sm" className="w-full" onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Study Plan
          </Button>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans…"
              className="pl-8 h-9"
            />
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs font-semibold uppercase text-muted-foreground pt-1">
            History {plans.length > 0 && `(${plans.length})`}
          </div>

          <div className="space-y-1 max-h-[560px] overflow-y-auto -mx-1 px-1">
            {plansQ.isLoading && (
              <div className="text-xs text-muted-foreground py-6 text-center">
                Loading…
              </div>
            )}
            {!plansQ.isLoading && filtered.length === 0 && (
              <div className="text-xs text-muted-foreground py-6 text-center">
                {plans.length === 0
                  ? "No plans yet. Generate your first one."
                  : "No plans match your filters."}
              </div>
            )}
            {filtered.map((p) => (
              <HistoryItem
                key={p.id}
                plan={p}
                active={p.id === selectedId}
                renaming={renamingId === p.id}
                renameValue={renameValue}
                onSelect={() => setSelectedId(p.id)}
                onStartRename={() => {
                  setRenamingId(p.id);
                  setRenameValue(p.title);
                }}
                onRenameChange={setRenameValue}
                onRenameCommit={async () => {
                  await rename(p.id, renameValue);
                  setRenamingId(null);
                }}
                onRenameCancel={() => setRenamingId(null)}
                onDuplicate={() => duplicate(p)}
                onDelete={() => setDeleteTarget(p)}
                onToggleFav={() => toggleFav(p)}
              />
            ))}
          </div>
        </aside>

        {/* Viewer */}
        <div className="rounded-xl border bg-card p-5 min-h-[400px]">
          {!selected && !showGenerator && (
            <EmptyViewer onNew={() => setShowGenerator(true)} />
          )}
          {showGenerator && (
            <GeneratorPanel
              userId={userId}
              onClose={() => setShowGenerator(false)}
              onCreated={(id) => {
                setShowGenerator(false);
                setSelectedId(id);
              }}
            />
          )}
          {!showGenerator && selected && (
            <PlanViewer
              plan={selected}
              onRename={async (t) => {
                await rename(selected.id, t);
              }}
            />
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Other plans will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) await remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HistoryItem({
  plan,
  active,
  renaming,
  renameValue,
  onSelect,
  onStartRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onDuplicate,
  onDelete,
  onToggleFav,
}: {
  plan: StudyPlan;
  active: boolean;
  renaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-lg border border-transparent px-2 py-2 cursor-pointer hover:bg-muted/60 transition-colors",
        active && "bg-muted border-border",
      )}
      onClick={renaming ? undefined : onSelect}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameCommit();
                if (e.key === "Escape") onRenameCancel();
              }}
              onBlur={onRenameCommit}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              {plan.is_favorite && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              )}
              <div className="text-sm font-medium truncate">{plan.title}</div>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {fmtDate(plan.created_at)}
            {plan.weekly_hours ? ` · ${plan.weekly_hours}h/wk` : ""}
          </div>
          {plan.goals && (
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {plan.goals}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onSelect}>Open</DropdownMenuItem>
            <DropdownMenuItem onClick={onStartRename}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFav}>
              <Star className="h-4 w-4 mr-2" />
              {plan.is_favorite ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyViewer({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center text-muted-foreground py-16 text-sm">
      <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
      Select a plan from history, or{" "}
      <button className="underline" onClick={onNew}>
        generate a new one
      </button>
      .
    </div>
  );
}

function GeneratorPanel({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("My Study Plan");
  const [topic, setTopic] = useState("");
  const [goals, setGoals] = useState("");
  const [hours, setHours] = useState(20);
  const fn = useServerFn(aiGenerateStudyPlan);

  const gen = useMutation({
    mutationFn: () => fn({ data: { title, topic, goals, weeklyHours: hours } }),

    onSuccess: async (res) => {
      toast.success("Study plan generated");
      await qc.invalidateQueries({ queryKey: aiKeys.plans(userId) });
      onCreated(res.planId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">New study plan</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <label className="text-sm font-medium">Plan title</label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="text-sm font-medium" htmlFor="study-plan-topic">
        Study planner topic
      </label>
      <Input
        id="study-plan-topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Data structures, spoken English, aptitude preparation"
      />

      <label className="text-sm font-medium">Weekly study hours</label>
      <Input
        type="number"
        min={1}
        max={80}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value) || 20)}
      />
      <label className="text-sm font-medium">Goals (optional)</label>
      <Textarea
        rows={4}
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        placeholder="e.g. Improve DBMS grade, prepare for placement interviews"
      />
      <Button
        className="w-full"
        onClick={() => gen.mutate()}
        disabled={gen.isPending || !topic.trim()}
      >
        {gen.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" /> Generate Study Plan
          </>
        )}
      </Button>
    </div>
  );
}

function PlanViewer({
  plan,
  onRename,
}: {
  plan: StudyPlan;
  onRename: (title: string) => Promise<void> | void;
}) {
  const p = (plan.plan ?? null) as Plan | null;
  const [title, setTitle] = useState(plan.title);
  const [goals, setGoals] = useState(plan.goals ?? "");
  const [hours, setHours] = useState<number | "">(plan.weekly_hours ?? "");
  const savingRef = useRef(false);

  // Sync when switching plans.
  useEffect(() => {
    setTitle(plan.title);
    setGoals(plan.goals ?? "");
    setHours(plan.weekly_hours ?? "");
  }, [plan.id, plan.title, plan.goals, plan.weekly_hours]);

  // Debounced auto-save for goals + hours + title.
  useEffect(() => {
    if (savingRef.current) return;
    const t = setTimeout(async () => {
      const patch: { title?: string; goals?: string | null; weekly_hours?: number | null } = {};
      const trimmed = title.trim();
      if (trimmed && trimmed !== plan.title) patch.title = trimmed;
      if ((goals || null) !== (plan.goals || null)) patch.goals = goals || null;
      const hoursNum = hours === "" ? null : Number(hours);
      if (hoursNum !== plan.weekly_hours) patch.weekly_hours = hoursNum;
      if (Object.keys(patch).length === 0) return;
      savingRef.current = true;
      try {
        if (patch.title) {
          await onRename(patch.title);
          delete patch.title;
        }
        if (Object.keys(patch).length) {
          await supabase.from("study_plans").update(patch).eq("id", plan.id);
        }
      } finally {
        savingRef.current = false;
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, goals, hours, plan.id]);

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base font-semibold h-9 max-w-md"
        />
        <div className="text-xs text-muted-foreground ml-auto">
          Created {fmtDate(plan.created_at)} · Updated {fmtDate(plan.updated_at)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Goals
          </label>
          <Textarea
            rows={2}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Add or edit goals — auto-saved"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Weekly hours
          </label>
          <Input
            type="number"
            min={1}
            max={80}
            value={hours}
            onChange={(e) => {
              const v = e.target.value;
              setHours(v === "" ? "" : Number(v));
            }}
          />
        </div>
      </div>

      {!p && (
        <div className="text-muted-foreground text-center py-8">
          This plan has no content.
        </div>
      )}

      {p && (
        <div className="space-y-6">
          {p.priority_subjects?.length ? (
            <div>
              <h3 className="font-semibold mb-2">Priority Subjects</h3>
              <ul className="space-y-1">
                {p.priority_subjects.map((s, i) => (
                  <li key={i}>
                    <b>{s.subject}</b> —{" "}
                    <span className="text-muted-foreground">{s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {p.weekly_plan?.length ? (
            <div>
              <h3 className="font-semibold mb-2">Weekly Plan</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.weekly_plan.map((d, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="font-semibold text-xs mb-1">{d.day}</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {d.tasks.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {p.daily_plan?.length ? (
            <div>
              <h3 className="font-semibold mb-2">Daily Schedule</h3>
              <ul className="space-y-1">
                {p.daily_plan.map((d, i) => (
                  <li key={i}>
                    <b>{d.time}</b> — {d.activity}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {p.revision_schedule?.length ? (
            <div>
              <h3 className="font-semibold mb-2">Revision Schedule</h3>
              <ul className="space-y-1">
                {p.revision_schedule.map((r, i) => (
                  <li key={i}>
                    Week {r.week}: {r.focus}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {p.advice && (
            <div className="rounded-lg bg-muted p-3 text-muted-foreground">
              {p.advice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

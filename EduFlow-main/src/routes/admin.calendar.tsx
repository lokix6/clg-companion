import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

const TYPES = ["Academic","Holiday","Examination","AssignmentDeadline","Seminar","Workshop","Placement","Other"] as const;

export const Route = createFileRoute("/admin/calendar")({
  ssr: false,
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const list = useQuery({
    queryKey: ["academic-calendar", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_calendar")
        .select("*, departments(name)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; description: string | null; event_type: string; start_date: string; end_date: string | null; departments: { name: string } | null; target_semester: number | null }>;
    },
  });
  const depts = useQuery({
    queryKey: ["dept-options-cal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ title: "", description: "", event_type: "Academic", start_date: "", end_date: "", department_id: "", target_semester: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.title.trim() || !form.start_date) throw new Error("Title and start date are required");
      const { data, error } = await supabase.from("academic_calendar").insert({
        created_by: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        department_id: form.department_id && form.department_id !== "__none__" ? form.department_id : null,
        target_semester: form.target_semester && form.target_semester !== "__none__" ? Number(form.target_semester) : null,
      }).select().single();
      if (error) throw new Error(error.message || "Failed to save event");
      return data;
    },
    onSuccess: async () => {
      setForm({ title: "", description: "", event_type: "Academic", start_date: "", end_date: "", department_id: "", target_semester: "" });
      toast.success("Event added");
      await qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      await qc.refetchQueries({ queryKey: ["academic-calendar"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Failed to add event"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academic_calendar").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Removed");
      await qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      await qc.refetchQueries({ queryKey: ["academic-calendar"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Failed to delete"),
  });


  return (
    <div className="space-y-6">
      <PageHeader title="Academic Calendar" description="Holidays, exams, deadlines, and campus events." />
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Add event</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All departments</SelectItem>
              {(depts.data ?? []).map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={form.target_semester} onValueChange={(v) => setForm({ ...form, target_semester: v })}>
            <SelectTrigger><SelectValue placeholder="All semesters" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All semesters</SelectItem>
              {[1,2,3,4,5,6,7,8].map((n) => (<SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-2 lg:col-span-3" rows={2} />
          <div className="lg:col-span-3">
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-primary shadow-elegant">
              <Plus className="mr-1.5 h-4 w-4" /> Add event
            </Button>
          </div>
        </div>
      </div>

      {list.isLoading ? (
        <LoadingState label="Loading..." />
      ) : list.isError ? (
        <EmptyState
          icon={CalendarDays}
          title="Couldn't load events"
          description={(list.error as Error)?.message ?? "Unexpected error"}
          action={<Button size="sm" variant="outline" onClick={() => list.refetch()}>Retry</Button>}
        />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Add your first academic calendar event using the form above." />
      ) : (

        <div className="space-y-2">
          {(list.data ?? []).map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{e.event_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ""}
                  </span>
                  {e.departments && <span className="text-xs text-muted-foreground">· {e.departments.name}</span>}
                  {e.target_semester && <span className="text-xs text-muted-foreground">· Sem {e.target_semester}</span>}
                </div>
                <div className="mt-1 text-sm font-semibold">{e.title}</div>
                {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

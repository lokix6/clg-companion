import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/admin/timetable")({
  ssr: false,
  component: AdminTimetablePage,
});

type Slot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  department_name: string | null;
  semester: number | null;
  section_name: string | null;
  subject_code: string | null;
  subject_name: string;
  faculty_name: string | null;
  classroom_name: string | null;
};

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function AdminTimetablePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Timetable" description="Manage sections, classrooms, and weekly class schedule." />
      <Tabs defaultValue="slots">
        <TabsList>
          <TabsTrigger value="slots">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
        </TabsList>
        <TabsContent value="slots" className="mt-4"><SlotsTab /></TabsContent>
        <TabsContent value="sections" className="mt-4"><SectionsTab /></TabsContent>
        <TabsContent value="classrooms" className="mt-4"><ClassroomsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SlotsTab() {
  const qc = useQueryClient();
  const slots = useQuery({
    queryKey: ["admin-timetable-grid"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase.rpc("admin_timetable_grid");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });
  const subjects = useQuery({
    queryKey: ["catalog-subjects-all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_catalog_subjects");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; subject_code: string | null; subject_name: string; department_id: string | null; semester: number | null; faculty_id: string | null }>;
    },
  });
  const sections = useQuery({
    queryKey: ["sections-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id,name,department_id,semester").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const classrooms = useQuery({
    queryKey: ["classrooms-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classrooms").select("id,name,building").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const faculty = useQuery({
    queryKey: ["faculty-options"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_faculty_options");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string | null; email: string }>;
    },
  });

  const [form, setForm] = useState({
    catalog_subject_id: "",
    section_id: "",
    classroom_id: "",
    faculty_id: "",
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "10:00",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.catalog_subject_id) throw new Error("Choose a subject");
      const sub = subjects.data?.find((s) => s.id === form.catalog_subject_id);
      if (!sub?.department_id) throw new Error("Subject has no department");
      const clean = (v: string) => (v && v !== "__none__" ? v : null);
      const payload = {
        catalog_subject_id: form.catalog_subject_id,
        department_id: sub.department_id,
        semester: sub.semester ?? 1,
        section_id: clean(form.section_id),
        classroom_id: clean(form.classroom_id),
        faculty_id: clean(form.faculty_id) || sub.faculty_id || null,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
      };
      const { error } = await supabase.from("timetable_slots").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-timetable-grid"] });
      toast.success("Class scheduled");
      setForm({ ...form, catalog_subject_id: "" });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-timetable-grid"] });
      toast.success("Removed");
    },
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Slot[]>();
    DAYS.forEach((d) => m.set(d, []));
    (slots.data ?? []).forEach((s) => m.get(s.day_of_week)?.push(s));
    m.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return m;
  }, [slots.data]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold">Add class</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Subject *</Label>
            <Select value={form.catalog_subject_id} onValueChange={(v) => setForm({ ...form, catalog_subject_id: v })}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subject_code ? `${s.subject_code} — ` : ""}{s.subject_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Section</Label>
            <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— none —</SelectItem>
                {(sections.data ?? []).map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Faculty</Label>
            <Select value={form.faculty_id} onValueChange={(v) => setForm({ ...form, faculty_id: v })}>
              <SelectTrigger><SelectValue placeholder="Use subject default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— default —</SelectItem>
                {(faculty.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.full_name ?? f.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Classroom</Label>
            <Select value={form.classroom_id} onValueChange={(v) => setForm({ ...form, classroom_id: v })}>
              <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— none —</SelectItem>
                {(classrooms.data ?? []).map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Day</Label>
            <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Start</Label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full bg-gradient-primary shadow-elegant">
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>

      {slots.isLoading ? (
        <LoadingState label="Loading..." />
      ) : (slots.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarClock} title="No classes scheduled" description="Add the first class above." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((d) => {
            const list = grouped.get(d) ?? [];
            return (
              <div key={d} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-sm font-semibold">{d}</div>
                {list.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No classes</div>
                ) : (
                  <div className="space-y-2">
                    {list.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-background p-3">
                        <div className="min-w-0 text-xs">
                          <div className="text-muted-foreground">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}{s.classroom_name ? ` · ${s.classroom_name}` : ""}</div>
                          <div className="mt-1 text-sm font-semibold">{s.subject_name}</div>
                          <div className="text-muted-foreground">
                            {s.department_name}{s.semester ? ` · Sem ${s.semester}` : ""}{s.section_name ? ` · ${s.section_name}` : ""}
                          </div>
                          {s.faculty_name && <div className="text-muted-foreground">{s.faculty_name}</div>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionsTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["sections-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id,name,semester,department_id,departments(name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; semester: number; department_id: string; departments: { name: string } | null }>;
    },
  });
  const depts = useQuery({
    queryKey: ["dept-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({ department_id: "", semester: "1", name: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.department_id || !form.name) throw new Error("Fill all fields");
      const { error } = await supabase.from("sections").insert({
        department_id: form.department_id,
        semester: Number(form.semester),
        name: form.name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections-full"] });
      qc.invalidateQueries({ queryKey: ["sections-list"] });
      setForm({ department_id: "", semester: "1", name: "" });
      toast.success("Section added");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sections-full"] }); toast.success("Removed"); },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              {(depts.data ?? []).map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8].map((n) => (<SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Name (e.g. Section A)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-primary">
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Semester</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(list.data ?? []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.departments?.name}</td>
                <td className="px-4 py-3">{s.semester}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassroomsTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["classrooms-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classrooms").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({ name: "", building: "", capacity: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      const { error } = await supabase.from("classrooms").insert({
        name: form.name.trim(),
        building: form.building.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classrooms-full"] });
      qc.invalidateQueries({ queryKey: ["classrooms-list"] });
      setForm({ name: "", building: "", capacity: "" });
      toast.success("Classroom added");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classrooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classrooms-full"] }); toast.success("Removed"); },
  });
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Name (e.g. Room 201)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          <Input placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-primary">
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Building</th><th className="px-4 py-3">Capacity</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(list.data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.building ?? "—"}</td>
                <td className="px-4 py-3">{c.capacity ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, User } from "lucide-react";
import { queryOptions } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/dashboard/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SubjectsPage,
});

type StudentSubject = {
  id: string;
  subject_code: string | null;
  subject_name: string;
  description: string | null;
  credits: number | null;
  semester: number | null;
  department_id: string | null;
  department_name: string | null;
  faculty_id: string | null;
  faculty_name: string | null;
};

const studentSubjectsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: ["student-subjects", uid ?? "anon"],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async (): Promise<StudentSubject[]> => {
      const { data, error } = await supabase.rpc("student_my_subjects" as never);
      if (error) throw error;
      return (data as unknown as StudentSubject[]) ?? [];
    },
  });

function SubjectsPage() {
  const { user } = useAuth();
  const q = useQuery(studentSubjectsQuery(user?.id));
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data ?? []).filter((s) =>
      !t
        ? true
        : [s.subject_name, s.subject_code, s.faculty_name, s.department_name]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(t)),
    );
  }, [q.data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subjects"
        description="Subjects for your department and semester."
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search subjects, faculty or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {q.isLoading ? (
        <LoadingState label="Loading subjects..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? "No matching subjects" : "No subjects assigned yet"}
          description={
            search
              ? "Try a different search."
              : "Once your department and semester are set, subjects added by your administrator will appear here."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {s.subject_code && (
                    <div className="text-xs font-mono font-semibold uppercase tracking-widest text-primary">
                      {s.subject_code}
                    </div>
                  )}
                  <h3 className="mt-1 truncate text-base font-semibold" title={s.subject_name}>
                    {s.subject_name}
                  </h3>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>

              {s.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{s.faculty_name ?? "Faculty not assigned"}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {s.department_name && <Badge variant="outline">{s.department_name}</Badge>}
                {s.semester != null && <Badge variant="secondary">Sem {s.semester}</Badge>}
                {s.credits != null && <Badge variant="secondary">{s.credits} credits</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

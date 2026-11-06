import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { ReportFilterKey, ReportFilters } from "./definitions";

export const FILTER_LABELS: Record<ReportFilterKey, string> = {
  department: "Department",
  semester: "Semester",
  section: "Section",
  subject_id: "Subject",
  faculty_id: "Faculty",
  student_id: "Student",
  assignment_id: "Assignment",
  assessment_id: "Assessment",
  quiz_id: "Quiz",
  date_from: "From",
  date_to: "To",
  status: "Status",
};

const ALL = "__all__";

/* ---------------- Reusable dropdown primitives ---------------- */

function LookupSelect<T extends { id: string; label: string }>({
  value,
  onChange,
  placeholder,
  options,
  isLoading,
  allLabel = "All",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: T[];
  isLoading?: boolean;
  allLabel?: string;
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------------- Data hooks ---------------- */

const departmentsQ = {
  queryKey: ["reports", "opt", "departments"] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code")
      .order("name");
    if (error) throw error;
    return (data ?? []).map((d) => ({
      id: d.id,
      label: d.code ? `${d.name} (${d.code})` : d.name,
    }));
  },
  staleTime: 60_000,
};

const sectionsQ = (deptId?: string, sem?: string) => ({
  queryKey: ["reports", "opt", "sections", deptId ?? "", sem ?? ""] as const,
  queryFn: async () => {
    let q = supabase.from("sections").select("id, name, department_id, semester").order("name");
    if (deptId) q = q.eq("department_id", deptId);
    if (sem) q = q.eq("semester", Number(sem));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((s) => ({ id: s.name, label: s.name }));
  },
  staleTime: 60_000,
});

const subjectsQ = (deptId?: string, sem?: string) => ({
  queryKey: ["reports", "opt", "subjects", deptId ?? "", sem ?? ""] as const,
  queryFn: async () => {
    let q = supabase
      .from("subjects")
      .select("id, subject_code, subject_name, department_id, semester, is_catalog")
      .eq("is_catalog", true)
      .order("subject_name");
    if (deptId) q = q.eq("department_id", deptId);
    if (sem) q = q.eq("semester", Number(sem));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((s) => ({
      id: s.id,
      label: `${s.subject_code ? s.subject_code + " · " : ""}${s.subject_name}`,
    }));
  },
  staleTime: 30_000,
});

const facultyQ = {
  queryKey: ["reports", "opt", "faculty"] as const,
  queryFn: async () => {
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "faculty");
    if (rErr) throw rErr;
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .order("full_name");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      label: p.full_name || p.email || p.id,
    }));
  },
  staleTime: 60_000,
};

const studentsQ = (deptId?: string, sem?: string, section?: string) => ({
  queryKey: ["reports", "opt", "students", deptId ?? "", sem ?? "", section ?? ""] as const,
  queryFn: async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    let q = supabase
      .from("profiles")
      .select("id, full_name, email, roll_number, department_id, semester, section")
      .in("id", ids)
      .order("full_name")
      .limit(500);
    if (deptId) q = q.eq("department_id", deptId);
    if (sem) q = q.eq("semester", Number(sem));
    if (section) q = q.eq("section", section);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      label: `${p.roll_number ? p.roll_number + " · " : ""}${p.full_name || p.email || p.id}`,
    }));
  },
  staleTime: 30_000,
});

const assignmentsQ = (subjectId?: string, facultyId?: string) => ({
  queryKey: ["reports", "opt", "assignments", subjectId ?? "", facultyId ?? ""] as const,
  queryFn: async () => {
    let q = supabase
      .from("assignments")
      .select("id, title, catalog_subject_id, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (subjectId) q = q.eq("catalog_subject_id", subjectId);
    if (facultyId) q = q.eq("created_by", facultyId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((a) => ({ id: a.id, label: a.title }));
  },
  staleTime: 15_000,
});

const assessmentsQ = (subjectId?: string) => ({
  queryKey: ["reports", "opt", "assessments", subjectId ?? ""] as const,
  queryFn: async () => {
    let q = supabase
      .from("assessments")
      .select("id, title, assessment_type, catalog_subject_id, assessment_date")
      .order("assessment_date", { ascending: false, nullsFirst: false })
      .limit(300);
    if (subjectId) q = q.eq("catalog_subject_id", subjectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((a) => ({
      id: a.id,
      label: `${a.title}${a.assessment_type ? " · " + a.assessment_type : ""}`,
    }));
  },
  staleTime: 15_000,
});

const quizzesQ = (subjectId?: string, facultyId?: string) => ({
  queryKey: ["reports", "opt", "quizzes", subjectId ?? "", facultyId ?? ""] as const,
  queryFn: async () => {
    let q = supabase
      .from("ai_quizzes")
      .select("id, title, catalog_subject_id, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (subjectId) q = q.eq("catalog_subject_id", subjectId);
    if (facultyId) q = q.eq("created_by", facultyId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((x) => ({ id: x.id, label: x.title || "Untitled" }));
  },
  staleTime: 15_000,
});

/* ---------------- Individual field controls ---------------- */

function DepartmentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, isLoading } = useQuery(departmentsQ);
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Department"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Departments"
    />
  );
}

function SemesterSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Semester"
      options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: `Semester ${n}` }))}
      allLabel="All Semesters"
    />
  );
}

function SectionSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(sectionsQ(filters.department, filters.semester));
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Section"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Sections"
    />
  );
}

function SubjectSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(subjectsQ(filters.department, filters.semester));
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Subject"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Subjects"
    />
  );
}

function FacultySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, isLoading } = useQuery(facultyQ);
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Faculty"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Faculty"
    />
  );
}

function StudentSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(
    studentsQ(filters.department, filters.semester, filters.section),
  );
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Student"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Students"
    />
  );
}

function AssignmentSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(assignmentsQ(filters.subject_id, filters.faculty_id));
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Assignment"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Assignments"
    />
  );
}

function AssessmentSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(assessmentsQ(filters.subject_id));
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Assessment"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Assessments"
    />
  );
}

function QuizSelect({
  value,
  onChange,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const { data, isLoading } = useQuery(quizzesQ(filters.subject_id, filters.faculty_id));
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Quiz"
      options={data ?? []}
      isLoading={isLoading}
      allLabel="All Quizzes"
    />
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LookupSelect
      value={value}
      onChange={onChange}
      placeholder="Select Status"
      options={[
        { id: "active", label: "Active" },
        { id: "inactive", label: "Inactive" },
        { id: "Draft", label: "Draft" },
        { id: "Published", label: "Published" },
        { id: "Closed", label: "Closed" },
      ]}
      allLabel="All"
    />
  );
}

/* ---------------- Dispatcher ---------------- */

export function FilterField({
  fkey,
  value,
  onChange,
  filters,
}: {
  fkey: ReportFilterKey;
  value: string;
  onChange: (v: string) => void;
  filters: ReportFilters;
}) {
  const label = FILTER_LABELS[fkey];

  const control = (() => {
    switch (fkey) {
      case "department":
        return <DepartmentSelect value={value} onChange={onChange} />;
      case "semester":
        return <SemesterSelect value={value} onChange={onChange} />;
      case "section":
        return <SectionSelect value={value} onChange={onChange} filters={filters} />;
      case "subject_id":
        return <SubjectSelect value={value} onChange={onChange} filters={filters} />;
      case "faculty_id":
        return <FacultySelect value={value} onChange={onChange} />;
      case "student_id":
        return <StudentSelect value={value} onChange={onChange} filters={filters} />;
      case "assignment_id":
        return <AssignmentSelect value={value} onChange={onChange} filters={filters} />;
      case "assessment_id":
        return <AssessmentSelect value={value} onChange={onChange} filters={filters} />;
      case "quiz_id":
        return <QuizSelect value={value} onChange={onChange} filters={filters} />;
      case "status":
        return <StatusSelect value={value} onChange={onChange} />;
      case "date_from":
      case "date_to":
        return (
          <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        );
    }
  })();

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {control}
    </div>
  );
}

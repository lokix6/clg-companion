import { supabase } from "@/integrations/supabase/client";
import { getAiUsage } from "@/lib/ai-usage-report.functions";
import type { ReportColumn, ReportPayload } from "./exporters";


/* ==================== Types ==================== */

export type ReportFilterKey =
  | "department"
  | "semester"
  | "section"
  | "subject_id"
  | "faculty_id"
  | "student_id"
  | "assignment_id"
  | "assessment_id"
  | "quiz_id"
  | "date_from"
  | "date_to"
  | "status";

export type ReportFilters = Partial<Record<ReportFilterKey, string>>;
export type ReportRole = "admin" | "faculty" | "student";
export type ReportKPI = { label: string; value: string | number; hint?: string };

export type ChartSpec =
  | { type: "bar"; title: string; data: { name: string; value: number }[]; orientation?: "vertical" | "horizontal" }
  | { type: "line"; title: string; data: { name: string; value: number }[] }
  | { type: "pie"; title: string; data: { name: string; value: number }[]; variant?: "pie" | "donut" };


export type ReportResult = { payload: ReportPayload; kpis: ReportKPI[]; charts: ChartSpec[] };

export type ReportDefinition = {
  id: string;
  role: ReportRole;
  title: string;
  description: string;
  filters: ReportFilterKey[];
  fetch: (filters: ReportFilters) => Promise<ReportResult>;
};

/* ==================== Helpers ==================== */

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const dateCol = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString() : "—");
const gradeFor = (p: number) =>
  p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "F";

async function fetchAll<T>(qb: any): Promise<T[]> {
  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function loadLookups() {
  const [{ data: depts }, { data: subs }, { data: profs }, { data: roles }] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("subjects").select("id, subject_code, subject_name, department_id, semester, is_catalog"),
    supabase.from("profiles").select("id, full_name, email, roll_number, department_id, semester, section, status"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const deptMap = new Map((depts ?? []).map((d) => [d.id, d.name] as const));
  const subMap = new Map((subs ?? []).filter((s) => s.is_catalog).map((s) => [s.id, s] as const));
  const profMap = new Map((profs ?? []).map((p) => [p.id, p] as const));
  const roleMap = new Map<string, Set<string>>();
  for (const r of roles ?? []) {
    if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
    roleMap.get(r.user_id)!.add(r.role);
  }
  return { deptMap, subMap, profMap, roleMap, allDepts: depts ?? [], allSubs: subs ?? [], allProfs: profs ?? [] };
}

/* ==================== STUDENT REPORT (admin) ==================== */

async function fetchStudentReport(f: ReportFilters): Promise<ReportResult> {
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
  const studentIds = (roles ?? []).map((r) => r.user_id);
  if (studentIds.length === 0) {
    return empty("Student Report", "admin_students", studentCols());
  }

  let q = supabase
    .from("profiles")
    .select("id, full_name, email, roll_number, department_id, semester, section, status")
    .in("id", studentIds)
    .order("roll_number", { nullsFirst: false });
  if (f.department) q = q.eq("department_id", f.department);
  if (f.semester) q = q.eq("semester", Number(f.semester));
  if (f.section) q = q.eq("section", f.section);
  if (f.status) q = q.eq("status", f.status as never);
  if (f.student_id) q = q.eq("id", f.student_id);
  const students = await fetchAll<{
    id: string; full_name: string | null; email: string | null; roll_number: string | null;
    department_id: string | null; semester: number | null; section: string | null; status: string | null;
  }>(q);

  const ids = students.map((s) => s.id);
  const [dp, ah, subs, marks, assess, qatt] = await Promise.all([
    supabase.from("departments").select("id, name"),
    ids.length
      ? supabase.from("attendance_history").select("student_id, status").in("student_id", ids)
      : Promise.resolve({ data: [] as { student_id: string; status: string }[] }),
    ids.length
      ? supabase.from("assignment_submissions").select("student_id, review_status").in("student_id", ids)
      : Promise.resolve({ data: [] as { student_id: string; review_status: string | null }[] }),
    ids.length
      ? supabase.from("marks").select("student_id, obtained_marks, assessment_id").in("student_id", ids)
      : Promise.resolve({ data: [] as { student_id: string; obtained_marks: number | null; assessment_id: string }[] }),
    supabase.from("assessments").select("id, max_marks, department_id, semester"),
    ids.length
      ? supabase.from("quiz_attempts").select("student_id, score, total").in("student_id", ids)
      : Promise.resolve({ data: [] as { student_id: string; score: number | null; total: number | null }[] }),
  ]);
  const deptMap = new Map((dp.data ?? []).map((d) => [d.id, d.name] as const));
  const assessMap = new Map((assess.data ?? []).map((a) => [a.id, a] as const));

  // Aggregate per student
  const attByS = new Map<string, { p: number; t: number }>();
  for (const r of ah.data ?? []) {
    const c = attByS.get(r.student_id) ?? { p: 0, t: 0 };
    c.t += 1; if (r.status === "Present") c.p += 1;
    attByS.set(r.student_id, c);
  }
  const subsByS = new Map<string, number>();
  for (const s of subs.data ?? []) subsByS.set(s.student_id, (subsByS.get(s.student_id) ?? 0) + 1);

  const marksByS = new Map<string, { sum: number; n: number }>();
  for (const m of marks.data ?? []) {
    const a = assessMap.get(m.assessment_id);
    const max = num(a?.max_marks);
    if (!max || m.obtained_marks == null) continue;
    const p = (num(m.obtained_marks) / max) * 100;
    const c = marksByS.get(m.student_id) ?? { sum: 0, n: 0 };
    c.sum += p; c.n += 1; marksByS.set(m.student_id, c);
  }
  const quizByS = new Map<string, { sum: number; n: number }>();
  for (const q of qatt.data ?? []) {
    const t = num(q.total);
    if (!t) continue;
    const p = (num(q.score) / t) * 100;
    const c = quizByS.get(q.student_id) ?? { sum: 0, n: 0 };
    c.sum += p; c.n += 1; quizByS.set(q.student_id, c);
  }

  // Expected assignments per student = assignments visible to their dept/sem
  const expectedByS = new Map<string, number>();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, department_id, semester, publish_status");
  const pubAssigns = (assignments ?? []).filter((a) => a.publish_status === "Published" || a.publish_status === "Closed");
  for (const st of students) {
    let n = 0;
    for (const a of pubAssigns) {
      if (a.department_id === st.department_id && (a.semester == null || a.semester === st.semester)) n += 1;
    }
    expectedByS.set(st.id, n);
  }

  const rows = students.map((s) => {
    const att = attByS.get(s.id);
    const attPct = att ? pct(att.p, att.t) : 0;
    const submitted = subsByS.get(s.id) ?? 0;
    const expected = expectedByS.get(s.id) ?? 0;
    const pending = Math.max(0, expected - submitted);
    const mk = marksByS.get(s.id);
    const qk = quizByS.get(s.id);
    return {
      roll_number: s.roll_number ?? "—",
      full_name: s.full_name ?? "—",
      department: deptMap.get(s.department_id ?? "") ?? "—",
      semester: s.semester ?? "—",
      section: s.section ?? "—",
      attendance_pct: attPct,
      attendance_display: `${attPct}%`,
      submitted, pending,
      quiz_avg: qk ? Math.round((qk.sum / qk.n) * 10) / 10 : 0,
      quiz_avg_display: qk ? `${(qk.sum / qk.n).toFixed(1)}%` : "—",
      marks_avg: mk ? Math.round((mk.sum / mk.n) * 10) / 10 : 0,
      marks_avg_display: mk ? `${(mk.sum / mk.n).toFixed(1)}%` : "—",
      status: s.status ?? "—",
    };
  });

  const active = students.filter((s) => s.status === "active").length;
  const attAll = rows.filter((r) => r.attendance_pct > 0);
  const avgAtt = attAll.length ? attAll.reduce((s, r) => s + r.attendance_pct, 0) / attAll.length : 0;
  const marksAll = rows.filter((r) => r.marks_avg > 0);
  const avgMarks = marksAll.length ? marksAll.reduce((s, r) => s + r.marks_avg, 0) / marksAll.length : 0;

  // Charts
  const attDist = [
    { name: "≥ 90%", value: rows.filter((r) => r.attendance_pct >= 90).length },
    { name: "75-89%", value: rows.filter((r) => r.attendance_pct >= 75 && r.attendance_pct < 90).length },
    { name: "60-74%", value: rows.filter((r) => r.attendance_pct >= 60 && r.attendance_pct < 75).length },
    { name: "< 60%", value: rows.filter((r) => r.attendance_pct > 0 && r.attendance_pct < 60).length },
  ];
  const deptDist = new Map<string, number>();
  for (const r of rows) deptDist.set(r.department, (deptDist.get(r.department) ?? 0) + 1);
  const complete = rows.filter((r) => r.submitted + r.pending > 0);
  const complRate = complete.length ? complete.reduce((s, r) => s + pct(r.submitted, r.submitted + r.pending), 0) / complete.length : 0;

  return {
    payload: {
      title: "Student Report",
      kind: "admin_students",
      columns: studentCols(),
      rows: rows as never,
      summary: [
        { label: "Students", value: rows.length },
        { label: "Active", value: active },
        { label: "Avg Attendance", value: `${avgAtt.toFixed(1)}%` },
        { label: "Avg Marks", value: `${avgMarks.toFixed(1)}%` },
      ],
    },
    kpis: [
      { label: "Total Students", value: rows.length },
      { label: "Active", value: active },
      { label: "Inactive", value: rows.length - active },
      { label: "Avg Attendance", value: `${avgAtt.toFixed(1)}%` },
      { label: "Avg Marks", value: `${avgMarks.toFixed(1)}%` },
      { label: "Avg Completion", value: `${complRate.toFixed(1)}%` },
    ],
    charts: rows.length
      ? [
          { type: "bar", title: "Attendance Distribution", data: attDist },
          { type: "pie", title: "Students by Department", variant: "donut", data: [...deptDist].map(([name, value]) => ({ name, value })) },
          {
            type: "bar",
            title: "Assignment Completion by Student",
            data: rows.slice(0, 15).map((r) => ({
              name: (r.roll_number || r.full_name).toString().slice(0, 12),
              value: r.submitted + r.pending > 0 ? pct(r.submitted, r.submitted + r.pending) : 0,
            })),
          },
        ]
      : [],
  };
}

function studentCols(): ReportColumn[] {
  return [
    { key: "roll_number", label: "Roll" },
    { key: "full_name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "semester", label: "Sem", align: "right" },
    { key: "section", label: "Section" },
    { key: "attendance_display", label: "Attendance", align: "right" },
    { key: "submitted", label: "Submitted", align: "right" },
    { key: "pending", label: "Pending", align: "right" },
    { key: "quiz_avg_display", label: "Quiz Avg", align: "right" },
    { key: "marks_avg_display", label: "Marks Avg", align: "right" },
    { key: "status", label: "Status" },
  ];
}

/* ==================== FACULTY REPORT (admin) ==================== */

async function fetchFacultyReport(f: ReportFilters): Promise<ReportResult> {
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "faculty");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return empty("Faculty Report", "admin_faculty", facultyCols());

  let q = supabase
    .from("profiles")
    .select("id, full_name, email, department_id, status")
    .in("id", ids)
    .order("full_name");
  if (f.department) q = q.eq("department_id", f.department);
  if (f.status) q = q.eq("status", f.status as never);
  const fac = await fetchAll<{ id: string; full_name: string | null; email: string | null; department_id: string | null; status: string | null }>(q);

  const [dp, subs, assigns, quizzes, ah, notes] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("subjects").select("id, subject_name, department_id, semester, faculty_id, is_catalog"),
    supabase.from("assignments").select("id, created_by"),
    supabase.from("ai_quizzes").select("id, created_by"),
    supabase.from("attendance_history").select("faculty_id, status, class_date"),
    supabase.from("notes").select("uploaded_by"),
  ]);
  const deptMap = new Map((dp.data ?? []).map((d) => [d.id, d.name] as const));

  const subjByFac = new Map<string, string[]>();
  for (const s of subs.data ?? []) {
    if (!s.is_catalog || !s.faculty_id) continue;
    if (f.subject_id && s.id !== f.subject_id) continue;
    const arr = subjByFac.get(s.faculty_id) ?? [];
    arr.push(s.subject_name);
    subjByFac.set(s.faculty_id, arr);
  }
  const assignByFac = new Map<string, number>();
  for (const a of assigns.data ?? []) if (a.created_by) assignByFac.set(a.created_by, (assignByFac.get(a.created_by) ?? 0) + 1);
  const quizByFac = new Map<string, number>();
  for (const q of quizzes.data ?? []) if (q.created_by) quizByFac.set(q.created_by, (quizByFac.get(q.created_by) ?? 0) + 1);
  const noteByFac = new Map<string, number>();
  for (const n of notes.data ?? []) if (n.uploaded_by) noteByFac.set(n.uploaded_by, (noteByFac.get(n.uploaded_by) ?? 0) + 1);

  const attByFac = new Map<string, { p: number; t: number; sessions: Set<string> }>();
  for (const r of ah.data ?? []) {
    if (!r.faculty_id) continue;
    const c = attByFac.get(r.faculty_id) ?? { p: 0, t: 0, sessions: new Set<string>() };
    c.t += 1; if (r.status === "Present") c.p += 1;
    if (r.class_date) c.sessions.add(String(r.class_date));
    attByFac.set(r.faculty_id, c);
  }

  // Compute student count per faculty as unique students in dept+sem of their subjects
  const { data: studentProfs } = await supabase.from("profiles").select("id, department_id, semester");
  const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
  const sids = new Set((studentRoles ?? []).map((r) => r.user_id));

  const studentsByFac = new Map<string, Set<string>>();
  for (const s of subs.data ?? []) {
    if (!s.is_catalog || !s.faculty_id) continue;
    const set = studentsByFac.get(s.faculty_id) ?? new Set<string>();
    for (const p of studentProfs ?? []) {
      if (!sids.has(p.id)) continue;
      if (p.department_id === s.department_id && (s.semester == null || p.semester === s.semester)) set.add(p.id);
    }
    studentsByFac.set(s.faculty_id, set);
  }

  let rows = fac.map((p) => {
    const subjects = subjByFac.get(p.id) ?? [];
    if (f.subject_id && subjects.length === 0) return null;
    const att = attByFac.get(p.id);
    const attPct = att ? pct(att.p, att.t) : 0;
    return {
      full_name: p.full_name || p.email || "—",
      department: deptMap.get(p.department_id ?? "") ?? "—",
      designation: "Faculty",
      subjects_display: subjects.length ? subjects.slice(0, 3).join(", ") + (subjects.length > 3 ? "…" : "") : "—",
      subjects_count: subjects.length,
      students: studentsByFac.get(p.id)?.size ?? 0,
      assignments: assignByFac.get(p.id) ?? 0,
      quizzes: quizByFac.get(p.id) ?? 0,
      sessions: att ? att.sessions.size : 0,
      notes: noteByFac.get(p.id) ?? 0,
      avg_attendance: attPct,
      avg_attendance_display: att ? `${attPct}%` : "—",
    };
  }).filter(Boolean) as any[];

  const totalStudents = rows.reduce((s, r) => s + r.students, 0);
  const avgStudents = rows.length ? Math.round(totalStudents / rows.length) : 0;
  const totalAssigns = rows.reduce((s, r) => s + r.assignments, 0);
  const totalQuizzes = rows.reduce((s, r) => s + r.quizzes, 0);

  return {
    payload: {
      title: "Faculty Report",
      kind: "admin_faculty",
      columns: facultyCols(),
      rows,
      summary: [
        { label: "Faculty", value: rows.length },
        { label: "Assignments", value: totalAssigns },
        { label: "Quizzes", value: totalQuizzes },
      ],
    },
    kpis: [
      { label: "Faculty Count", value: rows.length },
      { label: "Avg Students", value: avgStudents },
      { label: "Assignments", value: totalAssigns },
      { label: "Quizzes", value: totalQuizzes },
    ],
    charts: rows.length
      ? [
          { type: "bar", title: "Faculty Workload (assignments + quizzes)", orientation: "horizontal", data: rows.slice(0, 15).map((r) => ({ name: r.full_name.slice(0, 18), value: r.assignments + r.quizzes })) },
          { type: "bar", title: "Student Distribution", orientation: "horizontal", data: rows.slice(0, 15).map((r) => ({ name: r.full_name.slice(0, 18), value: r.students })) },
          { type: "bar", title: "Assignments Created", orientation: "horizontal", data: rows.slice(0, 15).map((r) => ({ name: r.full_name.slice(0, 18), value: r.assignments })) },
        ]
      : [],

  };
}

function facultyCols(): ReportColumn[] {
  return [
    { key: "full_name", label: "Faculty" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "subjects_display", label: "Subjects" },
    { key: "students", label: "Students", align: "right" },
    { key: "assignments", label: "Assignments", align: "right" },
    { key: "quizzes", label: "Quizzes", align: "right" },
    { key: "sessions", label: "Sessions", align: "right" },
    { key: "notes", label: "Notes", align: "right" },
    { key: "avg_attendance_display", label: "Avg Att.", align: "right" },
  ];
}

/* ==================== ATTENDANCE ==================== */

async function fetchAttendanceReport(f: ReportFilters, scope: ReportRole): Promise<ReportResult> {
  let q = supabase
    .from("attendance_history")
    .select("id, class_date, status, student_id, catalog_subject_id, subject_code, subject_name, department_id, semester, faculty_id")
    .order("class_date", { ascending: false })
    .limit(5000);
  if (f.department) q = q.eq("department_id", f.department);
  if (f.semester) q = q.eq("semester", Number(f.semester));
  if (f.subject_id) q = q.eq("catalog_subject_id", f.subject_id);
  if (f.faculty_id) q = q.eq("faculty_id", f.faculty_id);
  if (f.student_id) q = q.eq("student_id", f.student_id);
  if (f.date_from) q = q.gte("class_date", f.date_from);
  if (f.date_to) q = q.lte("class_date", f.date_to);
  const records = await fetchAll<{
    id: string; class_date: string; status: string; student_id: string;
    catalog_subject_id: string | null; subject_code: string | null; subject_name: string | null;
    department_id: string | null; semester: number | null; faculty_id: string | null;
  }>(q);

  // Section filter (via student profile join)
  const studentIds = [...new Set(records.map((r) => r.student_id))];
  const { data: profs } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name, roll_number, section").in("id", studentIds)
    : { data: [] as { id: string; full_name: string | null; roll_number: string | null; section: string | null }[] };
  const pmap = new Map((profs ?? []).map((p) => [p.id, p] as const));
  const filtered = f.section ? records.filter((r) => pmap.get(r.student_id)?.section === f.section) : records;

  const present = filtered.filter((r) => r.status === "Present").length;
  const absent = filtered.filter((r) => r.status === "Absent").length;
  const total = filtered.length;

  const rows = filtered.map((r) => ({
    class_date: r.class_date,
    roll_number: pmap.get(r.student_id)?.roll_number ?? "—",
    student: pmap.get(r.student_id)?.full_name ?? "—",
    subject: r.subject_name ?? "—",
    subject_code: r.subject_code ?? "—",
    status: r.status,
  }));

  // Daily trend
  const dayMap = new Map<string, { p: number; t: number }>();
  const monthMap = new Map<string, { p: number; t: number }>();
  const subjMap = new Map<string, { p: number; t: number }>();
  for (const r of filtered) {
    const d = r.class_date;
    const dm = dayMap.get(d) ?? { p: 0, t: 0 };
    dm.t += 1; if (r.status === "Present") dm.p += 1; dayMap.set(d, dm);
    const m = d.slice(0, 7);
    const mm = monthMap.get(m) ?? { p: 0, t: 0 };
    mm.t += 1; if (r.status === "Present") mm.p += 1; monthMap.set(m, mm);
    const s = r.subject_name || r.subject_code || "—";
    const sm = subjMap.get(s) ?? { p: 0, t: 0 };
    sm.t += 1; if (r.status === "Present") sm.p += 1; subjMap.set(s, sm);
  }
  const dailyTrend = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([d, v]) => ({ name: d.slice(5), value: pct(v.p, v.t) }));
  const monthlyTrend = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([d, v]) => ({ name: d, value: pct(v.p, v.t) }));
  const subjChart = [...subjMap.entries()].slice(0, 10).map(([n, v]) => ({ name: n.slice(0, 16), value: pct(v.p, v.t) }));

  return {
    payload: {
      title: scope === "student" ? "Attendance Summary" : "Attendance Report",
      kind: `${scope}_attendance`,
      columns: [
        { key: "class_date", label: "Date", format: (v) => dateCol(v) },
        { key: "roll_number", label: "Roll" },
        { key: "student", label: "Student" },
        { key: "subject", label: "Subject" },
        { key: "subject_code", label: "Code" },
        { key: "status", label: "Status" },
      ],
      rows,
      summary: [
        { label: "Records", value: total },
        { label: "Present %", value: `${pct(present, total)}%` },
      ],
    },
    kpis: [
      { label: "Overall Attendance %", value: `${pct(present, total)}%` },
      { label: "Present", value: present },
      { label: "Absent", value: absent },
      { label: "Records", value: total },
    ],
    charts: total
      ? [
          { type: "line", title: "Daily Attendance Trend (%)", data: dailyTrend },
          { type: "bar", title: "Monthly Attendance Trend (%)", data: monthlyTrend },
          { type: "bar", title: "Subject Comparison (%)", data: subjChart },
        ]
      : [],
  };
}

/* ==================== MARKS ==================== */

async function fetchMarksReport(f: ReportFilters, scope: ReportRole): Promise<ReportResult> {
  // Build assessments filter first (subject/dept/sem/assessment)
  let aq = supabase
    .from("assessments")
    .select("id, title, assessment_type, max_marks, catalog_subject_id, department_id, semester, created_by, assessment_date")
    .limit(5000);
  if (f.department) aq = aq.eq("department_id", f.department);
  if (f.semester) aq = aq.eq("semester", Number(f.semester));
  if (f.subject_id) aq = aq.eq("catalog_subject_id", f.subject_id);
  if (f.faculty_id) aq = aq.eq("created_by", f.faculty_id);
  if (f.assessment_id) aq = aq.eq("id", f.assessment_id);
  if (f.date_from) aq = aq.gte("assessment_date", f.date_from);
  if (f.date_to) aq = aq.lte("assessment_date", f.date_to);
  const assessments = await fetchAll<{
    id: string; title: string; assessment_type: string; max_marks: number;
    catalog_subject_id: string | null; department_id: string | null; semester: number | null; created_by: string;
    assessment_date: string | null;
  }>(aq);
  const amap = new Map(assessments.map((a) => [a.id, a] as const));
  const assessIds = assessments.map((a) => a.id);
  if (!assessIds.length) return empty("Marks Report", `${scope}_marks`, marksCols());

  let mq = supabase
    .from("marks")
    .select("student_id, assessment_id, obtained_marks")
    .in("assessment_id", assessIds)
    .limit(10000);
  if (f.student_id) mq = mq.eq("student_id", f.student_id);
  const marks = await fetchAll<{ student_id: string; assessment_id: string; obtained_marks: number | null }>(mq);

  const studentIds = [...new Set(marks.map((m) => m.student_id))];
  const { data: subs } = await supabase.from("subjects").select("id, subject_name, subject_code");
  const smap = new Map((subs ?? []).map((s) => [s.id, s] as const));
  const { data: profs } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name, roll_number, section").in("id", studentIds)
    : { data: [] as { id: string; full_name: string | null; roll_number: string | null; section: string | null }[] };
  const pmap = new Map((profs ?? []).map((p) => [p.id, p] as const));

  // Section filter (in-memory)
  const filteredMarks = f.section ? marks.filter((m) => pmap.get(m.student_id)?.section === f.section) : marks;

  // Aggregate per (student, subject) with breakdown by assessment_type
  type Agg = { student: string; roll: string; subject: string; internal: number; assignment: number; quiz: number; lab: number; total: number; max: number };
  const agg = new Map<string, Agg>();
  for (const m of filteredMarks) {
    const a = amap.get(m.assessment_id);
    if (!a || m.obtained_marks == null) continue;
    const subj = smap.get(a.catalog_subject_id ?? "");
    const key = `${m.student_id}__${a.catalog_subject_id ?? "none"}`;
    const cur: Agg = agg.get(key) ?? {
      student: pmap.get(m.student_id)?.full_name ?? "—",
      roll: pmap.get(m.student_id)?.roll_number ?? "—",
      subject: subj?.subject_name ?? "—",
      internal: 0, assignment: 0, quiz: 0, lab: 0, total: 0, max: 0,
    };
    const type = (a.assessment_type || "").toLowerCase();
    const val = num(m.obtained_marks);
    if (type.includes("assign")) cur.assignment += val;
    else if (type.includes("quiz")) cur.quiz += val;
    else if (type.includes("lab")) cur.lab += val;
    else cur.internal += val;
    cur.total += val;
    cur.max += num(a.max_marks);
    agg.set(key, cur);
  }

  const rows = [...agg.values()].map((r) => {
    const p = r.max ? Math.round((r.total / r.max) * 1000) / 10 : 0;
    return {
      roll: r.roll,
      student: r.student,
      subject: r.subject,
      internal: r.internal,
      assignment: r.assignment,
      quiz: r.quiz,
      lab: r.lab,
      total: r.total,
      max: r.max,
      percentage: `${p}%`,
      grade: gradeFor(p),
      result: p >= 40 ? "Pass" : "Fail",
      pctNum: p,
    };
  });

  const passed = rows.filter((r) => r.pctNum >= 40).length;
  const failed = rows.length - passed;
  const avg = rows.length ? rows.reduce((s, r) => s + r.pctNum, 0) / rows.length : 0;
  const highest = rows.length ? Math.max(...rows.map((r) => r.pctNum)) : 0;
  const lowest = rows.length ? Math.min(...rows.map((r) => r.pctNum)) : 0;

  const buckets = [0, 40, 55, 70, 85, 101];
  const labels = ["<40", "40-54", "55-69", "70-84", "85-100"];
  const dist = labels.map((l, i) => ({ name: l, value: rows.filter((r) => r.pctNum >= buckets[i] && r.pctNum < buckets[i + 1]).length }));
  const subjAvg = new Map<string, { s: number; n: number }>();
  for (const r of rows) {
    const c = subjAvg.get(r.subject) ?? { s: 0, n: 0 };
    c.s += r.pctNum; c.n += 1; subjAvg.set(r.subject, c);
  }
  const subjChart = [...subjAvg.entries()].slice(0, 10).map(([n, v]) => ({ name: n.slice(0, 16), value: Math.round((v.s / v.n) * 10) / 10 }));

  return {
    payload: {
      title: "Marks Report",
      kind: `${scope}_marks`,
      columns: marksCols(),
      rows: rows as never,
      summary: [
        { label: "Records", value: rows.length },
        { label: "Average", value: `${avg.toFixed(1)}%` },
        { label: "Pass %", value: `${pct(passed, rows.length)}%` },
      ],
    },
    kpis: [
      { label: "Average", value: `${avg.toFixed(1)}%` },
      { label: "Highest", value: `${highest}%` },
      { label: "Lowest", value: `${lowest}%` },
      { label: "Pass %", value: `${pct(passed, rows.length)}%` },
      { label: "Fail %", value: `${pct(failed, rows.length)}%` },
    ],
    charts: rows.length
      ? [
          { type: "bar", title: "Marks Distribution", data: dist },
          { type: "pie", title: "Pass vs Fail", variant: "donut", data: [{ name: "Pass", value: passed }, { name: "Fail", value: failed }] },
          { type: "bar", title: "Subject Average (%)", data: subjChart },
        ]
      : [],
  };
}

function marksCols(): ReportColumn[] {
  return [
    { key: "roll", label: "Roll" },
    { key: "student", label: "Student" },
    { key: "subject", label: "Subject" },
    { key: "internal", label: "Internal", align: "right" },
    { key: "assignment", label: "Assignment", align: "right" },
    { key: "quiz", label: "Quiz", align: "right" },
    { key: "lab", label: "Lab", align: "right" },
    { key: "total", label: "Total", align: "right" },
    { key: "percentage", label: "%", align: "right" },
    { key: "grade", label: "Grade" },
    { key: "result", label: "Result" },
  ];
}

/* ==================== ASSIGNMENTS ==================== */

async function fetchAssignmentReport(f: ReportFilters, scope: ReportRole): Promise<ReportResult> {
  let q = supabase
    .from("assignments")
    .select("id, title, catalog_subject_id, department_id, semester, publish_status, due_date, created_by, max_marks")
    .order("due_date", { ascending: false })
    .limit(5000);
  if (f.department) q = q.eq("department_id", f.department);
  if (f.semester) q = q.eq("semester", Number(f.semester));
  if (f.subject_id) q = q.eq("catalog_subject_id", f.subject_id);
  if (f.faculty_id) q = q.eq("created_by", f.faculty_id);
  if (f.assignment_id) q = q.eq("id", f.assignment_id);
  if (f.status) q = q.eq("publish_status", f.status);
  if (f.date_from) q = q.gte("due_date", f.date_from);
  if (f.date_to) q = q.lte("due_date", f.date_to);
  const assignments = await fetchAll<{
    id: string; title: string; catalog_subject_id: string | null; department_id: string | null; semester: number | null;
    publish_status: string | null; due_date: string | null; created_by: string | null; max_marks: number | null;
  }>(q);
  if (!assignments.length) return empty("Assignment Report", `${scope}_assignments`, assignmentCols());

  const ids = assignments.map((a) => a.id);
  const [{ data: subs }, studentCounts, submissionsRes] = await Promise.all([
    supabase.from("subjects").select("id, subject_name"),
    countStudentsPerAssignment(assignments),
    supabase.from("assignment_submissions").select("assignment_id, submitted_at, marks").in("assignment_id", ids),
  ]);
  const smap = new Map((subs ?? []).map((s) => [s.id, s.subject_name] as const));
  const subs2 = submissionsRes.data ?? [];

  const rows = assignments.map((a) => {
    const subsForA = subs2.filter((s) => s.assignment_id === a.id);
    const submitted = subsForA.length;
    const totalStu = studentCounts.get(a.id) ?? 0;
    const pending = Math.max(0, totalStu - submitted);
    const late = a.due_date ? subsForA.filter((s) => s.submitted_at > a.due_date!).length : 0;
    const marksArr = subsForA.map((s) => Number(s.marks)).filter((v) => !Number.isNaN(v) && v > 0);
    const avgMarks = marksArr.length ? marksArr.reduce((x, y) => x + y, 0) / marksArr.length : 0;
    return {
      title: a.title,
      subject: smap.get(a.catalog_subject_id ?? "") ?? "—",
      due_date: a.due_date,
      publish_status: a.publish_status ?? "—",
      total: totalStu,
      submitted,
      pending,
      late,
      avg_marks: marksArr.length ? avgMarks.toFixed(1) : "—",
      submission_pct: pct(submitted, totalStu),
      late_pct: pct(late, submitted),
    };
  });

  const totalStudentsSum = rows.reduce((s, r) => s + r.total, 0);
  const totalSubmitted = rows.reduce((s, r) => s + r.submitted, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const totalLate = rows.reduce((s, r) => s + r.late, 0);

  return {
    payload: {
      title: "Assignment Report",
      kind: `${scope}_assignments`,
      columns: assignmentCols(),
      rows: rows as never,
      summary: [
        { label: "Assignments", value: rows.length },
        { label: "Submissions", value: totalSubmitted },
      ],
    },
    kpis: [
      { label: "Assignments", value: rows.length },
      { label: "Submitted", value: totalSubmitted },
      { label: "Pending", value: totalPending },
      { label: "Submission %", value: `${pct(totalSubmitted, totalStudentsSum)}%` },
      { label: "Late %", value: `${pct(totalLate, totalSubmitted)}%` },
    ],
    charts: rows.length
      ? [
          { type: "bar", title: "Submission % per Assignment", data: rows.slice(0, 15).map((r) => ({ name: r.title.slice(0, 16), value: r.submission_pct })) },
          { type: "bar", title: "Late % per Assignment", data: rows.slice(0, 15).map((r) => ({ name: r.title.slice(0, 16), value: r.late_pct })) },
        ]
      : [],
  };
}

function assignmentCols(): ReportColumn[] {
  return [
    { key: "title", label: "Assignment" },
    { key: "subject", label: "Subject" },
    { key: "publish_status", label: "Status" },
    { key: "due_date", label: "Due", format: (v) => dateCol(v) },
    { key: "total", label: "Students", align: "right" },
    { key: "submitted", label: "Submitted", align: "right" },
    { key: "pending", label: "Pending", align: "right" },
    { key: "late", label: "Late", align: "right" },
    { key: "avg_marks", label: "Avg Marks", align: "right" },
  ];
}

async function countStudentsPerAssignment(assigns: { id: string; department_id: string | null; semester: number | null }[]) {
  const { data: profs } = await supabase.from("profiles").select("id, department_id, semester, status");
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
  const sids = new Set((roles ?? []).map((r) => r.user_id));
  const students = (profs ?? []).filter((p) => sids.has(p.id) && p.status === "active");
  const map = new Map<string, number>();
  for (const a of assigns) {
    let n = 0;
    for (const s of students) {
      if (s.department_id === a.department_id && (a.semester == null || s.semester === a.semester)) n += 1;
    }
    map.set(a.id, n);
  }
  return map;
}

/* ==================== QUIZ ==================== */

async function fetchQuizReport(f: ReportFilters, scope: ReportRole): Promise<ReportResult> {
  let qq = supabase
    .from("ai_quizzes")
    .select("id, title, catalog_subject_id, department_id, semester, section_id, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (f.department) qq = qq.eq("department_id", f.department);
  if (f.semester) qq = qq.eq("semester", Number(f.semester));
  if (f.subject_id) qq = qq.eq("catalog_subject_id", f.subject_id);
  if (f.faculty_id) qq = qq.eq("created_by", f.faculty_id);
  if (f.quiz_id) qq = qq.eq("id", f.quiz_id);
  if (f.date_from) qq = qq.gte("created_at", f.date_from);
  if (f.date_to) qq = qq.lte("created_at", f.date_to);
  const quizzes = await fetchAll<{
    id: string; title: string; catalog_subject_id: string | null; department_id: string | null;
    semester: number | null; section_id: string | null; created_by: string; created_at: string;
  }>(qq);
  if (!quizzes.length) return empty("Quiz Report", `${scope}_quizzes`, quizCols());

  const quizIds = quizzes.map((q) => q.id);
  const [{ data: attempts }, { data: assignsTbl }, { data: subs }, { data: profs }] = await Promise.all([
    supabase.from("quiz_attempts").select("quiz_id, student_id, score, total, status, submitted_at").in("quiz_id", quizIds),
    supabase.from("quiz_assignments").select("quiz_id, student_id").in("quiz_id", quizIds),
    supabase.from("subjects").select("id, subject_name"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const smap = new Map((subs ?? []).map((s) => [s.id, s.subject_name] as const));
  const pmap = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email] as const));

  // Assigned count: quiz_assignments if any, else eligible students in dept/sem
  const { data: allProfs } = await supabase.from("profiles").select("id, department_id, semester, section, status");
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
  const sids = new Set((roles ?? []).map((r) => r.user_id));
  const students = (allProfs ?? []).filter((p) => sids.has(p.id) && p.status === "active");

  const rows = quizzes.map((q) => {
    const att = (attempts ?? []).filter((a) => a.quiz_id === q.id);
    const explicit = (assignsTbl ?? []).filter((a) => a.quiz_id === q.id);
    const assigned = explicit.length > 0
      ? explicit.length
      : students.filter((s) =>
          (q.department_id == null || s.department_id === q.department_id) &&
          (q.semester == null || s.semester === q.semester),
        ).length;
    const uniqueAttempted = new Set(att.map((a) => a.student_id)).size;
    const pcts = att.map((a) => (Number(a.total) > 0 ? (Number(a.score) / Number(a.total)) * 100 : 0));
    const avgScore = pcts.length ? pcts.reduce((x, y) => x + y, 0) / pcts.length : 0;
    const highest = pcts.length ? Math.max(...pcts) : 0;
    const lowest = pcts.length ? Math.min(...pcts) : 0;
    const passed = pcts.filter((p) => p >= 40).length;
    return {
      title: q.title,
      subject: smap.get(q.catalog_subject_id ?? "") ?? "—",
      faculty: pmap.get(q.created_by) ?? "—",
      assigned,
      attempted: uniqueAttempted,
      avg_score: `${avgScore.toFixed(1)}%`,
      avg_score_num: avgScore,
      highest: `${highest.toFixed(1)}%`,
      lowest: `${lowest.toFixed(1)}%`,
      pass_pct: `${pct(passed, pcts.length)}%`,
      fail_pct: `${pct(pcts.length - passed, pcts.length)}%`,
      completion: pct(uniqueAttempted, assigned),
    };
  });

  const totalAttempts = (attempts ?? []).length;
  const allPcts = (attempts ?? []).map((a) => (Number(a.total) > 0 ? (Number(a.score) / Number(a.total)) * 100 : 0));
  const overallAvg = allPcts.length ? allPcts.reduce((x, y) => x + y, 0) / allPcts.length : 0;
  const overallCompletion = rows.length ? rows.reduce((s, r) => s + r.completion, 0) / rows.length : 0;

  const buckets = [0, 40, 55, 70, 85, 101];
  const labels = ["<40", "40-54", "55-69", "70-84", "85-100"];
  const dist = labels.map((l, i) => ({ name: l, value: allPcts.filter((p) => p >= buckets[i] && p < buckets[i + 1]).length }));

  return {
    payload: {
      title: "Quiz Report",
      kind: `${scope}_quizzes`,
      columns: quizCols(),
      rows: rows as never,
      summary: [
        { label: "Quizzes", value: rows.length },
        { label: "Attempts", value: totalAttempts },
      ],
    },
    kpis: [
      { label: "Total Quizzes", value: rows.length },
      { label: "Attempts", value: totalAttempts },
      { label: "Average Score", value: `${overallAvg.toFixed(1)}%` },
      { label: "Completion %", value: `${overallCompletion.toFixed(1)}%` },
    ],
    charts: rows.length
      ? [
          { type: "bar", title: "Score Distribution", data: dist },
          { type: "bar", title: "Attempts per Quiz", data: rows.slice(0, 15).map((r) => ({ name: r.title.slice(0, 16), value: r.attempted })) },
          { type: "bar", title: "Average Score per Quiz (%)", data: rows.slice(0, 15).map((r) => ({ name: r.title.slice(0, 16), value: Math.round(r.avg_score_num * 10) / 10 })) },
        ]
      : [],
  };
}

function quizCols(): ReportColumn[] {
  return [
    { key: "title", label: "Quiz" },
    { key: "subject", label: "Subject" },
    { key: "faculty", label: "Faculty" },
    { key: "assigned", label: "Assigned", align: "right" },
    { key: "attempted", label: "Attempted", align: "right" },
    { key: "avg_score", label: "Avg Score", align: "right" },
    { key: "highest", label: "Highest", align: "right" },
    { key: "lowest", label: "Lowest", align: "right" },
    { key: "pass_pct", label: "Pass %", align: "right" },
    { key: "fail_pct", label: "Fail %", align: "right" },
  ];
}

/* ==================== AI USAGE ==================== */

async function fetchAiUsageReport(f: ReportFilters): Promise<ReportResult> {
  const usage = await getAiUsage({
    data: { date_from: f.date_from ?? null, date_to: f.date_to ?? null },
  });
  const k = usage.kpis;

  const columns: ReportColumn[] = [
    { key: "user", label: "User" },
    { key: "title", label: "Conversation" },
    { key: "module", label: "Feature" },
    { key: "created_at", label: "Created", format: (v) => dateCol(v) },
  ];

  const kpis: ReportKPI[] = [
    { label: "Total Conversations", value: k.totalConversations },
    { label: "Total Messages", value: k.totalMessages },
    { label: "Unique Users", value: k.uniqueUsers },
    { label: "Avg Msgs / Conv", value: k.avgMessagesPerConversation },
    { label: "AI Summaries", value: k.summariesGenerated },
    { label: "Study Plans", value: k.studyPlansGenerated },
    { label: "AI Quizzes", value: k.aiQuizzesGenerated },
    { label: "Most Used Feature", value: k.mostUsedFeature },
    { label: "Most Active User", value: k.mostActiveUser },
    { label: "Avg Prompt Length", value: `${k.avgPromptLength} chars` },
    { label: "Avg Response Length", value: `${k.avgResponseLength} chars` },
    { label: "Longest Conversation", value: `${k.longestConversation} msgs` },
  ];

  const charts: ChartSpec[] = [
    { type: "line", title: "Daily Messages", data: usage.daily },
    { type: "line", title: "Weekly Usage", data: usage.weekly },
    { type: "line", title: "Monthly Usage", data: usage.monthly },
    { type: "line", title: "Conversations per Day", data: usage.conversationsPerDay },
    { type: "pie", title: "Feature Usage", variant: "donut", data: usage.byModule },
    { type: "pie", title: "Prompt Categories", variant: "donut", data: usage.promptCategories },
    {
      type: "bar",
      title: "Most Active Users",
      orientation: "horizontal",
      data: usage.topUsers.map((u) => ({ name: u.user.slice(0, 20), value: u.messages })),
    },
  ];

  return {
    payload: {
      title: "AI Usage Report",
      kind: "admin_ai_usage",
      columns,
      rows: usage.rows as never,
      summary: kpis
        .filter((x) => typeof x.value === "number" || typeof x.value === "string")
        .map((x) => ({ label: x.label, value: x.value })),
    },
    kpis,
    charts,
  };
}


/* ==================== Empty helper ==================== */

function empty(title: string, kind: string, columns: ReportColumn[]): ReportResult {
  return {
    payload: { title, kind, columns, rows: [] },
    kpis: [{ label: "Records", value: 0 }],
    charts: [],
  };
}

/* ==================== Definitions ==================== */

export const REPORTS: ReportDefinition[] = [
  // Admin
  {
    id: "admin_students", role: "admin", title: "Student Report",
    description: "Every student with attendance, submissions, quiz and marks averages.",
    filters: ["department", "semester", "section", "status", "student_id"],
    fetch: (f) => fetchStudentReport(f),
  },
  {
    id: "admin_faculty", role: "admin", title: "Faculty Report",
    description: "Faculty workload, subjects, students and average attendance.",
    filters: ["department", "faculty_id", "subject_id", "status"],
    fetch: (f) => fetchFacultyReport(f),
  },
  {
    id: "admin_attendance", role: "admin", title: "Attendance Report",
    description: "Attendance history with daily, monthly and subject trends.",
    filters: ["department", "semester", "section", "faculty_id", "subject_id", "date_from", "date_to"],
    fetch: (f) => fetchAttendanceReport(f, "admin"),
  },
  {
    id: "admin_marks", role: "admin", title: "Marks Report",
    description: "Consolidated marks with grade, result and subject averages.",
    filters: ["department", "semester", "section", "faculty_id", "subject_id", "assessment_id"],
    fetch: (f) => fetchMarksReport(f, "admin"),
  },
  {
    id: "admin_assignments", role: "admin", title: "Assignment Report",
    description: "Submission, pending, late counts and average marks.",
    filters: ["department", "semester", "faculty_id", "subject_id", "assignment_id"],
    fetch: (f) => fetchAssignmentReport(f, "admin"),
  },
  {
    id: "admin_quizzes", role: "admin", title: "Quiz Report",
    description: "Assigned vs attempted, score stats and pass/fail rates.",
    filters: ["department", "semester", "section", "faculty_id", "subject_id", "quiz_id", "date_from", "date_to"],
    fetch: (f) => fetchQuizReport(f, "admin"),
  },
  {
    id: "admin_ai_usage", role: "admin", title: "AI Usage Report",
    description: "AI Assistant, Summaries, Study Plans and AI Quizzes usage.",
    filters: ["date_from", "date_to"],
    fetch: (f) => fetchAiUsageReport(f),
  },
  // Faculty
  {
    id: "faculty_attendance", role: "faculty", title: "Attendance Report",
    description: "Attendance you have marked, scoped to your subjects.",
    filters: ["semester", "section", "subject_id", "date_from", "date_to"],
    fetch: (f) => fetchAttendanceReport(f, "faculty"),
  },
  {
    id: "faculty_marks", role: "faculty", title: "Marks Report",
    description: "Marks you have entered.",
    filters: ["semester", "section", "subject_id", "assessment_id"],
    fetch: (f) => fetchMarksReport(f, "faculty"),
  },
  {
    id: "faculty_assignments", role: "faculty", title: "Assignment Report",
    description: "Your assignments with submission stats.",
    filters: ["semester", "subject_id", "assignment_id"],
    fetch: (f) => fetchAssignmentReport(f, "faculty"),
  },
  {
    id: "faculty_quizzes", role: "faculty", title: "Quiz Report",
    description: "Attempts on quizzes you created.",
    filters: ["semester", "section", "subject_id", "quiz_id", "date_from", "date_to"],
    fetch: (f) => fetchQuizReport(f, "faculty"),
  },
  // Student
  {
    id: "student_attendance", role: "student", title: "Attendance Summary",
    description: "Your attendance history and trends.",
    filters: ["subject_id", "date_from", "date_to"],
    fetch: (f) => fetchAttendanceReport(f, "student"),
  },
  {
    id: "student_marks", role: "student", title: "Marks Report",
    description: "Your marks across subjects.",
    filters: ["subject_id", "assessment_id"],
    fetch: (f) => fetchMarksReport(f, "student"),
  },
  {
    id: "student_assignments", role: "student", title: "Assignment Summary",
    description: "Your assignments and submission status.",
    filters: ["subject_id", "assignment_id"],
    fetch: (f) => fetchAssignmentReport(f, "student"),
  },
  {
    id: "student_quizzes", role: "student", title: "Quiz Summary",
    description: "Your quiz attempts.",
    filters: ["subject_id", "quiz_id", "date_from", "date_to"],
    fetch: (f) => fetchQuizReport(f, "student"),
  },
];

export function getReportsForRole(role: ReportRole): ReportDefinition[] {
  return REPORTS.filter((r) => r.role === role);
}
export function findReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}

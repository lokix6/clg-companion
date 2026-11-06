import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Megaphone,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { computeProfileCompletion } from "@/lib/dashboard/profile-completion";
import { cn } from "@/lib/utils";
import { subjectsQuery, timetableQuery } from "@/features/academic/queries";
import { studentAssignmentsQuery } from "@/features/assignments/queries";
import { todayDayName } from "@/features/academic/types";
import { formatTime } from "@/features/academic/timetable/TimetableCard";
import { attendanceQuery } from "@/features/attendance/queries";
import { computeAnalytics } from "@/features/attendance/analytics";
import { notesQuery } from "@/features/notes/queries";
import { categorize, formatBytes, readableType } from "@/features/notes/types";
import { NotebookPen } from "lucide-react";
import { announcementsQuery, eventsQuery } from "@/features/communication/queries";
import { isPastEvent, relativeTime, formatEventTime } from "@/features/communication/types";
import { AnnouncementPriorityBadge, EventCategoryBadge } from "@/features/communication/Badges";
import { ExportButton } from "@/features/reports/ExportDialog";
import { remindersQuery } from "@/features/reminders/queries";
import { ReminderBadge } from "@/features/reminders/ReminderBadge";
import { reminderStatus } from "@/features/reminders/types";
import { attendanceHistoryQuery } from "@/features/attendance-history/queries";
import { computeOverallTrend } from "@/features/attendance-history/analytics";
import { AttendanceTrendChart } from "@/features/attendance-history/AttendanceTrendChart";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduFlow" },
      { name: "description", content: "Your EduFlow student dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
} as const;

function DashboardHome() {
  const { profile, user } = useAuth();
  const uid = user?.id;

  const subjectsQ = useQuery(subjectsQuery(uid));
  const timetableQ = useQuery(timetableQuery(uid));
  const assignmentsQ = useQuery(studentAssignmentsQuery());
  const attendanceQ = useQuery(attendanceQuery(uid));
  const notesQ = useQuery(notesQuery(uid));
  const announcementsQ = useQuery(announcementsQuery(uid));
  const eventsQ = useQuery(eventsQuery(uid));
  const remindersQ = useQuery(remindersQuery(uid));
  const historyQ = useQuery(attendanceHistoryQuery(uid));

  const subjects = subjectsQ.data ?? [];
  const entries = timetableQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const attendance = attendanceQ.data ?? [];
  const notes = notesQ.data ?? [];
  const announcements = announcementsQ.data ?? [];
  const events = eventsQ.data ?? [];
  const today = todayDayName();
  const now = Date.now();
  const weekMs = 7 * 86_400_000;

  const todayClasses = useMemo(
    () =>
      entries
        .filter((e) => e.day_of_week === today)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [entries, today],
  );
  const pendingCount = assignments.filter((a) => !a.submission_id).length;
  const upcomingDeadlines = assignments.filter(
    (a) =>
      !a.submission_id &&
      new Date(a.due_date).getTime() >= now &&
      new Date(a.due_date).getTime() - now <= weekMs,
  ).length;
  const recentAssignments = useMemo(
    () =>
      [...assignments]
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5),
    [assignments],
  );
  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const attendanceAnalytics = useMemo(
    () => computeAnalytics(attendance, subjectsById),
    [attendance, subjectsById],
  );
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const firstName = displayName.split(" ")[0];
  const initials =
    displayName
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";
  const branchLine = [profile?.branch, profile?.semester ? `Sem ${profile.semester}` : null]
    .filter(Boolean)
    .join(" • ");
  const completion = computeProfileCompletion(profile);

  const summaryCards = [
    { label: "Total Subjects", value: String(subjects.length), icon: GraduationCap, tone: "primary" as const, to: "/dashboard/subjects" },
    { label: "Today's Classes", value: String(todayClasses.length), icon: BookOpen, tone: "secondary" as const, to: "/dashboard/timetable" },
    { label: "Overall Attendance", value: attendance.length ? `${attendanceAnalytics.overall.toFixed(1)}%` : "—", icon: CalendarCheck, tone: "success" as const, to: "/dashboard/attendance" },
    { label: "Pending Assignments", value: String(pendingCount), icon: ClipboardList, tone: "warning" as const, to: "/dashboard/assignments" },
    { label: "Upcoming Deadlines", value: String(upcomingDeadlines), icon: CalendarDays, tone: "success" as const, to: "/dashboard/assignments" },
    { label: "Total Notes", value: String(notes.length), icon: NotebookPen, tone: "primary" as const, to: "/dashboard/notes" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description={`Here's what's happening today, ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton defaultKind="semester" label="Export report" />
            <Button asChild variant="outline">
              <Link to="/dashboard/profile">
                <UserIcon className="mr-1.5 h-4 w-4" /> View profile
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </div>
                <div className="mt-2 text-3xl font-bold">{c.value}</div>
              </div>
              <div className={cn("grid h-10 w-10 place-items-center rounded-xl", toneMap[c.tone])}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InfoCard className="xl:col-span-2">
          <SectionHeader
            title="Recent Assignments"
            description="Your latest assignments and their status."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/assignments">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {recentAssignments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No assignments yet"
                description="No data available yet."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentAssignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.subject_name || a.subject_code || "No subject"}
                        {" • Due "}
                        {new Date(a.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {a.review_status && a.review_status !== "Pending"
                          ? a.review_status
                          : a.submission_id
                            ? "Submitted"
                            : new Date(a.due_date).getTime() < now
                              ? "Overdue"
                              : "Pending"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="rounded-2xl bg-gradient-primary text-lg font-bold text-primary-foreground shadow-elegant">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {branchLine || profile?.college_name || "Complete your profile"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Profile completion</span>
              <span className="font-semibold">{completion.percent}%</span>
            </div>
            <Progress value={completion.percent} className="mt-2 h-2" />
            {completion.missing.length > 0 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                Missing: {completion.missing.join(", ")}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quick links
            </div>
            <Link to="/dashboard/profile" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
              <span>Edit profile</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/settings" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
              <span>Open settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </InfoCard>

        <InfoCard className="xl:col-span-2">
          <SectionHeader
            title="Today's Timetable"
            description={`Classes scheduled for ${today}.`}
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/timetable">
                  Open <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {todayClasses.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No classes today"
                description="No data available yet."
              />
            ) : (
              <ul className="divide-y divide-border">
                {todayClasses.map((e) => {
                  const s = subjectsById.get(e.subject_id);
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s?.subject_name ?? "Class"}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s?.faculty_name}
                          {(e.room_number || e.building) && ` • ${[e.room_number, e.building].filter(Boolean).join(", ")}`}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold">
                        {formatTime(e.start_time)} – {formatTime(e.end_time)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard>
          <SectionHeader
            title="Attendance Alerts"
            description="Subjects below the 75% threshold."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/attendance">
                  Open <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {attendance.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance records yet"
                description="Start tracking to see alerts."
              />
            ) : attendanceAnalytics.belowThreshold.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="You're on track"
                description="All subjects are at 75% or above."
              />
            ) : (
              <ul className="divide-y divide-border">
                {attendanceAnalytics.belowThreshold.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 truncate text-sm font-medium">{s.subjectName}</div>
                    <span className="shrink-0 text-xs font-semibold text-destructive">
                      {s.percent.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard className="xl:col-span-2">
          <SectionHeader
            title="Recently Uploaded Notes"
            description="Your latest study materials."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/notes">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {recentNotes.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title="No notes uploaded yet"
                description="Upload PDFs, docs, or images to build your library."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentNotes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {subjectsById.get(n.subject_id)?.subject_name ?? "—"}
                        {" • "}
                        {readableType(n.file_type)}
                        {" • "}
                        {formatBytes(n.file_size)}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard>
          <SectionHeader
            title="Latest Announcements"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/announcements">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {announcements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements"
                description="Campus updates will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {announcements.slice(0, 4).map((a) => (
                  <li key={a.id} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="flex items-center gap-2">
                      <AnnouncementPriorityBadge priority={a.priority} />
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{a.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard className="xl:col-span-2">
          <SectionHeader
            title="Upcoming Events"
            description="What's happening on campus next."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/events">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {(() => {
              const upcoming = events.filter((e) => !isPastEvent(e)).slice(0, 5);
              if (upcoming.length === 0) {
                return (
                  <EmptyState
                    icon={CalendarDays}
                    title="No upcoming events"
                    description="Check back soon for workshops and seminars."
                  />
                );
              }
              return (
                <ul className="divide-y divide-border">
                  {upcoming.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <EventCategoryBadge category={e.category} />
                          <span className="truncate text-sm font-medium">{e.title}</span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {new Date(`${e.event_date}T00:00:00`).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {" • "}
                          {formatEventTime(e)}
                          {" • "}
                          {e.venue}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InfoCard className="xl:col-span-2">
          <SectionHeader
            title="Attendance trend"
            description="Overall running percentage from your logged history."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/attendance-history">
                  Open <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {(() => {
              const trend = computeOverallTrend(historyQ.data ?? []);
              if (trend.length === 0) {
                return (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No history yet"
                    description="Log daily attendance to see your trend chart."
                  />
                );
              }
              return <AttendanceTrendChart data={trend} />;
            })()}
          </div>
        </InfoCard>

        <InfoCard>
          <SectionHeader
            title="Upcoming reminders"
            description="Don't miss an assignment deadline."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/reminders">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {(() => {
              const asgById = new Map(assignments.map((a) => [a.id, a]));
              const upcoming = (remindersQ.data ?? [])
                .filter((r) => {
                  if (r.is_dismissed) return false;
                  const a = asgById.get(r.assignment_id);
                  if (!a) return false;
                   const st = reminderStatus(
                     a.due_date,
                     a.review_status && a.review_status !== "Pending" ? "Completed" : "Pending",
                   );
                  return st !== "Completed";
                })
                .slice(0, 5);
              if (upcoming.length === 0) {
                return (
                  <EmptyState
                    icon={Bell}
                    title="No reminders"
                    description="Add a reminder from the reminders page."
                  />
                );
              }
              return (
                <ul className="divide-y divide-border">
                  {upcoming.map((r) => {
                    const a = asgById.get(r.assignment_id);
                     const st = a
                       ? reminderStatus(
                           a.due_date,
                           a.review_status && a.review_status !== "Pending" ? "Completed" : "Pending",
                         )
                       : "Upcoming";
                    return (
                      <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ReminderBadge status={st} />
                          </div>
                          <div className="mt-1 truncate text-sm font-medium">
                            {a?.title ?? "Assignment"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Notify {new Date(`${r.reminder_date}T00:00:00`).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

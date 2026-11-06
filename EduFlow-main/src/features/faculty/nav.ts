import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  NotebookPen,
  Megaphone,
  CalendarDays,
  Users,
  User,
  Settings,
  Award,
  CalendarClock,
  Sparkles,
  BrainCircuit,
  ClipboardList as ReportIcon,
  type LucideIcon,
} from "lucide-react";

export type FacultyNavItem = { label: string; to: string; icon: LucideIcon };

export const facultyNav: FacultyNavItem[] = [
  { label: "Dashboard", to: "/faculty/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", to: "/faculty/ai-assistant", icon: Sparkles },
  { label: "Quiz Generator", to: "/faculty/quiz-generator", icon: BrainCircuit },
  { label: "My Quizzes", to: "/faculty/quizzes", icon: BrainCircuit },
  { label: "Subjects", to: "/faculty/subjects", icon: BookOpen },
  { label: "Timetable", to: "/faculty/timetable", icon: CalendarClock },
  { label: "Attendance", to: "/faculty/attendance", icon: CalendarCheck },
  { label: "Assignments", to: "/faculty/assignments", icon: ClipboardList },
  { label: "Marks", to: "/faculty/marks", icon: Award },
  { label: "Notes", to: "/faculty/notes", icon: NotebookPen },
  { label: "Announcements", to: "/faculty/announcements", icon: Megaphone },
  { label: "Calendar", to: "/faculty/calendar", icon: CalendarDays },
  { label: "Students", to: "/faculty/students", icon: Users },
  { label: "Reports", to: "/faculty/reports", icon: ReportIcon },
  { label: "Profile", to: "/faculty/profile", icon: User },
  { label: "Settings", to: "/faculty/settings", icon: Settings },
];

export function getFacultyPageTitle(pathname: string): string {
  const match = [...facultyNav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  return match?.label ?? "Faculty";
}

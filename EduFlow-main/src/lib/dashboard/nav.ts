import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  NotebookPen,
  BookOpen,
  Megaphone,
  CalendarDays,
  Bell,
  BellRing,
  GraduationCap,
  History,
  User,
  Settings,
  Award,
  CalendarClock,
  FlaskConical,
  Sparkles,
  FileText,
  BrainCircuit,
  ClipboardList as ReportIcon,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
};

export const dashboardNav: DashboardNavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "EduFlow Lab", to: "/lab", icon: FlaskConical, enabled: true },
  { label: "AI Assistant", to: "/dashboard/ai-assistant", icon: Sparkles, enabled: true },
  { label: "AI Summarizer", to: "/dashboard/summarizer", icon: FileText, enabled: true },
  { label: "Study Planner", to: "/dashboard/study-planner", icon: BrainCircuit, enabled: true },
  { label: "Quizzes", to: "/dashboard/quizzes", icon: BrainCircuit, enabled: true },
  { label: "Daily Aptitude", to: "/dashboard/aptitude", icon: BookOpen, enabled: true },
  { label: "Subjects", to: "/dashboard/subjects", icon: GraduationCap, enabled: true },
  { label: "Class Schedule", to: "/dashboard/schedule", icon: CalendarClock, enabled: true },
  { label: "Timetable", to: "/dashboard/timetable", icon: BookOpen, enabled: true },
  { label: "Assignments", to: "/dashboard/assignments", icon: ClipboardList, enabled: true },
  { label: "Reminders", to: "/dashboard/reminders", icon: BellRing, enabled: true },
  { label: "Attendance", to: "/dashboard/attendance", icon: CalendarCheck, enabled: true },
  { label: "Attendance History", to: "/dashboard/attendance-history", icon: History, enabled: true },
  { label: "Notes", to: "/dashboard/notes", icon: NotebookPen, enabled: true },
  { label: "Results", to: "/dashboard/results", icon: Award, enabled: true },
  { label: "Announcements", to: "/dashboard/announcements", icon: Megaphone, enabled: true },
  { label: "Calendar", to: "/dashboard/calendar", icon: CalendarDays, enabled: true },
  { label: "Events", to: "/dashboard/events", icon: CalendarDays, enabled: true },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell, enabled: true },
  { label: "Reports", to: "/dashboard/reports", icon: ReportIcon, enabled: true },
  { label: "Profile", to: "/dashboard/profile", icon: User, enabled: true },
  { label: "Settings", to: "/dashboard/settings", icon: Settings, enabled: true },
];

export function getPageTitle(pathname: string): string {
  const match = dashboardNav.find(
    (i) => i.to === pathname || (i.to !== "/dashboard" && pathname.startsWith(i.to)),
  );
  return match?.label ?? "Dashboard";
}


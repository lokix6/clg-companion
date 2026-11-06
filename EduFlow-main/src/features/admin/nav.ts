import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Mail,
  Building2,
  BookOpen,
  CalendarCheck,
  Megaphone,
  CalendarDays,
  BarChart3,
  ClipboardList,
  Bell,
  History,
  Settings as SettingsIcon,
  Upload,
  Award,
  BrainCircuit,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export const adminNav: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Students", to: "/admin/students", icon: Users },
  { label: "Student Import", to: "/admin/students-import", icon: Upload },
  { label: "Faculty", to: "/admin/faculty", icon: GraduationCap },
  { label: "Invites", to: "/admin/invites", icon: Mail },
  { label: "Departments", to: "/admin/departments", icon: Building2 },
  { label: "Subjects", to: "/admin/subjects", icon: BookOpen },
  { label: "Timetable", to: "/admin/timetable", icon: CalendarClock },
  { label: "Attendance", to: "/admin/attendance", icon: CalendarCheck },
  { label: "Assignments", to: "/admin/assignments", icon: ClipboardList },
  { label: "Results", to: "/admin/results", icon: Award },
  { label: "Quiz Analytics", to: "/admin/quizzes", icon: BrainCircuit },
  { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
  { label: "Calendar", to: "/admin/calendar", icon: CalendarDays },
  { label: "Events", to: "/admin/events", icon: CalendarDays },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Reports", to: "/admin/reports", icon: ClipboardList },
  { label: "Notifications", to: "/admin/notifications", icon: Bell },
  { label: "Activity Log", to: "/admin/activity", icon: History },
  { label: "Settings", to: "/admin/settings", icon: SettingsIcon },
];

export function getAdminPageTitle(pathname: string): string {
  const match = [...adminNav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  return match?.label ?? "Admin";
}

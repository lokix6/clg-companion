import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/aptitude")({
  head: () => ({
    meta: [
      { title: "Daily Aptitude & Reasoning Practice — EduFlow" },
      {
        name: "description",
        content:
          "Daily aptitude practice for placement readiness: quantitative aptitude, logical reasoning, verbal ability, and data interpretation.",
      },
      { property: "og:title", content: "Daily Aptitude & Reasoning Practice — EduFlow" },
      {
        property: "og:description",
        content:
          "Practice placement-style aptitude questions every day and track your streak on EduFlow.",
      },
    ],
  }),
  component: () => <Outlet />,
});

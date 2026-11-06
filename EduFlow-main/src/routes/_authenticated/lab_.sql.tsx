import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { QuestionWorkspace } from "@/features/lab/QuestionWorkspace";

export const Route = createFileRoute("/_authenticated/lab_/sql")({
  head: () => ({
    meta: [
      { title: "SQL Lab — EduFlow Lab" },
      {
        name: "description",
        content:
          "Practice SQL with real questions on an isolated PostgreSQL engine — run queries, get instant feedback, and track your progress.",
      },
      { property: "og:title", content: "SQL Lab — EduFlow Lab" },
      {
        property: "og:description",
        content: "Interactive SQL practice with instant evaluation inside EduFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SqlLabPage,
});

function SqlLabPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SQL Lab"
        description="Write real SQL against a practice database that runs entirely in your browser. Run queries freely, then submit when you're confident."
      />
      <QuestionWorkspace />
    </div>
  );
}

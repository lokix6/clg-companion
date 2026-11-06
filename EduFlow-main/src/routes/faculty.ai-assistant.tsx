import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AiChatWindow } from "@/features/ai/AiChatWindow";

export const Route = createFileRoute("/faculty/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 min-w-0 max-w-full flex-col overflow-hidden">
      <div className="shrink-0 pb-6">
        <PageHeader
          title="Faculty AI Assistant"
          description="Generate lesson plans, explanations, assignments, quizzes, MCQs, and viva questions — powered by Google Gemini."
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AiChatWindow
          roleContext="faculty"
          module="assistant"
          title="EduFlow Faculty AI"
          suggestedPrompts={[
            "Draft a 45-minute lesson plan on TCP/IP layers",
            "Generate 10 MCQs on binary search trees with answers",
            "Write viva questions for the DBMS lab on normalization",
            "Suggest an assignment on OS process scheduling with rubric",
          ]}
        />
      </div>
    </div>
  );
}

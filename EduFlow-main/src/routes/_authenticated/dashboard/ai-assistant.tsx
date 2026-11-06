import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AiChatWindow } from "@/features/ai/AiChatWindow";

export const Route = createFileRoute("/_authenticated/dashboard/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Study Assistant — EduFlow" },
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
          title="AI Study Assistant"
          description="Ask academic questions, get explanations, worked examples, and revision help — powered by Google Gemini."
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AiChatWindow
          roleContext="student"
          module="assistant"
          title="EduFlow AI"
          suggestedPrompts={[
            "Explain Big-O notation with a real-world example",
            "Generate 5 interview questions on operating systems",
            "Give me revision notes for DBMS normalization",
            "Explain the Krebs cycle step by step",
          ]}
        />
      </div>
    </div>
  );
}

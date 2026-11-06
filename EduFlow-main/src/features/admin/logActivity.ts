import { supabase } from "@/integrations/supabase/client";

export type ActivityInput = {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAdminActivity(input: ActivityInput): Promise<void> {
  try {
    await supabase.from("activity_log").insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch (e) {
    console.warn("[activity_log] insert failed", e);
  }
}

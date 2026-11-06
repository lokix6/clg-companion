import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactPayload = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(5000),
  submissionId: z.string().trim().max(100).optional(),
});

export const notifyContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactPayload.parse(data))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const result = await sendTemplateEmail("contact-notification", "", {
        templateData: {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        },
        replyTo: data.email,
        idempotencyKey: `contact-notification-${data.submissionId ?? crypto.randomUUID()}`,
      });
      return { sent: result.sent };
    } catch (error) {
      console.error("[contact] notification failed", error);
      return { sent: false };
    }
  });

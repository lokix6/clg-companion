import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rowSchema = z.object({
  roll_number: z.string().trim().min(1).max(64),
  full_name: z.string().trim().min(1).max(200),
  department_id: z.string().uuid(),
  section: z.string().trim().min(1).max(16),
  semester: z.number().int().min(1).max(12),
  // Email is REQUIRED. We no longer synthesize a deterministic
  // "<roll>@eduflow.local" fallback, because anyone who knew a roll number
  // could then guess the login identity.
  email: z.string().trim().email().max(255),
  // Never accept caller-supplied passwords for bulk import. The server
  // always generates a unique cryptographically-random temporary password
  // per student so bulk imports cannot share a guessable default.
});

const inputSchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export type StudentImportRow = z.infer<typeof rowSchema>;

export type StudentImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ roll_number: string; email: string; error: string }>;
  items: Array<{
    roll_number: string;
    email: string;
    status: "created" | "updated" | "skipped" | "error";
    message?: string;
    temporary_password?: string;
  }>;
};

// Generate a cryptographically-random temporary password.
// Includes an upper, lower, digit and symbol to satisfy common policies.
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const rand = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const pick = (set: string) => set[rand(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = 0; i < 12; i++) chars.push(pick(all));
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<StudentImportResult> => {
    // Verify caller is an admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result: StudentImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      items: [],
    };
    console.log(`[importStudents] starting; rows=${data.rows.length} by=${context.userId}`);


    for (const row of data.rows) {
      const email = row.email.trim().toLowerCase();
      // Always generate a unique random password per student. No shared default.
      const generatedPassword = generateTempPassword();
      const password = generatedPassword;
      try {
        // Try to create the auth user
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: row.full_name,
            branch: row.section,
            semester: row.semester,
          },
        });

        let userId: string | null = created?.user?.id ?? null;
        let action: "created" | "updated" = "created";

        if (createErr) {
          // Duplicate / existing user — look them up
          const msg = createErr.message.toLowerCase();
          const looksExisting =
            msg.includes("already been registered") ||
            msg.includes("already exists") ||
            msg.includes("duplicate");
          if (!looksExisting) {
            console.error(`[importStudents] createUser failed for ${email}:`, createErr);
            throw createErr;
          }

          // Fetch existing user id via profiles first
          const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (existing?.id) {
            userId = existing.id;
          } else {
            // Fallback: scan auth users (paginated) to find by email
            let found: string | null = null;
            for (let page = 1; page <= 20 && !found; page++) {
              const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage: 200,
              });
              if (listErr) throw listErr;
              const match = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
              if (match) found = match.id;
              if (!list?.users?.length || list.users.length < 200) break;
            }
            if (!found) throw createErr;
            userId = found;
          }
          action = "updated";
        }


        if (!userId) throw new Error("No user id returned");

        // Ensure the user has the student role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });

        // Update profile with imported fields
        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: row.full_name,
            email,
            roll_number: row.roll_number.trim().toUpperCase(),
            section: row.section.trim().toUpperCase(),
            semester: row.semester,
            department_id: row.department_id,
            branch: row.section.trim().toUpperCase(),
            must_change_password: true,
            status: "active",
          })
          .eq("id", userId);
        if (upErr) throw upErr;

        if (action === "created") result.created += 1;
        else result.updated += 1;
        result.items.push({
          roll_number: row.roll_number,
          email,
          status: action,
          // Only surface the generated password to the admin for newly created accounts.
          // Deliver it out-of-band; the student must change it on first login (must_change_password=true).
          temporary_password: action === "created" ? generatedPassword : undefined,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`[importStudents] row failed roll=${row.roll_number} email=${email}:`, message);
        result.errors.push({ roll_number: row.roll_number, email, error: message });
        result.items.push({ roll_number: row.roll_number, email, status: "error", message });
      }
    }

    console.log(`[importStudents] done; created=${result.created} updated=${result.updated} errors=${result.errors.length}`);
    return result;

  });

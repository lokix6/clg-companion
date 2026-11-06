import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/change-password")({
  head: () => ({ meta: [{ title: "Change password — EduFlow" }, { name: "robots", content: "noindex" }] }),
  component: ChangePasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

type FormValues = z.infer<typeof schema>;

function ChangePasswordPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (v: FormValues) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: v.password });
      if (error) throw error;
      const { error: rpcErr } = await supabase.rpc("clear_must_change_password" as never);
      if (rpcErr) throw rpcErr;
      await qc.invalidateQueries({ queryKey: ["must-change-password"] });
      toast.success("Password updated");
      nav({ to: "/dashboard" });
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err?.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Change password" description="Set a new password for your EduFlow account." />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-card space-y-4"
      >
        <div className="space-y-2">
          <Label>New password</Label>
          <Input type="password" autoComplete="new-password" {...register("password")} />
          {formState.errors.password && (
            <p className="text-xs text-destructive">{formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Confirm password</Label>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
          {formState.errors.confirm && (
            <p className="text-xs text-destructive">{formState.errors.confirm.message}</p>
          )}
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

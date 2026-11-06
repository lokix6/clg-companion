import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logAdminActivity } from "@/features/admin/logActivity";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  const pick = (i: number) => chars[buf[i] % chars.length];
  return `${pick(0)}${pick(1)}${pick(2)}${pick(3)}-${pick(4)}${pick(5)}${pick(6)}${pick(7)}`;
}


type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
};

export function InviteDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [expiresDays, setExpiresDays] = useState("7");
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const depts = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) throw new Error("Email is required");
      const code = generateCode();
      const expires_at = new Date(
        Date.now() + parseInt(expiresDays, 10) * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { error } = await supabase.from("faculty_invites").insert({
        code,
        email: trimmedEmail,
        full_name: fullName.trim() || null,
        department_id: departmentId || null,
        invited_by: user.id,
        expires_at,
      });
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Created faculty invite",
        targetType: "invite",
        metadata: { email: trimmedEmail, code },
      });
      return code;
    },
    onSuccess: (code) => {
      const link = `${window.location.origin}/join/${code}`;
      setCreatedLink(link);
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
      onCreated?.();
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Failed"),
  });

  const reset = () => {
    setEmail("");
    setFullName("");
    setDepartmentId("");
    setExpiresDays("7");
    setCreatedLink(null);
  };

  const copyLink = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    toast.success("Invite link copied");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{createdLink ? "Invite created" : "Invite Faculty"}</DialogTitle>
          <DialogDescription>
            {createdLink
              ? "Share this single-use link with the invitee. It expires automatically."
              : "Generates a private join link bound to this email address."}
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs break-all">
              {createdLink}
            </div>
            <Button className="w-full" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email *</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@college.edu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full name (optional)</Label>
              <Input
                id="inv-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Priya Rao"
              />
            </div>
            {(depts.data ?? []).length > 0 && (
              <div className="space-y-1.5">
                <Label>Department (optional)</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(depts.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Expires in</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdLink ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !email.trim()}
                className="bg-gradient-primary"
              >
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate invite
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const BUCKET = "profile-avatars";

export function AvatarUpload({
  userId,
  avatarUrl,
  fallback,
  onChange,
}: {
  userId: string;
  avatarUrl: string | null;
  fallback: string;
  onChange: (url: string | null) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only PNG, JPEG or WebP images are allowed");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (upErr) {
        console.error("[Avatar] storage upload failed", upErr);
        throw upErr;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) {
        console.error("[Avatar] createSignedUrl failed", signErr);
        throw signErr;
      }

      await onChange(signed.signedUrl);
      toast.success("Avatar updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      // Best-effort cleanup of previous files in the user's folder
      const { data: list } = await supabase.storage.from(BUCKET).list(userId);
      if (list && list.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(list.map((f) => `${userId}/${f.name}`));
      }
      await onChange(null);
      toast.success("Avatar removed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not remove avatar";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <Avatar className="h-24 w-24 border border-border shadow-card">
          <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
          <AvatarFallback className="bg-gradient-primary text-xl font-bold text-primary-foreground">
            {fallback}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={handlePick}
          disabled={busy}
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
          aria-label="Change avatar"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={busy}>
            <Upload className="mr-1.5 h-4 w-4" /> {avatarUrl ? "Replace" : "Upload"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={busy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          PNG, JPEG or WebP · max 2 MB
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}

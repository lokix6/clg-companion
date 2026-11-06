import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FacultySidebar } from "./FacultySidebar";
import { FacultyTopbar } from "./FacultyTopbar";
import { useAuth } from "@/lib/auth/AuthProvider";

export function FacultyShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <FacultySidebar open={open} onClose={() => setOpen(false)} onSignOut={handleSignOut} />
      <div className="min-w-0 max-w-full overflow-x-hidden lg:pl-72">
        <FacultyTopbar onOpenSidebar={() => setOpen(true)} />
        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

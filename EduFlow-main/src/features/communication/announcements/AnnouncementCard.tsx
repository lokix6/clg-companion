import { Pencil, Trash2, Users, Building2, Layers, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { AnnouncementPriorityBadge } from "../Badges";
import { relativeTime } from "../types";
import type { AnnouncementForMe } from "../queries";

const audienceIcon = {
  College: Users,
  Department: Building2,
  Semester: Layers,
  Subject: BookOpen,
};

export function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  canManage,
}: {
  announcement: AnnouncementForMe;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}) {
  const AI = audienceIcon[announcement.audience_type] ?? Users;
  const audienceLabel =
    announcement.audience_type === "College"
      ? "Entire College"
      : announcement.audience_type === "Department"
        ? announcement.department_name ?? "Department"
        : announcement.audience_type === "Semester"
          ? `${announcement.department_name ?? "Dept"} — Sem ${announcement.target_semester}`
          : announcement.subject_name ?? "Subject";
  return (
    <InfoCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AnnouncementPriorityBadge priority={announcement.priority} />
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
              <AI className="h-3 w-3" /> {audienceLabel}
            </span>
            {announcement.publish_status === "Draft" && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">Draft</span>
            )}
            {announcement.publish_status === "Archived" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Archived</span>
            )}
            <span className="text-[11px] text-muted-foreground">{relativeTime(announcement.created_at)}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold">{announcement.title}</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{announcement.description}</p>
          {announcement.created_by_name && (
            <p className="mt-2 text-xs text-muted-foreground">— {announcement.created_by_name}</p>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>
    </InfoCard>
  );
}

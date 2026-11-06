import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AnnouncementCategory,
  AnnouncementPriority,
  EventCategory,
  NotificationType,
} from "./types";

const announcementCategoryStyle: Record<AnnouncementCategory, string> = {
  Academic: "bg-primary/10 text-primary border-primary/30",
  Examination: "bg-destructive/10 text-destructive border-destructive/30",
  Placement: "bg-success/15 text-success border-success/30",
  Workshop: "bg-secondary/10 text-secondary border-secondary/30",
  Holiday: "bg-warning/15 text-warning border-warning/30",
  General: "bg-muted text-muted-foreground border-border",
};

export function AnnouncementCategoryBadge({ category }: { category: AnnouncementCategory }) {
  return (
    <Badge variant="outline" className={cn("font-medium", announcementCategoryStyle[category])}>
      {category}
    </Badge>
  );
}

const announcementPriorityStyle: Record<AnnouncementPriority, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/30",
  Medium: "bg-primary/10 text-primary border-primary/30",
  Low: "bg-muted text-muted-foreground border-border",
};

export function AnnouncementPriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  return (
    <Badge variant="outline" className={cn("font-medium", announcementPriorityStyle[priority])}>
      {priority}
    </Badge>
  );
}

const eventCategoryStyle: Record<EventCategory, string> = {
  Workshop: "bg-secondary/10 text-secondary border-secondary/30",
  Seminar: "bg-primary/10 text-primary border-primary/30",
  Hackathon: "bg-destructive/10 text-destructive border-destructive/30",
  "Placement Drive": "bg-success/15 text-success border-success/30",
  Cultural: "bg-warning/15 text-warning border-warning/30",
  Sports: "bg-primary/10 text-primary border-primary/30",
  General: "bg-muted text-muted-foreground border-border",
};

export function EventCategoryBadge({ category }: { category: EventCategory }) {
  return (
    <Badge variant="outline" className={cn("font-medium", eventCategoryStyle[category])}>
      {category}
    </Badge>
  );
}

export function EventTimingBadge({ past }: { past: boolean }) {
  return past ? (
    <Badge variant="outline" className="border-border bg-muted font-medium text-muted-foreground">
      Past
    </Badge>
  ) : (
    <Badge variant="outline" className="border-success/30 bg-success/15 font-medium text-success">
      Upcoming
    </Badge>
  );
}

const notificationTypeStyle: Record<NotificationType, string> = {
  Announcement: "bg-primary/10 text-primary border-primary/30",
  Assignment: "bg-warning/15 text-warning border-warning/30",
  Attendance: "bg-destructive/10 text-destructive border-destructive/30",
  Event: "bg-secondary/10 text-secondary border-secondary/30",
  Quiz: "bg-accent/15 text-accent-foreground border-accent/30",
  System: "bg-muted text-muted-foreground border-border",
};

export function NotificationTypeBadge({ type }: { type: NotificationType }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", notificationTypeStyle[type])}>
      {type}
    </Badge>
  );
}

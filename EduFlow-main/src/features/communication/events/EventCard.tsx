import { CalendarDays, Clock, ExternalLink, MapPin, Pencil, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { EventCategoryBadge, EventTimingBadge } from "../Badges";
import { formatEventTime, isPastEvent, type Event } from "../types";

export function EventCard({
  event,
  canEdit = false,
  canDelete = false,
  canManageEditors = false,
  onEdit,
  onDelete,
  onManageEditors,
}: {
  event: Event;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageEditors?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageEditors?: () => void;
}) {
  const past = isPastEvent(event);
  const dateLabel = new Date(`${event.event_date}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const showActions = canEdit || canDelete || canManageEditors;

  return (
    <InfoCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <EventTimingBadge past={past} />
            <EventCategoryBadge category={event.category} />
          </div>
          <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
          {event.description && (
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
          <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {formatEventTime(event)}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {event.venue}
            </div>
            {event.organizer && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {event.organizer}
              </div>
            )}
          </dl>
          {event.registration_required && (
            <div className="mt-3">
              {event.registration_link ? (
                <Button asChild size="sm" variant="outline">
                  <a href={event.registration_link} target="_blank" rel="noreferrer">
                    Register <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : (
                <span className="text-xs font-medium text-primary">Registration required</span>
              )}
            </div>
          )}
        </div>
        {showActions && (
          <div className="flex shrink-0 items-center gap-1">
            {canManageEditors && onManageEditors && (
              <Button size="icon" variant="ghost" onClick={onManageEditors} aria-label="Manage editors">
                <Users className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && onDelete && (
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

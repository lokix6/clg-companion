import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTime } from "@/features/academic/timetable/TimetableCard";
import { DAYS_OF_WEEK, type Subject, type Timetable } from "@/features/academic/types";

export type CalendarView = "day" | "week" | "month";

const subjectAccentClasses = [
  "border-l-primary bg-primary/5",
  "border-l-secondary bg-secondary/5",
  "border-l-success bg-success/5",
  "border-l-warning bg-warning/10",
  "border-l-destructive bg-destructive/5",
  "border-l-primary-glow bg-primary/10",
];

function accentFor(subjectId: string, subjects: Subject[]): string {
  const idx = Math.max(0, subjects.findIndex((s) => s.id === subjectId));
  return subjectAccentClasses[idx % subjectAccentClasses.length];
}

function dayName(d: Date) {
  return DAYS_OF_WEEK[(d.getDay() + 6) % 7];
}

function isCurrentClass(entry: Timetable, now: Date): boolean {
  if (dayName(now) !== entry.day_of_week) return false;
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return cur >= entry.start_time.slice(0, 5) && cur < entry.end_time.slice(0, 5);
}

function isUpcomingClass(entry: Timetable, now: Date): boolean {
  if (dayName(now) !== entry.day_of_week) return false;
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return entry.start_time.slice(0, 5) > cur;
}

export function TimetableCalendar({
  entries,
  subjects,
}: {
  entries: Timetable[];
  subjects: Subject[];
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<{ entry: Timetable; date: Date } | null>(null);

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const entriesByDay = useMemo(() => {
    const m = new Map<string, Timetable[]>();
    for (const d of DAYS_OF_WEEK) m.set(d, []);
    for (const e of entries) m.get(e.day_of_week)?.push(e);
    for (const list of m.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [entries]);

  const now = new Date();
  const goPrev = () =>
    setCursor((c) => (view === "day" ? addDays(c, -1) : view === "week" ? addWeeks(c, -1) : addMonths(c, -1)));
  const goNext = () =>
    setCursor((c) => (view === "day" ? addDays(c, 1) : view === "week" ? addWeeks(c, 1) : addMonths(c, 1)));
  const goToday = () => setCursor(new Date());

  const rangeLabel =
    view === "day"
      ? format(cursor, "EEEE, MMM d, yyyy")
      : view === "week"
        ? (() => {
            const s = startOfWeek(cursor, { weekStartsOn: 1 });
            return `${format(s, "MMM d")} – ${format(addDays(s, 6), "MMM d, yyyy")}`;
          })()
        : format(cursor, "MMMM yyyy");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToday}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto text-sm font-semibold">{rangeLabel}</div>
      </div>

      {view === "day" && (
        <DayView
          date={cursor}
          entries={entriesByDay.get(dayName(cursor)) ?? []}
          subjects={subjects}
          subjectsById={subjectsById}
          now={now}
          onSelect={(entry) => setSelected({ entry, date: cursor })}
        />
      )}

      {view === "week" && (
        <WeekView
          cursor={cursor}
          entriesByDay={entriesByDay}
          subjects={subjects}
          subjectsById={subjectsById}
          now={now}
          onSelect={(entry, date) => setSelected({ entry, date })}
        />
      )}

      {view === "month" && (
        <MonthView
          cursor={cursor}
          entriesByDay={entriesByDay}
          subjects={subjects}
          subjectsById={subjectsById}
          now={now}
          onSelect={(entry, date) => setSelected({ entry, date })}
        />
      )}

      <ClassDetailsDialog
        selection={selected}
        subject={selected ? subjectsById.get(selected.entry.subject_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function DayColumnClass({
  entry,
  subject,
  now,
  accent,
  onSelect,
  compact,
  date,
}: {
  entry: Timetable;
  subject?: Subject;
  now: Date;
  accent: string;
  onSelect: () => void;
  compact?: boolean;
  date: Date;
}) {
  const current = isSameDay(date, now) && isCurrentClass(entry, now);
  const upcoming = isSameDay(date, now) && isUpcomingClass(entry, now);
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border border-l-4 p-2.5 text-left transition-shadow hover:shadow-elegant",
        accent,
        current && "ring-2 ring-primary",
        upcoming && "ring-1 ring-primary/40",
      )}
    >
      <div className="text-[11px] font-semibold text-foreground">
        {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
        {current && <span className="ml-1.5 rounded bg-primary px-1 text-[9px] text-primary-foreground">NOW</span>}
        {upcoming && <span className="ml-1.5 rounded bg-primary/15 px-1 text-[9px] text-primary">NEXT</span>}
      </div>
      <div className={cn("mt-0.5 truncate font-semibold", compact ? "text-xs" : "text-sm")}>
        {subject?.subject_name ?? "Class"}
      </div>
      {!compact && (
        <div className="truncate text-[11px] text-muted-foreground">
          {subject?.faculty_name}
          {(entry.room_number || entry.building) &&
            ` • ${[entry.room_number, entry.building].filter(Boolean).join(", ")}`}
        </div>
      )}
    </button>
  );
}

function DayView({
  date,
  entries,
  subjects,
  subjectsById,
  now,
  onSelect,
}: {
  date: Date;
  entries: Timetable[];
  subjects: Subject[];
  subjectsById: Map<string, Subject>;
  now: Date;
  onSelect: (entry: Timetable) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-card",
        isToday(date) ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {isToday(date) ? "Today" : dayName(date)}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes scheduled.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <DayColumnClass
              key={e.id}
              entry={e}
              subject={subjectsById.get(e.subject_id)}
              now={now}
              date={date}
              accent={accentFor(e.subject_id, subjects)}
              onSelect={() => onSelect(e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekView({
  cursor,
  entriesByDay,
  subjects,
  subjectsById,
  now,
  onSelect,
}: {
  cursor: Date;
  entriesByDay: Map<string, Timetable[]>;
  subjects: Subject[];
  subjectsById: Map<string, Subject>;
  now: Date;
  onSelect: (entry: Timetable, date: Date) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((d) => {
        const list = entriesByDay.get(dayName(d)) ?? [];
        const today = isToday(d);
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "min-h-[160px] rounded-xl border p-2.5 shadow-card",
              today ? "border-primary/40 bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {format(d, "EEE")}
              </span>
              <span className={cn("text-sm font-bold", today && "text-primary")}>
                {format(d, "d")}
              </span>
            </div>
            <div className="space-y-1.5">
              {list.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No classes</p>
              ) : (
                list.map((e) => (
                  <DayColumnClass
                    key={e.id}
                    entry={e}
                    subject={subjectsById.get(e.subject_id)}
                    now={now}
                    date={d}
                    accent={accentFor(e.subject_id, subjects)}
                    onSelect={() => onSelect(e, d)}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  cursor,
  entriesByDay,
  subjects,
  subjectsById,
  now,
  onSelect,
}: {
  cursor: Date;
  entriesByDay: Map<string, Timetable[]>;
  subjects: Subject[];
  subjectsById: Map<string, Subject>;
  now: Date;
  onSelect: (entry: Timetable, date: Date) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const monthEnd = endOfMonth(cursor);
  const cells: Date[] = [];
  let d = gridStart;
  while (d <= monthEnd || cells.length % 7 !== 0) {
    cells.push(d);
    d = addDays(d, 1);
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((l) => (
          <div key={l} className="p-2 text-center">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const list = entriesByDay.get(dayName(cell)) ?? [];
          const inMonth = isSameMonth(cell, cursor);
          const today = isToday(cell);
          return (
            <div
              key={cell.toISOString()}
              className={cn(
                "min-h-[92px] border-b border-r border-border p-1.5",
                !inMonth && "bg-muted/30 text-muted-foreground",
                today && "bg-primary/5",
              )}
            >
              <div className={cn("mb-1 text-xs font-semibold", today && "text-primary")}>
                {format(cell, "d")}
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map((e) => {
                  const s = subjectsById.get(e.subject_id);
                  const current = today && isCurrentClass(e, now);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e, cell)}
                      className={cn(
                        "block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] font-medium hover:brightness-110",
                        accentFor(e.subject_id, subjects),
                        current && "ring-1 ring-primary",
                      )}
                    >
                      {formatTime(e.start_time)} {s?.subject_name ?? "Class"}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{list.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassDetailsDialog({
  selection,
  subject,
  onClose,
}: {
  selection: { entry: Timetable; date: Date } | null;
  subject?: Subject;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!selection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{subject?.subject_name ?? "Class details"}</DialogTitle>
        </DialogHeader>
        {selection && (
          <div className="space-y-2 text-sm">
            <Row label="Day" value={selection.entry.day_of_week} />
            <Row
              label="Date"
              value={format(selection.date, "EEEE, MMM d, yyyy")}
            />
            <Row
              label="Time"
              value={`${formatTime(selection.entry.start_time)} – ${formatTime(selection.entry.end_time)}`}
            />
            <Row label="Faculty" value={subject?.faculty_name || "—"} />
            <Row label="Room" value={selection.entry.room_number || "—"} />
            <Row label="Building" value={selection.entry.building || "—"} />
            <Row label="Subject code" value={subject?.subject_code || "—"} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

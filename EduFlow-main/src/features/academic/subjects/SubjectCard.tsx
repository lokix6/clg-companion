import { BookOpen, MoreVertical, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Subject } from "@/features/academic/types";

export function SubjectCard({
  subject,
  assignmentCount,
  todayClassCount,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  assignmentCount: number;
  todayClassCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{subject.subject_name}</div>
            {subject.subject_code && (
              <div className="truncate text-xs text-muted-foreground">{subject.subject_code}</div>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span className="truncate">{subject.faculty_name}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {subject.credits != null && (
          <Badge variant="secondary" className="font-medium">
            {subject.credits} credits
          </Badge>
        )}
        {subject.semester != null && (
          <Badge variant="secondary" className="font-medium">
            Sem {subject.semester}
          </Badge>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs">
        <div>
          <div className="font-semibold text-foreground">{assignmentCount}</div>
          <div className="text-muted-foreground">Assignments</div>
        </div>
        <div>
          <div className="font-semibold text-foreground">{todayClassCount}</div>
          <div className="text-muted-foreground">Today's classes</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Building2,
  FolderKanban,
  ListTodo,
  Search,
  ChevronRight,
  Globe,
} from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useHierarchySelection } from "./useHierarchySelection";
import type { HierarchySelectionProps, HierarchyLevel } from "./types";

const LEVEL_ICONS: Record<HierarchyLevel, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

interface HierarchyCommandProps extends HierarchySelectionProps {
  triggerLabel?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
}

export function HierarchyCommand({
  levels = ["organization", "project", "task"],
  value,
  onChange,
  disabled,
  className,
  triggerLabel,
  triggerClassName,
  align = "start",
}: HierarchyCommandProps) {
  const [open, setOpen] = useState(false);

  const ctx = useHierarchySelection({
    levels,
    controlled: { value, onChange },
  });

  const displayLabel = (() => {
    if (triggerLabel) return triggerLabel;
    const parts: string[] = [];
    if (value.organizationName) parts.push(value.organizationName);
    if (value.projectName) parts.push(value.projectName);
    if (value.taskName) parts.push(value.taskName);
    return parts.length > 0 ? parts.join(" / ") : "Select context...";
  })();

  const hasValue = value.organizationId || value.projectId || value.taskId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 justify-between text-xs font-normal min-w-[180px] max-w-[320px]",
            !hasValue && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{displayLabel}</span>
          </div>
          <Search className="h-3 w-3 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[300px] p-0", className)} align={align}>
        <Command>
          <CommandInput placeholder="Search context..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs">No results found.</span>
            </CommandEmpty>

            {levels.includes("organization") && ctx.orgs.length > 0 && (
              <CommandGroup heading="Organizations">
                {ctx.orgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={`org-${org.name}`}
                    onSelect={() => {
                      ctx.setOrg(org.id);
                      if (!levels.includes("project")) setOpen(false);
                    }}
                    className="text-xs flex items-center gap-2"
                  >
                    <Building2 className={cn("h-3.5 w-3.5 shrink-0", value.organizationId === org.id ? "text-primary" : "text-violet-500")} />
                    <span className={cn("flex-1 truncate", value.organizationId === org.id && "font-semibold text-primary")}>
                      {org.name}
                    </span>
                    {org.isPersonal && <span className="text-[9px] text-muted-foreground">(personal)</span>}
                    {value.organizationId === org.id && <ChevronRight className="h-3 w-3 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {levels.includes("project") && value.organizationId && ctx.projects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Projects">
                  {ctx.projects.map((proj) => (
                    <CommandItem
                      key={proj.id}
                      value={`proj-${proj.name}`}
                      onSelect={() => {
                        ctx.setProject(proj.id);
                        if (!levels.includes("task")) setOpen(false);
                      }}
                      className="text-xs flex items-center gap-2"
                    >
                      <FolderKanban className={cn("h-3.5 w-3.5 shrink-0", value.projectId === proj.id ? "text-primary" : "text-amber-500")} />
                      <span className={cn("flex-1 truncate", value.projectId === proj.id && "font-semibold text-primary")}>
                        {proj.name}
                      </span>
                      {value.projectId === proj.id && <ChevronRight className="h-3 w-3 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {levels.includes("task") && value.projectId && ctx.tasks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tasks">
                  {ctx.tasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`task-${task.name}`}
                      onSelect={() => {
                        ctx.setTask(task.id);
                        setOpen(false);
                      }}
                      className="text-xs flex items-center gap-2"
                    >
                      <ListTodo className={cn("h-3.5 w-3.5 shrink-0", value.taskId === task.id ? "text-primary" : "text-sky-500")} />
                      <span className={cn("flex-1 truncate", value.taskId === task.id && "font-semibold text-primary")}>
                        {task.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

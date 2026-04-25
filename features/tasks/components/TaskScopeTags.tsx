"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Plus, X, Search, Check, Folder } from "lucide-react";
import * as icons from "lucide-react";
import { fetchScopeTypes, selectScopeTypesLoading } from "@/features/agent-context/redux/scope/scopeTypesSlice";
import { fetchScopes, selectScopesLoading } from "@/features/agent-context/redux/scope/scopesSlice";
import { fetchEntityScopes, setEntityScopes, selectScopeIdsForEntity } from "@/features/agent-context/redux/scope/scopeAssignmentsSlice";
import { selectEntityScopesWithLabels, selectScopePickerOptions } from "@/features/agent-context/redux/scope/selectors";
import type { ScopePickerOption } from "@/features/agent-context/redux/scope/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils/cn";

type LucideIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Folder;
  const pascal = name
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascal];
  return Icon ?? Folder;
}

interface TaskScopeTagsProps {
  taskId: string;
  orgId: string;
  className?: string;
}

/**
 * Tag-style scope assignment UI for tasks.
 *
 * Renders assigned scopes as removable colored pills with a "+ Add" chip that
 * opens a searchable popover grouped by scope type. Clicking a scope
 * immediately dispatches `setEntityScopes` so Redux + the list pane reflect
 * the change instantly — no save step required.
 *
 * Respects `max_assignments_per_entity` per scope type (e.g., Client = 1).
 */
export default function TaskScopeTags({
  taskId,
  orgId,
  className,
}: TaskScopeTagsProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hasFetched = useRef<string>("");

  const assigned = useAppSelector((s) =>
    selectEntityScopesWithLabels(s, "task", taskId),
  );
  const currentIds = useAppSelector((s) =>
    selectScopeIdsForEntity(s, "task", taskId),
  );
  const pickerOptions = useAppSelector((s) =>
    selectScopePickerOptions(s, orgId),
  );
  const typesLoading = useAppSelector(selectScopeTypesLoading);
  const scopesLoading = useAppSelector(selectScopesLoading);

  useEffect(() => {
    const key = `${orgId}:${taskId}`;
    if (hasFetched.current === key) return;
    hasFetched.current = key;
    dispatch(fetchScopeTypes(orgId));
    dispatch(fetchScopes({ org_id: orgId }));
    dispatch(fetchEntityScopes({ entity_type: "task", entity_id: taskId }));
  }, [dispatch, orgId, taskId]);

  const selectedSet = useMemo(() => new Set(currentIds), [currentIds]);

  const commit = (nextIds: string[]) => {
    dispatch(
      setEntityScopes({
        entity_type: "task",
        entity_id: taskId,
        scope_ids: nextIds,
      }),
    );
  };

  const toggle = (scopeId: string, group: ScopePickerOption) => {
    const next = new Set(selectedSet);
    if (next.has(scopeId)) {
      next.delete(scopeId);
    } else {
      if (group.max_assignments !== null) {
        const inGroup = group.options.filter((o) => next.has(o.value)).length;
        if (inGroup >= group.max_assignments) {
          // Replace the existing one in this group
          for (const o of group.options) next.delete(o.value);
        }
      }
      next.add(scopeId);
    }
    commit(Array.from(next));
  };

  const removeTag = (scopeId: string) => {
    const next = new Set(selectedSet);
    next.delete(scopeId);
    commit(Array.from(next));
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pickerOptions
      .map((g) => ({
        ...g,
        options: q
          ? g.options.filter((o) => o.label.toLowerCase().includes(q))
          : g.options,
      }))
      .filter((g) => g.options.length > 0);
  }, [pickerOptions, search]);

  const loading = typesLoading || scopesLoading;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {assigned.map((label) => {
        const Icon = resolveIcon(label.type_icon);
        return (
          <span
            key={label.assignment_id}
            className="group inline-flex items-center gap-1 h-6 pl-1.5 pr-0.5 rounded-full border text-[11px] font-medium transition-colors"
            style={{
              borderColor: label.type_color || undefined,
              color: label.type_color || undefined,
              backgroundColor: label.type_color
                ? `${label.type_color}1a`
                : undefined,
            }}
          >
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{label.scope_name}</span>
            <button
              onClick={() => removeTag(label.scope_id)}
              className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-current/10 transition-colors"
              aria-label={`Remove ${label.scope_name}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded-full border border-dashed text-[11px] font-medium transition-colors",
              "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-accent/50",
            )}
          >
            <Plus className="w-3 h-3" />
            <span>Add tag</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scopes..."
              className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {loading && filteredGroups.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Loading scopes...
              </p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                {search ? "No matches" : "No scopes defined"}
              </p>
            ) : (
              filteredGroups.map((group) => {
                const Icon = resolveIcon(group.icon);
                const inGroup = group.options.filter((o) =>
                  selectedSet.has(o.value),
                ).length;
                return (
                  <div key={group.type_id} className="mb-0.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Icon
                        className="w-3 h-3"
                        style={
                          group.color ? { color: group.color } : undefined
                        }
                      />
                      <span>{group.label}</span>
                      {group.max_assignments !== null && (
                        <span className="ml-auto text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70">
                          {inGroup}/{group.max_assignments}
                        </span>
                      )}
                    </div>
                    {group.options.map((opt) => {
                      const isSelected = selectedSet.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggle(opt.value, group)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1 text-xs transition-colors",
                            isSelected
                              ? "bg-accent/60 text-foreground"
                              : "text-foreground/80 hover:bg-accent/40",
                          )}
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0",
                              isSelected
                                ? "border-transparent"
                                : "border-border/60",
                            )}
                            style={
                              isSelected && group.color
                                ? {
                                    backgroundColor: group.color,
                                    color: "#fff",
                                  }
                                : undefined
                            }
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span className="truncate text-left flex-1">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

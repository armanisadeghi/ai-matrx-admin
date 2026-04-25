"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter as FilterIcon,
  Folder,
  X,
} from "lucide-react";
import * as icons from "lucide-react";
import { EMPTY_SCOPE_PICKER_OPTIONS, selectScopePickerOptions } from "@/features/agent-context/redux/scope/selectors";
import { fetchScopeTypes, selectScopeTypesLoading } from "@/features/agent-context/redux/scope/scopeTypesSlice";
import { fetchScopes, selectScopesLoading } from "@/features/agent-context/redux/scope/scopesSlice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/features/agent-context/redux/appContextSlice";
import {
  selectFilterScopeIds,
  selectFilterScopeMatchAll,
  toggleFilterScopeId,
  setFilterScopeMatchAll,
  clearFilterScopes,
} from "@/features/tasks/redux/taskUiSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";

type LucideIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

function resolveIcon(name: string): LucideIcon {
  const pascalName = name
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascalName];
  return Icon ?? Folder;
}

interface TaskScopeFilterProps {
  className?: string;
  /** Display variant — "sidebar" (collapsible sections) or "compact" (flat chip row). */
  variant?: "sidebar" | "compact";
}

export default function TaskScopeFilter({
  className,
  variant = "sidebar",
}: TaskScopeFilterProps) {
  const dispatch = useAppDispatch();
  const orgId = useAppSelector(selectOrganizationId);
  const filterScopeIds = useAppSelector(selectFilterScopeIds);
  const matchAll = useAppSelector(selectFilterScopeMatchAll);
  const options = useAppSelector((s) =>
    orgId ? selectScopePickerOptions(s, orgId) : EMPTY_SCOPE_PICKER_OPTIONS,
  );
  const typesLoading = useAppSelector(selectScopeTypesLoading);
  const scopesLoading = useAppSelector(selectScopesLoading);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const hasFetched = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId || hasFetched.current === orgId) return;
    hasFetched.current = orgId;
    dispatch(fetchScopeTypes(orgId));
    dispatch(fetchScopes({ org_id: orgId }));
  }, [dispatch, orgId]);

  if (!orgId) return null;

  const selected = new Set(filterScopeIds);
  const loading = typesLoading || scopesLoading;

  if (options.length === 0 && !loading) {
    return (
      <div className={cn("text-xs text-muted-foreground px-3 py-2", className)}>
        No scopes defined for this organization.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
          <FilterIcon size={12} />
          <span>Scope Filter</span>
        </h2>
        {filterScopeIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => dispatch(clearFilterScopes())}
          >
            Clear
          </Button>
        )}
      </div>

      {filterScopeIds.length >= 2 && (
        <div className="flex items-center gap-2 px-3">
          <span className="text-xs text-muted-foreground">
            {matchAll ? "Match all" : "Match any"}
          </span>
          <Switch
            checked={matchAll}
            onCheckedChange={(v) => dispatch(setFilterScopeMatchAll(!!v))}
          />
        </div>
      )}

      {variant === "compact" ? (
        <div className="flex flex-wrap gap-1 px-3">
          {options.flatMap((group) =>
            group.options.map((opt) => {
              const isSel = selected.has(opt.value);
              return (
                <Badge
                  key={opt.value}
                  variant={isSel ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  style={
                    isSel
                      ? {
                          backgroundColor: group.color,
                          borderColor: group.color,
                        }
                      : { color: group.color, borderColor: group.color }
                  }
                  onClick={() => dispatch(toggleFilterScopeId(opt.value))}
                >
                  {opt.label}
                </Badge>
              );
            }),
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          {options.map((group) => {
            const Icon = resolveIcon(group.icon);
            const isCollapsed = collapsed[group.type_id] ?? false;
            const selectedCount = group.options.filter((o) =>
              selected.has(o.value),
            ).length;
            return (
              <div key={group.type_id}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [group.type_id]: !isCollapsed,
                    }))
                  }
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent rounded-md"
                >
                  <span className="flex items-center gap-1.5">
                    {isCollapsed ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: group.color }}
                    />
                    <span>{group.label}</span>
                  </span>
                  {selectedCount > 0 && (
                    <Badge
                      variant="outline"
                      className="h-4 text-[10px] px-1.5"
                      style={{ borderColor: group.color, color: group.color }}
                    >
                      {selectedCount}
                    </Badge>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="pl-6 pr-3 flex flex-wrap gap-1 py-1">
                    {group.options.length === 0 && (
                      <span className="text-[11px] text-muted-foreground py-0.5">
                        No scopes
                      </span>
                    )}
                    {group.options.map((opt) => {
                      const isSel = selected.has(opt.value);
                      return (
                        <Badge
                          key={opt.value}
                          variant={isSel ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer text-[11px] px-1.5 py-0.5",
                            !isSel && "hover:bg-accent",
                          )}
                          style={
                            isSel
                              ? {
                                  backgroundColor: group.color,
                                  borderColor: group.color,
                                }
                              : { color: group.color, borderColor: group.color }
                          }
                          onClick={() =>
                            dispatch(toggleFilterScopeId(opt.value))
                          }
                        >
                          {opt.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Compact chip row for rendering the *currently active* scope filter at the top
 * of a list view. Each chip removes itself on click; a "Clear all" button is
 * rendered on the right.
 */
export function ActiveScopeFilterChips({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const orgId = useAppSelector(selectOrganizationId);
  const filterScopeIds = useAppSelector(selectFilterScopeIds);
  const matchAll = useAppSelector(selectFilterScopeMatchAll);
  const options = useAppSelector((s) =>
    orgId ? selectScopePickerOptions(s, orgId) : EMPTY_SCOPE_PICKER_OPTIONS,
  );

  if (filterScopeIds.length === 0) return null;

  const flat = new Map<string, { label: string; color: string }>();
  for (const group of options) {
    for (const opt of group.options) {
      flat.set(opt.value, { label: opt.label, color: group.color });
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-border bg-muted/30",
        className,
      )}
    >
      <span className="text-[11px] text-muted-foreground">
        {matchAll ? "Match all:" : "Match any:"}
      </span>
      {filterScopeIds.map((id) => {
        const info = flat.get(id);
        if (!info) return null;
        return (
          <Badge
            key={id}
            variant="outline"
            className="gap-1 text-xs pl-2 pr-1 py-0.5"
            style={{ borderColor: info.color, color: info.color }}
          >
            <span>{info.label}</span>
            <button
              type="button"
              className="rounded hover:bg-accent p-0.5"
              onClick={() => dispatch(toggleFilterScopeId(id))}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-[11px] px-2 ml-auto"
        onClick={() => dispatch(clearFilterScopes())}
      >
        Clear all
      </Button>
    </div>
  );
}

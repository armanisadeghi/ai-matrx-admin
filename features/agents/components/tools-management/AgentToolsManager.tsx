"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Wrench,
  Search,
  X,
  Check,
  ChevronRight,
  Layers,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentTools,
  selectAgentCustomTools,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentTools } from "@/features/agents/redux/agent-definition/slice";

interface ToolEntry {
  name: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

interface AgentToolsManagerProps {
  agentId: string;
  availableTools?: ToolEntry[];
}

const ALL_CATEGORY = "__all__";
const ENABLED_CATEGORY = "__enabled__";

export function AgentToolsManager({
  agentId,
  availableTools = [],
}: AgentToolsManagerProps) {
  const dispatch = useAppDispatch();
  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const customTools = useAppSelector((state) =>
    selectAgentCustomTools(state, agentId),
  );

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  const activeSet = useMemo(
    () =>
      new Set(Array.isArray(selectedTools) ? (selectedTools as string[]) : []),
    [selectedTools],
  );

  const toggleTool = useCallback(
    (toolName: string) => {
      const current = Array.isArray(selectedTools)
        ? (selectedTools as string[])
        : [];
      const next = current.includes(toolName)
        ? current.filter((t) => t !== toolName)
        : [...current, toolName];
      dispatch(
        setAgentTools({
          id: agentId,
          tools: next as unknown as typeof selectedTools,
        }),
      );
    },
    [agentId, selectedTools, dispatch],
  );

  const clearAll = () => {
    dispatch(
      setAgentTools({
        id: agentId,
        tools: [] as unknown as typeof selectedTools,
      }),
    );
  };

  const selectAll = useCallback(
    (tools: ToolEntry[]) => {
      const current = Array.isArray(selectedTools)
        ? (selectedTools as string[])
        : [];
      const toAdd = tools
        .map((t) => String(t.name))
        .filter((n) => !current.includes(n));
      dispatch(
        setAgentTools({
          id: agentId,
          tools: [...current, ...toAdd] as unknown as typeof selectedTools,
        }),
      );
    },
    [agentId, selectedTools, dispatch],
  );

  // All categories from tools
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of availableTools) {
      const cat = String(tool.category ?? "General");
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [availableTools]);

  // Filter by search across all tools
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return availableTools;
    const q = search.toLowerCase();
    return availableTools.filter(
      (t) =>
        String(t.name).toLowerCase().includes(q) ||
        (t.description && String(t.description).toLowerCase().includes(q)) ||
        (t.category && String(t.category).toLowerCase().includes(q)),
    );
  }, [availableTools, search]);

  // Tools shown in the right panel based on active category + search
  const visibleTools = useMemo(() => {
    if (activeCategory === ENABLED_CATEGORY) {
      return searchFiltered.filter((t) => activeSet.has(String(t.name)));
    }
    if (activeCategory === ALL_CATEGORY) {
      return searchFiltered;
    }
    return searchFiltered.filter(
      (t) => String(t.category ?? "General") === activeCategory,
    );
  }, [searchFiltered, activeCategory, activeSet]);

  // Count enabled per category
  const enabledPerCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of availableTools) {
      const cat = String(tool.category ?? "General");
      if (activeSet.has(String(tool.name))) {
        map.set(cat, (map.get(cat) ?? 0) + 1);
      }
    }
    return map;
  }, [availableTools, activeSet]);

  if (availableTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <Wrench className="w-8 h-8 opacity-30" />
        <p className="text-sm">No tools available for this agent.</p>
      </div>
    );
  }

  const enabledCount = activeSet.size;
  const categoryTools = categories.find(([cat]) => cat === activeCategory)?.[1];

  return (
    <div className="flex overflow-hidden" style={{ height: "100%" }}>
      {/* ── Left sidebar: categories ── */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col overflow-hidden">
        {/* Stats bar */}
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {enabledCount} enabled
              </span>
            </div>
            {enabledCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {/* All */}
            <CategoryItem
              label="All Tools"
              count={availableTools.length}
              enabledCount={enabledCount}
              active={activeCategory === ALL_CATEGORY}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
              icon={<Layers className="w-3 h-3" />}
            />

            {/* Enabled */}
            {enabledCount > 0 && (
              <CategoryItem
                label="Enabled"
                count={enabledCount}
                enabledCount={enabledCount}
                active={activeCategory === ENABLED_CATEGORY}
                onClick={() => setActiveCategory(ENABLED_CATEGORY)}
                icon={<Check className="w-3 h-3" />}
                highlight
              />
            )}

            {/* Divider */}
            <div className="h-px bg-border mx-1 my-2" />

            {/* Actual categories */}
            {categories.map(([cat, total]) => (
              <CategoryItem
                key={cat}
                label={cat}
                count={total}
                enabledCount={enabledPerCategory.get(cat) ?? 0}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: tools ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Search + panel header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${availableTools.length} tools…`}
              className="pl-8 pr-8 h-8 text-sm"
              style={{ fontSize: "16px" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bulk action for current category */}
          {activeCategory !== ENABLED_CATEGORY &&
            activeCategory !== ALL_CATEGORY &&
            categoryTools !== undefined &&
            categoryTools > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() =>
                  selectAll(
                    availableTools.filter(
                      (t) => String(t.category ?? "General") === activeCategory,
                    ),
                  )
                }
              >
                Select all
              </Button>
            )}
        </div>

        {/* Panel label */}
        <div className="px-4 py-2 shrink-0 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeCategory === ALL_CATEGORY
              ? "All Tools"
              : activeCategory === ENABLED_CATEGORY
                ? "Enabled Tools"
                : activeCategory}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {visibleTools.length}
            {search && ` of ${availableTools.length}`} tools
          </span>
        </div>

        {/* Tool cards */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pb-4 space-y-1">
            {visibleTools.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Search className="w-5 h-5 opacity-40" />
                <p className="text-xs">
                  {search
                    ? `No tools match "${search}"`
                    : "No tools in this category"}
                </p>
              </div>
            ) : (
              visibleTools.map((tool) => {
                const isActive = activeSet.has(String(tool.name));
                return (
                  <ToolCard
                    key={String(tool.name)}
                    tool={tool}
                    active={isActive}
                    onToggle={toggleTool}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Custom tools footer */}
        {customTools && (customTools as unknown[]).length > 0 && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Custom Tools
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(customTools as Array<{ name?: string }>).map((ct, i) => (
                <Badge
                  key={ct.name ?? i}
                  variant="secondary"
                  className="text-[11px]"
                >
                  {ct.name ?? `tool-${i}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryItem({
  label,
  count,
  enabledCount,
  active,
  onClick,
  icon,
  highlight,
}: {
  label: string;
  count: number;
  enabledCount: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-left transition-colors group ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {icon && (
        <span className={active ? "text-primary" : "text-muted-foreground"}>
          {icon}
        </span>
      )}
      <span
        className={`text-xs flex-1 truncate font-medium ${highlight && !active ? "text-primary/70" : ""}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {enabledCount > 0 && (
          <span
            className={`text-[10px] font-semibold tabular-nums ${active ? "text-primary" : "text-primary/70"}`}
          >
            {enabledCount}
          </span>
        )}
        {enabledCount > 0 && count !== enabledCount && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            /
          </span>
        )}
        {count !== enabledCount && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
        {active && (
          <ChevronRight className="w-3 h-3 ml-0.5 opacity-60 shrink-0" />
        )}
      </div>
    </button>
  );
}

function ToolCard({
  tool,
  active,
  onToggle,
}: {
  tool: ToolEntry;
  active: boolean;
  onToggle: (name: string) => void;
}) {
  const name = String(tool.name);

  return (
    <button
      onClick={() => onToggle(name)}
      className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all group border ${
        active
          ? "bg-primary/8 border-primary/20 hover:bg-primary/12 hover:border-primary/30"
          : "border-transparent hover:bg-muted/50 hover:border-border"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex items-center justify-center w-4 h-4 rounded border-[1.5px] shrink-0 transition-all ${
          active
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border group-hover:border-primary/50"
        }`}
      >
        {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-xs font-semibold leading-tight ${
              active ? "text-primary" : "text-foreground"
            }`}
          >
            {name}
          </span>
          {tool.category && (
            <span className="text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
              {String(tool.category)}
            </span>
          )}
        </div>
        {tool.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {String(tool.description)}
          </p>
        )}
      </div>
    </button>
  );
}

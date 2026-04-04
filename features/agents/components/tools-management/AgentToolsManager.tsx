"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Wrench,
  Search,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Zap,
  AlertTriangle,
  Trash2,
  Plus,
  Pencil,
  Server,
  Code2,
  Monitor,
  Plug,
  Info,
  Copy,
  Tag,
  FileCode2,
  Globe,
  Terminal,
  Radio,
  Shield,
  ShieldOff,
  Power,
  PowerOff,
  ClipboardPaste,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentTools,
  selectAgentCustomTools,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  setAgentTools,
  setAgentCustomTools,
} from "@/features/agents/redux/agent-definition/slice";
import type { DatabaseTool } from "@/utils/supabase/tools-service";
import type {
  CustomToolDefinition,
  CustomToolInputSchema,
} from "@/features/agents/types/agent-api-types";

type ToolsTab = "server" | "custom" | "client" | "mcp";

const ALL_CATEGORY = "__all__";
const ENABLED_CATEGORY = "__enabled__";

interface AgentToolsManagerProps {
  agentId: string;
  availableTools?: DatabaseTool[];
}

export function AgentToolsManager({
  agentId,
  availableTools = [],
}: AgentToolsManagerProps) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("server");

  const tabs: { id: ToolsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "server",
      label: "Server Tools",
      icon: <Server className="w-3 h-3" />,
    },
    {
      id: "custom",
      label: "Custom Tools",
      icon: <Code2 className="w-3 h-3" />,
    },
    {
      id: "client",
      label: "Client Tools",
      icon: <Monitor className="w-3 h-3" />,
    },
    { id: "mcp", label: "MCP Tools", icon: <Plug className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-border shrink-0 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors select-none ${
              activeTab === tab.id
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "server" && (
          <ServerToolsTab agentId={agentId} availableTools={availableTools} />
        )}
        {activeTab === "custom" && <CustomToolsTab agentId={agentId} />}
        {activeTab === "client" && (
          <ClientToolsTab agentId={agentId} availableTools={availableTools} />
        )}
        {activeTab === "mcp" && <McpToolsTab />}
      </div>
    </div>
  );
}

// =============================================================================
// Server Tools Tab
// =============================================================================

function ServerToolsTab({
  agentId,
  availableTools,
}: {
  agentId: string;
  availableTools: DatabaseTool[];
}) {
  const dispatch = useAppDispatch();
  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const activeSet = useMemo(
    () =>
      new Set(Array.isArray(selectedTools) ? (selectedTools as string[]) : []),
    [selectedTools],
  );

  const availableNameSet = useMemo(
    () => new Set(availableTools.map((t) => t.name)),
    [availableTools],
  );

  const orphanedTools = useMemo(() => {
    if (!Array.isArray(selectedTools)) return [];
    return (selectedTools as string[]).filter(
      (name) => !availableNameSet.has(name),
    );
  }, [selectedTools, availableNameSet]);

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
    (tools: DatabaseTool[]) => {
      const current = Array.isArray(selectedTools)
        ? (selectedTools as string[])
        : [];
      const toAdd = tools
        .map((t) => t.name)
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

  const removeOrphan = useCallback(
    (toolName: string) => {
      const current = Array.isArray(selectedTools)
        ? (selectedTools as string[])
        : [];
      dispatch(
        setAgentTools({
          id: agentId,
          tools: current.filter(
            (t) => t !== toolName,
          ) as unknown as typeof selectedTools,
        }),
      );
    },
    [agentId, selectedTools, dispatch],
  );

  const removeAllOrphans = useCallback(() => {
    const current = Array.isArray(selectedTools)
      ? (selectedTools as string[])
      : [];
    dispatch(
      setAgentTools({
        id: agentId,
        tools: current.filter((t) =>
          availableNameSet.has(t),
        ) as unknown as typeof selectedTools,
      }),
    );
  }, [agentId, selectedTools, availableNameSet, dispatch]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of availableTools) {
      const cat = tool.category ?? "General";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [availableTools]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return availableTools;
    const q = search.toLowerCase();
    return availableTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [availableTools, search]);

  const visibleTools = useMemo(() => {
    if (activeCategory === ENABLED_CATEGORY) {
      return searchFiltered.filter((t) => activeSet.has(t.name));
    }
    if (activeCategory === ALL_CATEGORY) {
      return searchFiltered;
    }
    return searchFiltered.filter(
      (t) => (t.category ?? "General") === activeCategory,
    );
  }, [searchFiltered, activeCategory, activeSet]);

  const enabledPerCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of availableTools) {
      const cat = tool.category ?? "General";
      if (activeSet.has(tool.name)) {
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
    <div className="flex overflow-hidden h-full">
      {/* Left sidebar: categories */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            <CategoryItem
              label="All Tools"
              count={availableTools.length}
              enabledCount={enabledCount}
              active={activeCategory === ALL_CATEGORY}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
              icon={<Layers className="w-3 h-3" />}
            />
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
            <div className="h-px bg-border mx-1 my-2" />
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

      {/* Right panel: tools */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Orphaned tools warning */}
        {orphanedTools.length > 0 && (
          <OrphanedToolsBanner
            orphanedTools={orphanedTools}
            onRemove={removeOrphan}
            onRemoveAll={removeAllOrphans}
          />
        )}

        {/* Search */}
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
                      (t) => (t.category ?? "General") === activeCategory,
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
                const isActive = activeSet.has(tool.name);
                return (
                  <ToolCard
                    key={tool.name}
                    tool={tool}
                    active={isActive}
                    expanded={expandedTool === tool.name}
                    onToggle={toggleTool}
                    onExpand={() =>
                      setExpandedTool(
                        expandedTool === tool.name ? null : tool.name,
                      )
                    }
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Orphaned Tools Banner
// =============================================================================

function OrphanedToolsBanner({
  orphanedTools,
  onRemove,
  onRemoveAll,
}: {
  orphanedTools: string[];
  onRemove: (name: string) => void;
  onRemoveAll: () => void;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-3 mt-3 rounded border border-yellow-400 dark:border-yellow-600 overflow-hidden">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-yellow-50 dark:bg-yellow-950/40 border-b border-yellow-300 dark:border-yellow-700">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
            Unresolved Tools
          </span>
          <span className="ml-auto text-[10px] text-yellow-600 dark:text-yellow-500">
            {orphanedTools.length} tool{orphanedTools.length !== 1 ? "s" : ""}{" "}
            not found in registry
          </span>
          {orphanedTools.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-yellow-700 dark:text-yellow-300 hover:text-destructive"
              onClick={onRemoveAll}
            >
              Remove all
            </Button>
          )}
        </div>
        {orphanedTools.map((name, idx) => (
          <div
            key={name}
            className={`flex items-center gap-2 px-2.5 py-1.5 bg-yellow-50/30 dark:bg-yellow-950/15 ${
              idx < orphanedTools.length - 1
                ? "border-b border-yellow-200 dark:border-yellow-800/40"
                : ""
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
            <span className="font-mono text-xs text-foreground flex-1 truncate">
              {name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onRemove(name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Remove from agent
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// Custom Tools Tab
// =============================================================================

function CustomToolsTab({ agentId }: { agentId: string }) {
  const dispatch = useAppDispatch();
  const customTools = useAppSelector((state) =>
    selectAgentCustomTools(state, agentId),
  );
  const tools: CustomToolDefinition[] = Array.isArray(customTools)
    ? customTools
    : [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = useCallback(
    (index: number) => {
      const next = tools.filter((_, i) => i !== index);
      dispatch(setAgentCustomTools({ id: agentId, customTools: next }));
      if (editingIndex === index) setEditingIndex(null);
    },
    [agentId, tools, editingIndex, dispatch],
  );

  const handleSaveTool = useCallback(
    (tool: CustomToolDefinition, index: number | null) => {
      if (index !== null) {
        const next = [...tools];
        next[index] = tool;
        dispatch(setAgentCustomTools({ id: agentId, customTools: next }));
        setEditingIndex(null);
      } else {
        dispatch(
          setAgentCustomTools({ id: agentId, customTools: [...tools, tool] }),
        );
        setIsAdding(false);
      }
    },
    [agentId, tools, dispatch],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Custom Tool Definitions
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Inline tools following the MCP standard. Always delegated to the
            client.
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              setIsAdding(true);
              setEditingIndex(null);
            }}
          >
            <Plus className="w-3 h-3" />
            Add Tool
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isAdding && (
          <CustomToolForm
            onSave={(tool) => handleSaveTool(tool, null)}
            onCancel={() => setIsAdding(false)}
            existingNames={tools.map((t) => t.name)}
          />
        )}

        {tools.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Code2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No custom tools defined.</p>
            <p className="text-xs max-w-xs text-center">
              Custom tools let you define inline tool specifications that are
              always delegated to the client for execution.
            </p>
          </div>
        )}

        {tools.map((tool, idx) =>
          editingIndex === idx ? (
            <CustomToolForm
              key={`edit-${idx}`}
              initial={tool}
              onSave={(t) => handleSaveTool(t, idx)}
              onCancel={() => setEditingIndex(null)}
              existingNames={tools
                .filter((_, i) => i !== idx)
                .map((t) => t.name)}
            />
          ) : (
            <CustomToolCard
              key={tool.name}
              tool={tool}
              onEdit={() => {
                setEditingIndex(idx);
                setIsAdding(false);
              }}
              onDelete={() => handleDelete(idx)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function CustomToolCard({
  tool,
  onEdit,
  onDelete,
}: {
  tool: CustomToolDefinition;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const paramCount = tool.input_schema
    ? Object.keys(tool.input_schema.properties).length
    : 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {tool.name}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {paramCount} param{paramCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          {tool.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {tool.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && tool.input_schema && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <ParameterTable schema={tool.input_schema} />
        </div>
      )}
    </div>
  );
}

function CustomToolForm({
  initial,
  onSave,
  onCancel,
  existingNames,
}: {
  initial?: CustomToolDefinition;
  onSave: (tool: CustomToolDefinition) => void;
  onCancel: () => void;
  existingNames: string[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [params, setParams] = useState<
    Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>
  >(() => {
    if (!initial?.input_schema) return [];
    const schema = initial.input_schema;
    const requiredSet = new Set(schema.required ?? []);
    return Object.entries(schema.properties).map(([pName, pDef]) => ({
      name: pName,
      type: pDef.type,
      description: pDef.description ?? "",
      required: requiredSet.has(pName),
    }));
  });

  const nameError = useMemo(() => {
    if (!name) return null;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
      return "Must match [a-zA-Z0-9_-], max 64 chars";
    }
    if (existingNames.includes(name)) {
      return "Name already exists";
    }
    return null;
  }, [name, existingNames]);

  const canSave = name.length > 0 && !nameError;

  const addParam = () => {
    setParams([
      ...params,
      { name: "", type: "string", description: "", required: false },
    ]);
  };

  const updateParam = (idx: number, field: string, value: string | boolean) => {
    const next = [...params];
    next[idx] = { ...next[idx], [field]: value };
    setParams(next);
  };

  const removeParam = (idx: number) => {
    setParams(params.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const validParams = params.filter((p) => p.name.trim());
    const inputSchema: CustomToolInputSchema | undefined =
      validParams.length > 0
        ? {
            type: "object" as const,
            properties: Object.fromEntries(
              validParams.map((p) => [
                p.name,
                {
                  type: p.type,
                  ...(p.description ? { description: p.description } : {}),
                },
              ]),
            ),
            required: validParams.filter((p) => p.required).map((p) => p.name),
          }
        : undefined;

    onSave({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(inputSchema ? { input_schema: inputSchema } : {}),
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">
            Tool Name
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="get_customer_status"
            className="h-7 text-xs"
            style={{ fontSize: "16px" }}
          />
          {nameError && (
            <p className="text-[10px] text-destructive mt-0.5">{nameError}</p>
          )}
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">
            Description
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this tool does..."
            className="h-7 text-xs"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Parameters
          </Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1.5"
            onClick={addParam}
          >
            <Plus className="w-2.5 h-2.5 mr-0.5" />
            Add
          </Button>
        </div>

        {params.length > 0 && (
          <div className="space-y-1.5">
            {params.map((param, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={param.name}
                  onChange={(e) => updateParam(idx, "name", e.target.value)}
                  placeholder="param_name"
                  className="h-6 text-[11px] flex-1"
                  style={{ fontSize: "16px" }}
                />
                <Select
                  value={param.type}
                  onValueChange={(v) => updateParam(idx, "type", v)}
                >
                  <SelectTrigger className="h-6 text-[11px] w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "string",
                      "number",
                      "integer",
                      "boolean",
                      "array",
                      "object",
                    ].map((t) => (
                      <SelectItem key={t} value={t} className="text-[11px]">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={param.description}
                  onChange={(e) =>
                    updateParam(idx, "description", e.target.value)
                  }
                  placeholder="Description..."
                  className="h-6 text-[11px] flex-1"
                  style={{ fontSize: "16px" }}
                />
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={param.required}
                    onCheckedChange={(v) => updateParam(idx, "required", !!v)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[10px] text-muted-foreground">Req</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  onClick={() => removeParam(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={!canSave}
        >
          {initial ? "Update" : "Add Tool"}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Client Tools Tab
// =============================================================================

function ClientToolsTab({
  agentId,
  availableTools,
}: {
  agentId: string;
  availableTools: DatabaseTool[];
}) {
  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const customTools = useAppSelector((state) =>
    selectAgentCustomTools(state, agentId),
  );

  const enabledServerTools = useMemo(() => {
    if (!Array.isArray(selectedTools)) return [];
    const names = new Set(selectedTools as string[]);
    return availableTools.filter((t) => names.has(t.name));
  }, [selectedTools, availableTools]);

  const enabledCustomTools: CustomToolDefinition[] = useMemo(
    () => (Array.isArray(customTools) ? customTools : []),
    [customTools],
  );

  const allEnabledToolNames = useMemo(() => {
    const serverNames = enabledServerTools.map((t) => t.name);
    const customNames = enabledCustomTools.map((t) => t.name);
    return [...serverNames, ...customNames];
  }, [enabledServerTools, enabledCustomTools]);

  const [clientToolNames, setClientToolNames] = useState<Set<string>>(
    new Set(),
  );

  const toggleClientTool = (name: string) => {
    const next = new Set(clientToolNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setClientToolNames(next);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs font-semibold text-foreground">
          Client-Handled Tools
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          When the AI calls a client tool, the server delegates it back to the
          browser for execution. You have 120 seconds to respond.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {allEnabledToolNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Monitor className="w-8 h-8 opacity-30" />
            <p className="text-sm">No tools enabled yet.</p>
            <p className="text-xs max-w-xs text-center">
              Enable server or custom tools first, then mark which ones the
              client should handle.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {enabledServerTools.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Server Tools
                </p>
                {enabledServerTools.map((tool) => (
                  <ClientToolRow
                    key={tool.name}
                    name={tool.name}
                    description={tool.description}
                    isClient={clientToolNames.has(tool.name)}
                    onToggle={() => toggleClientTool(tool.name)}
                    source="server"
                  />
                ))}
              </>
            )}

            {enabledCustomTools.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 mt-4">
                  Custom Tools (always client-delegated)
                </p>
                {enabledCustomTools.map((tool) => (
                  <ClientToolRow
                    key={tool.name}
                    name={tool.name}
                    description={tool.description}
                    isClient={true}
                    onToggle={() => {}}
                    source="custom"
                    locked
                  />
                ))}
              </>
            )}
          </div>
        )}

        <div className="mt-6 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p>
                <strong>How client tools work:</strong> When the AI model
                invokes a client tool, the server emits a{" "}
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                  tool_delegated
                </code>{" "}
                event instead of executing it. Your client code receives the
                call and must respond within 120 seconds.
              </p>
              <p>
                Custom tools are automatically delegated — they have no
                server-side implementation. For server tools, toggling
                "client-handled" tells the server to delegate instead of
                executing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientToolRow({
  name,
  description,
  isClient,
  onToggle,
  source,
  locked,
}: {
  name: string;
  description?: string;
  isClient: boolean;
  onToggle: () => void;
  source: "server" | "custom";
  locked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border transition-colors">
      <Checkbox
        checked={isClient}
        onCheckedChange={() => onToggle()}
        disabled={locked}
        className={locked ? "opacity-50" : ""}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{name}</span>
          {source === "custom" && (
            <Badge variant="outline" className="text-[9px] h-4">
              auto-delegated
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MCP Server Config Types
// =============================================================================

type McpTransport = "http" | "sse" | "stdio";

type McpAuthStrategy =
  | {
      strategy: "oauth_discovery";
      clientId?: string;
      clientSecret?: string;
      scopes?: string[];
    }
  | { strategy: "bearer"; tokenRef: string }
  | { strategy: "header"; headerName: string; tokenRef: string }
  | { strategy: "env" }
  | { strategy: "none" };

interface McpServerConfig {
  name: string;
  label?: string;
  description?: string;
  transport: McpTransport;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  auth: McpAuthStrategy;
  enabled: boolean;
}

// =============================================================================
// MCP Config Parser — handles multiple paste formats
// =============================================================================

function parseMcpConfigInput(raw: string): {
  servers: McpServerConfig[];
  errors: string[];
} {
  const errors: string[] = [];
  const servers: McpServerConfig[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    errors.push("Invalid JSON. Please paste a valid JSON config.");
    return { servers, errors };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    errors.push("Expected a JSON object.");
    return { servers, errors };
  }

  const obj = parsed as Record<string, unknown>;

  // Format 1: { "mcpServers": { ... } }
  if (
    "mcpServers" in obj &&
    typeof obj.mcpServers === "object" &&
    obj.mcpServers !== null
  ) {
    return extractServersFromMap(obj.mcpServers as Record<string, unknown>);
  }

  // Format 2: Single server with "type" or "transport" key → { "type": "http", "url": "..." }
  if (
    ("type" in obj || "transport" in obj) &&
    ("url" in obj || "command" in obj)
  ) {
    const server = parseSingleServer("server", obj);
    if (server) servers.push(server);
    else errors.push("Could not parse server config.");
    return { servers, errors };
  }

  // Format 3: Named map → { "notion": { ... }, "stripe": { ... } }
  const keys = Object.keys(obj);
  const looksLikeMap =
    keys.length > 0 &&
    keys.every((k) => {
      const v = obj[k];
      return typeof v === "object" && v !== null && !Array.isArray(v);
    });

  if (looksLikeMap) {
    return extractServersFromMap(obj);
  }

  errors.push(
    "Unrecognized format. Paste mcpServers JSON, a named server map, or a single server object.",
  );
  return { servers, errors };
}

function extractServersFromMap(map: Record<string, unknown>): {
  servers: McpServerConfig[];
  errors: string[];
} {
  const servers: McpServerConfig[] = [];
  const errors: string[] = [];

  for (const [name, value] of Object.entries(map)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`Skipped "${name}" — not a valid server object.`);
      continue;
    }
    const server = parseSingleServer(name, value as Record<string, unknown>);
    if (server) servers.push(server);
    else errors.push(`Could not parse server "${name}".`);
  }

  return { servers, errors };
}

function parseSingleServer(
  name: string,
  obj: Record<string, unknown>,
): McpServerConfig | null {
  const transport: McpTransport =
    (obj.transport as McpTransport) ??
    (obj.type as McpTransport) ??
    (obj.command ? "stdio" : "http");

  const isStdio = transport === "stdio";

  if (!isStdio && !obj.url) return null;
  if (isStdio && !obj.command) return null;

  let auth: McpAuthStrategy = { strategy: "none" };

  if (obj.auth && typeof obj.auth === "object") {
    auth = obj.auth as McpAuthStrategy;
  } else if (obj.headers && typeof obj.headers === "object") {
    const headers = obj.headers as Record<string, string>;
    const authHeader = headers["Authorization"] || headers["authorization"];
    if (authHeader) {
      auth = {
        strategy: "bearer",
        tokenRef: authHeader.replace(/^Bearer\s+/i, ""),
      };
    } else {
      const firstKey = Object.keys(headers)[0];
      if (firstKey) {
        auth = {
          strategy: "header",
          headerName: firstKey,
          tokenRef: headers[firstKey],
        };
      }
    }
  } else if (obj.env && typeof obj.env === "object") {
    auth = { strategy: "env" };
  }

  return {
    name,
    label: (obj.label as string) ?? undefined,
    description: (obj.description as string) ?? undefined,
    transport,
    url: obj.url as string | undefined,
    headers:
      obj.headers && typeof obj.headers === "object"
        ? (obj.headers as Record<string, string>)
        : undefined,
    command: obj.command as string | undefined,
    args: Array.isArray(obj.args) ? (obj.args as string[]) : undefined,
    env:
      obj.env && typeof obj.env === "object"
        ? (obj.env as Record<string, string>)
        : undefined,
    auth,
    enabled: obj.enabled !== false,
  };
}

// =============================================================================
// MCP Tools Tab
// =============================================================================

function McpToolsTab() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [view, setView] = useState<"list" | "paste" | "form">("list");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const addServers = useCallback((newServers: McpServerConfig[]) => {
    setServers((prev) => {
      const names = new Set(prev.map((s) => s.name));
      const deduped: McpServerConfig[] = [];
      for (const s of newServers) {
        let finalName = s.name;
        let counter = 2;
        while (names.has(finalName)) {
          finalName = `${s.name}-${counter++}`;
        }
        names.add(finalName);
        deduped.push({ ...s, name: finalName });
      }
      return [...prev, ...deduped];
    });
    setView("list");
  }, []);

  const updateServer = useCallback((index: number, server: McpServerConfig) => {
    setServers((prev) => {
      const next = [...prev];
      next[index] = server;
      return next;
    });
    setEditIndex(null);
    setView("list");
  }, []);

  const removeServer = useCallback(
    (index: number) => {
      setServers((prev) => prev.filter((_, i) => i !== index));
      if (editIndex === index) {
        setEditIndex(null);
        setView("list");
      }
    },
    [editIndex],
  );

  const toggleServer = useCallback((index: number) => {
    setServers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  }, []);

  if (view === "paste") {
    return (
      <McpPasteView onImport={addServers} onCancel={() => setView("list")} />
    );
  }

  if (view === "form") {
    return (
      <McpServerForm
        initial={editIndex !== null ? servers[editIndex] : undefined}
        existingNames={servers
          .filter((_, i) => i !== editIndex)
          .map((s) => s.name)}
        onSave={(server) => {
          if (editIndex !== null) updateServer(editIndex, server);
          else addServers([server]);
        }}
        onCancel={() => {
          setEditIndex(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <McpServerList
      servers={servers}
      onAdd={() => {
        setEditIndex(null);
        setView("form");
      }}
      onPaste={() => setView("paste")}
      onEdit={(i) => {
        setEditIndex(i);
        setView("form");
      }}
      onRemove={removeServer}
      onToggle={toggleServer}
    />
  );
}

// =============================================================================
// MCP Server List View
// =============================================================================

function McpServerList({
  servers,
  onAdd,
  onPaste,
  onEdit,
  onRemove,
  onToggle,
}: {
  servers: McpServerConfig[];
  onAdd: () => void;
  onPaste: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  onToggle: (i: number) => void;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (servers.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground px-8">
          <div className="p-4 rounded-full bg-muted/40">
            <Plug className="w-10 h-10 opacity-40" />
          </div>
          <div className="text-center max-w-md space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              MCP Server Integration
            </h3>
            <p className="text-xs leading-relaxed">
              Connect external MCP servers to give this agent access to tools
              from services like Notion, Stripe, Supabase, GitHub, and more.
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onPaste}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste Config
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onAdd}>
              <Plus className="w-3.5 h-3.5" />
              Add Server
            </Button>
          </div>

          <div className="w-full max-w-md mt-4">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Start — paste any of these formats:
              </p>
              <div className="space-y-1.5 text-[10px] font-mono text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary/60 shrink-0 mt-px">1.</span>
                  <span>{`{ "mcpServers": { "name": { "type": "http", "url": "..." } } }`}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary/60 shrink-0 mt-px">2.</span>
                  <span>{`{ "name": { "type": "http", "url": "..." } }`}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary/60 shrink-0 mt-px">3.</span>
                  <span>{`{ "type": "http", "url": "..." }`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">MCP Servers</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {servers.length} server{servers.length !== 1 ? "s" : ""} configured{" "}
            · {servers.filter((s) => s.enabled).length} enabled
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onPaste}
          >
            <ClipboardPaste className="w-3 h-3" />
            Paste
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onAdd}
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {servers.map((server, idx) => (
          <McpServerCard
            key={`${server.name}-${idx}`}
            server={server}
            expanded={expandedIndex === idx}
            onExpand={() =>
              setExpandedIndex(expandedIndex === idx ? null : idx)
            }
            onEdit={() => onEdit(idx)}
            onRemove={() => onRemove(idx)}
            onToggle={() => onToggle(idx)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MCP Server Card
// =============================================================================

const TRANSPORT_META: Record<
  McpTransport,
  { label: string; icon: React.ReactNode; color: string }
> = {
  http: {
    label: "HTTP",
    icon: <Globe className="w-3 h-3" />,
    color: "text-blue-500",
  },
  sse: {
    label: "SSE",
    icon: <Radio className="w-3 h-3" />,
    color: "text-amber-500",
  },
  stdio: {
    label: "stdio",
    icon: <Terminal className="w-3 h-3" />,
    color: "text-green-500",
  },
};

function authLabel(auth: McpAuthStrategy): string {
  switch (auth.strategy) {
    case "oauth_discovery":
      return "OAuth 2.1";
    case "bearer":
      return "Bearer Token";
    case "header":
      return `Header (${auth.headerName})`;
    case "env":
      return "Env Vars";
    case "none":
      return "No Auth";
  }
}

function McpServerCard({
  server,
  expanded,
  onExpand,
  onEdit,
  onRemove,
  onToggle,
}: {
  server: McpServerConfig;
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const meta = TRANSPORT_META[server.transport];

  return (
    <div
      className={`rounded-lg border transition-all ${
        server.enabled
          ? "bg-card border-border"
          : "bg-muted/20 border-border/50 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <button
          onClick={onToggle}
          className="mt-0.5 shrink-0"
          title={server.enabled ? "Disable" : "Enable"}
        >
          {server.enabled ? (
            <Power className="w-4 h-4 text-primary" />
          ) : (
            <PowerOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <button onClick={onExpand} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-foreground truncate">
              {server.label || server.name}
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] h-4 px-1.5 gap-0.5 ${meta.color}`}
            >
              {meta.icon}
              {meta.label}
            </Badge>
            <Badge
              variant="secondary"
              className="text-[9px] h-4 px-1.5 gap-0.5"
            >
              {server.auth.strategy === "none" ? (
                <ShieldOff className="w-2.5 h-2.5" />
              ) : (
                <Shield className="w-2.5 h-2.5" />
              )}
              {authLabel(server.auth)}
            </Badge>
          </div>
          {(server.url || server.command) && (
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              {server.url ||
                `${server.command} ${(server.args ?? []).join(" ")}`}
            </p>
          )}
          {server.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {server.description}
            </p>
          )}
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onExpand}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && <McpServerDetail server={server} />}
    </div>
  );
}

function McpServerDetail({ server }: { server: McpServerConfig }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const config: Record<string, unknown> = { type: server.transport };
    if (server.url) config.url = server.url;
    if (server.command) config.command = server.command;
    if (server.args) config.args = server.args;
    if (server.headers) config.headers = server.headers;
    if (server.env) config.env = server.env;
    const output = { mcpServers: { [server.name]: config } };
    navigator.clipboard.writeText(JSON.stringify(output, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
        <div>
          <span className="text-muted-foreground">Name:</span>{" "}
          <span className="font-mono text-foreground">{server.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Transport:</span>{" "}
          <span className="font-mono text-foreground">{server.transport}</span>
        </div>
        {server.url && (
          <div className="col-span-2">
            <span className="text-muted-foreground">URL:</span>{" "}
            <span className="font-mono text-foreground break-all">
              {server.url}
            </span>
          </div>
        )}
        {server.command && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Command:</span>{" "}
            <span className="font-mono text-foreground">
              {server.command} {(server.args ?? []).join(" ")}
            </span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Auth:</span>{" "}
          <span className="text-foreground">{authLabel(server.auth)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>{" "}
          <span
            className={
              server.enabled ? "text-primary" : "text-muted-foreground"
            }
          >
            {server.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {server.headers && Object.keys(server.headers).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Headers
          </p>
          <div className="rounded border border-border bg-muted/20 p-2 space-y-0.5">
            {Object.entries(server.headers).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[10px] font-mono">
                <span className="text-foreground">{k}:</span>
                <span className="text-muted-foreground truncate">
                  {v.includes("$") || v.length > 20
                    ? `${v.slice(0, 20)}...`
                    : v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {server.env && Object.keys(server.env).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Environment Variables
          </p>
          <div className="rounded border border-border bg-muted/20 p-2 space-y-0.5">
            {Object.entries(server.env).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[10px] font-mono">
                <span className="text-foreground">{k}=</span>
                <span className="text-muted-foreground truncate">
                  {v.startsWith("$") ? v : "••••••••"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy Config"}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MCP Paste View — flexible JSON paste input
// =============================================================================

function McpPasteView({
  onImport,
  onCancel,
}: {
  onImport: (servers: McpServerConfig[]) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] = useState<{
    servers: McpServerConfig[];
    errors: string[];
  } | null>(null);
  const handleParse = () => {
    if (!text.trim()) return;
    const result = parseMcpConfigInput(text);
    setParseResult(result);
  };

  const handleImport = () => {
    if (parseResult && parseResult.servers.length > 0) {
      onImport(parseResult.servers);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Import MCP Servers
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Paste your MCP server config — we'll figure out the format.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParseResult(null);
            }}
            placeholder={`Paste your MCP server configuration here...

Examples:
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}

Or just the inner part:
{
  "type": "http",
  "url": "https://mcp.supabase.com/mcp"
}`}
            className="w-full h-56 rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/40"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleParse}
            disabled={!text.trim()}
          >
            <Search className="w-3 h-3" />
            Parse Config
          </Button>
          {parseResult && parseResult.servers.length > 0 && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleImport}
            >
              <Plus className="w-3 h-3" />
              Import {parseResult.servers.length} Server
              {parseResult.servers.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {parseResult && (
          <div className="space-y-2">
            {parseResult.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                {parseResult.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-destructive"
                  >
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {parseResult.servers.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {parseResult.servers.length} server
                  {parseResult.servers.length !== 1 ? "s" : ""} detected
                </p>
                {parseResult.servers.map((server, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded border border-border/50 bg-background text-xs"
                  >
                    <span
                      className={`shrink-0 ${TRANSPORT_META[server.transport].color}`}
                    >
                      {TRANSPORT_META[server.transport].icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">
                        {server.name}
                      </span>
                      {server.url && (
                        <span className="text-[10px] font-mono text-muted-foreground ml-2 truncate">
                          {server.url}
                        </span>
                      )}
                      {server.command && (
                        <span className="text-[10px] font-mono text-muted-foreground ml-2">
                          {server.command}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 shrink-0"
                    >
                      {authLabel(server.auth)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p>
                <strong>Supported formats:</strong> We accept the full{" "}
                <code className="bg-muted px-1 py-0.5 rounded">mcpServers</code>{" "}
                wrapper, a named map of servers, or a single server object.
                Transport defaults to HTTP if not specified.
              </p>
              <p>
                <strong>Secrets:</strong> Use{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {"${VAR_NAME}"}
                </code>{" "}
                references for tokens — they are never stored in plain text.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MCP Server Form — manual add / edit
// =============================================================================

function McpServerForm({
  initial,
  existingNames,
  onSave,
  onCancel,
}: {
  initial?: McpServerConfig;
  existingNames: string[];
  onSave: (server: McpServerConfig) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [transport, setTransport] = useState<McpTransport>(
    initial?.transport ?? "http",
  );
  const [url, setUrl] = useState(initial?.url ?? "");
  const [command, setCommand] = useState(initial?.command ?? "");
  const [args, setArgs] = useState(initial?.args?.join(" ") ?? "");
  const [authStrategy, setAuthStrategy] = useState<McpAuthStrategy["strategy"]>(
    initial?.auth.strategy ?? "none",
  );
  const [tokenRef, setTokenRef] = useState(() => {
    if (!initial?.auth) return "";
    if ("tokenRef" in initial.auth) return initial.auth.tokenRef;
    return "";
  });
  const [headerName, setHeaderName] = useState(() => {
    if (initial?.auth && "headerName" in initial.auth)
      return initial.auth.headerName;
    return "X-API-Key";
  });
  const [scopes, setScopes] = useState(() => {
    if (initial?.auth && "scopes" in initial.auth)
      return (initial.auth.scopes ?? []).join(", ");
    return "";
  });
  const [envEntries, setEnvEntries] = useState<
    Array<{ key: string; value: string }>
  >(() => {
    if (initial?.env)
      return Object.entries(initial.env).map(([key, value]) => ({
        key,
        value,
      }));
    return [];
  });
  const [headerEntries, setHeaderEntries] = useState<
    Array<{ key: string; value: string }>
  >(() => {
    if (initial?.headers)
      return Object.entries(initial.headers).map(([key, value]) => ({
        key,
        value,
      }));
    return [];
  });

  const isStdio = transport === "stdio";

  const nameError = useMemo(() => {
    if (!name) return null;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name))
      return "Letters, numbers, hyphens, underscores only (max 64)";
    if (existingNames.includes(name) && name !== initial?.name)
      return "Name already exists";
    return null;
  }, [name, existingNames, initial?.name]);

  const canSave =
    name.length > 0 &&
    !nameError &&
    (isStdio ? command.trim().length > 0 : url.trim().length > 0);

  const handleSave = () => {
    let auth: McpAuthStrategy;
    switch (authStrategy) {
      case "oauth_discovery":
        auth = {
          strategy: "oauth_discovery",
          ...(scopes.trim()
            ? {
                scopes: scopes
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }
            : {}),
        };
        break;
      case "bearer":
        auth = { strategy: "bearer", tokenRef: tokenRef.trim() || "TOKEN" };
        break;
      case "header":
        auth = {
          strategy: "header",
          headerName: headerName.trim() || "X-API-Key",
          tokenRef: tokenRef.trim() || "TOKEN",
        };
        break;
      case "env":
        auth = { strategy: "env" };
        break;
      default:
        auth = { strategy: "none" };
    }

    const envObj: Record<string, string> = {};
    for (const e of envEntries) {
      if (e.key.trim()) envObj[e.key.trim()] = e.value;
    }

    const headersObj: Record<string, string> = {};
    for (const h of headerEntries) {
      if (h.key.trim()) headersObj[h.key.trim()] = h.value;
    }
    if (authStrategy === "bearer" && tokenRef.trim()) {
      headersObj["Authorization"] =
        `Bearer ${tokenRef.trim().startsWith("$") ? tokenRef.trim() : "${" + tokenRef.trim() + "}"}`;
    }
    if (authStrategy === "header" && headerName.trim() && tokenRef.trim()) {
      headersObj[headerName.trim()] = tokenRef.trim().startsWith("$")
        ? tokenRef.trim()
        : `\${${tokenRef.trim()}}`;
    }

    const server: McpServerConfig = {
      name: name.trim(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
      transport,
      url: !isStdio ? url.trim() : undefined,
      command: isStdio ? command.trim() : undefined,
      args: isStdio && args.trim() ? args.trim().split(/\s+/) : undefined,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
      auth,
      enabled: true,
    };

    onSave(server);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          {initial ? "Edit MCP Server" : "Add MCP Server"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Identity */}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Identity
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">
                Server Name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="supabase"
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
              {nameError && (
                <p className="text-[10px] text-destructive mt-0.5">
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">
                Display Name
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Supabase (Production)"
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1 block">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this server provides..."
              className="h-7 text-xs"
              style={{ fontSize: "16px" }}
            />
          </div>
        </fieldset>

        {/* Transport */}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Transport
          </legend>
          <div className="flex gap-1.5">
            {(["http", "sse", "stdio"] as McpTransport[]).map((t) => {
              const meta = TRANSPORT_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setTransport(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    transport === t
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {meta.icon}
                  {meta.label}
                </button>
              );
            })}
          </div>

          {!isStdio ? (
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">
                Server URL *
              </Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mcp.example.com/mcp"
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">
                  Command *
                </Label>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx"
                  className="h-7 text-xs"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">
                  Arguments
                </Label>
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="-y @modelcontextprotocol/server-github"
                  className="h-7 text-xs"
                  style={{ fontSize: "16px" }}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Space-separated
                </p>
              </div>
            </div>
          )}
        </fieldset>

        {/* Authentication */}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Authentication
          </legend>
          <Select
            value={authStrategy}
            onValueChange={(v) =>
              setAuthStrategy(v as McpAuthStrategy["strategy"])
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!isStdio && (
                <SelectItem value="none" className="text-xs">
                  No Auth (Public)
                </SelectItem>
              )}
              {!isStdio && (
                <SelectItem value="oauth_discovery" className="text-xs">
                  OAuth 2.1 Discovery
                </SelectItem>
              )}
              {!isStdio && (
                <SelectItem value="bearer" className="text-xs">
                  Bearer Token
                </SelectItem>
              )}
              {!isStdio && (
                <SelectItem value="header" className="text-xs">
                  Custom Header
                </SelectItem>
              )}
              {isStdio && (
                <SelectItem value="env" className="text-xs">
                  Environment Variables
                </SelectItem>
              )}
              {isStdio && (
                <SelectItem value="none" className="text-xs">
                  None
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {authStrategy === "bearer" && (
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">
                Token / Variable Reference
              </Label>
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={tokenRef}
                  onChange={(e) => setTokenRef(e.target.value)}
                  placeholder="SUPABASE_ACCESS_TOKEN"
                  className="h-7 text-xs flex-1"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Enter the env var name (e.g. SUPABASE_ACCESS_TOKEN) or the raw
                token
              </p>
            </div>
          )}

          {authStrategy === "header" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">
                  Header Name
                </Label>
                <Input
                  value={headerName}
                  onChange={(e) => setHeaderName(e.target.value)}
                  placeholder="X-API-Key"
                  className="h-7 text-xs"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">
                  Token / Variable
                </Label>
                <Input
                  value={tokenRef}
                  onChange={(e) => setTokenRef(e.target.value)}
                  placeholder="API_KEY"
                  className="h-7 text-xs"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
          )}

          {authStrategy === "oauth_discovery" && (
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">
                Scopes (optional, comma-separated)
              </Label>
              <Input
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                placeholder="read, write"
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                OAuth scopes are auto-discovered if left blank
              </p>
            </div>
          )}
        </fieldset>

        {/* Env vars for stdio */}
        {isStdio && (
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Environment Variables
            </legend>
            {envEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={entry.key}
                  onChange={(e) => {
                    const next = [...envEntries];
                    next[idx] = { ...next[idx], key: e.target.value };
                    setEnvEntries(next);
                  }}
                  placeholder="GITHUB_TOKEN"
                  className="h-6 text-[11px] flex-1"
                  style={{ fontSize: "16px" }}
                />
                <span className="text-muted-foreground text-[11px]">=</span>
                <Input
                  value={entry.value}
                  onChange={(e) => {
                    const next = [...envEntries];
                    next[idx] = { ...next[idx], value: e.target.value };
                    setEnvEntries(next);
                  }}
                  placeholder="${GITHUB_TOKEN}"
                  className="h-6 text-[11px] flex-1"
                  style={{ fontSize: "16px" }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setEnvEntries(envEntries.filter((_, i) => i !== idx))
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() =>
                setEnvEntries([...envEntries, { key: "", value: "" }])
              }
            >
              <Plus className="w-2.5 h-2.5 mr-0.5" />
              Add Variable
            </Button>
          </fieldset>
        )}

        {/* Custom headers for http/sse */}
        {!isStdio &&
          (authStrategy === "none" || authStrategy === "oauth_discovery") && (
            <fieldset className="space-y-3">
              <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Additional Headers (optional)
              </legend>
              {headerEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Input
                    value={entry.key}
                    onChange={(e) => {
                      const next = [...headerEntries];
                      next[idx] = { ...next[idx], key: e.target.value };
                      setHeaderEntries(next);
                    }}
                    placeholder="X-Custom-Header"
                    className="h-6 text-[11px] flex-1"
                    style={{ fontSize: "16px" }}
                  />
                  <span className="text-muted-foreground text-[11px]">:</span>
                  <Input
                    value={entry.value}
                    onChange={(e) => {
                      const next = [...headerEntries];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setHeaderEntries(next);
                    }}
                    placeholder="value"
                    className="h-6 text-[11px] flex-1"
                    style={{ fontSize: "16px" }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setHeaderEntries(
                        headerEntries.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5"
                onClick={() =>
                  setHeaderEntries([...headerEntries, { key: "", value: "" }])
                }
              >
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                Add Header
              </Button>
            </fieldset>
          )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={!canSave}
        >
          {initial ? "Update Server" : "Add Server"}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Shared Sub-components
// =============================================================================

function ParameterTable({ schema }: { schema: CustomToolInputSchema }) {
  const requiredSet = new Set(schema.required ?? []);
  const entries = Object.entries(schema.properties);

  if (entries.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No parameters defined.
      </p>
    );
  }

  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_70px_2fr_50px] gap-2 px-2.5 py-1 bg-muted/50 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Name
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Type
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Req
        </span>
      </div>
      {entries.map(([pName, pDef], idx) => (
        <div
          key={pName}
          className={`grid grid-cols-[1fr_70px_2fr_50px] gap-2 px-2.5 py-1.5 text-xs items-center ${
            idx < entries.length - 1 ? "border-b border-border" : ""
          } ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
        >
          <span className="font-mono text-foreground truncate">{pName}</span>
          <span className="text-muted-foreground">{pDef.type}</span>
          <span className="text-muted-foreground text-[11px] truncate">
            {pDef.description ?? "—"}
          </span>
          <span className="text-center">
            {requiredSet.has(pName) ? (
              <Check className="w-3 h-3 text-primary inline" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  expanded,
  onToggle,
  onExpand,
}: {
  tool: DatabaseTool;
  active: boolean;
  expanded: boolean;
  onToggle: (name: string) => void;
  onExpand: () => void;
}) {
  const params = tool.parameters;
  const hasParams =
    params &&
    typeof params === "object" &&
    "properties" in params &&
    Object.keys((params as Record<string, unknown>).properties ?? {}).length >
      0;
  const hasOutput =
    tool.output_schema && typeof tool.output_schema === "object";
  const hasMeta =
    tool.function_path || (tool.tags && tool.tags.length > 0) || tool.version;
  const hasDetails = hasParams || hasOutput || hasMeta;

  return (
    <div
      className={`rounded-lg text-left transition-all border ${
        active
          ? "bg-primary/8 border-primary/20"
          : "border-transparent hover:bg-muted/50 hover:border-border"
      }`}
    >
      <div className="flex items-start gap-3 w-full px-3 py-2.5">
        {/* Checkbox */}
        <button onClick={() => onToggle(tool.name)} className="mt-0.5 shrink-0">
          <div
            className={`flex items-center justify-center w-4 h-4 rounded border-[1.5px] transition-all ${
              active
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-primary/50"
            }`}
          >
            {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-semibold leading-tight ${
                active ? "text-primary" : "text-foreground"
              }`}
            >
              {tool.name}
            </span>
            {tool.category && (
              <span className="text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                {tool.category}
              </span>
            )}
            {tool.tags && tool.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {tool.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[9px] h-4 px-1"
                  >
                    {tag}
                  </Badge>
                ))}
                {tool.tags.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{tool.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
          {tool.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          )}
        </div>

        {/* Expand button */}
        {hasDetails && (
          <button
            onClick={onExpand}
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="View details"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <Info className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && <ToolDetailPanel tool={tool} />}
    </div>
  );
}

function ToolDetailPanel({ tool }: { tool: DatabaseTool }) {
  const [copied, setCopied] = useState(false);
  const params = tool.parameters as {
    type?: string;
    properties?: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: unknown[];
        [k: string]: unknown;
      }
    >;
    required?: string[];
  } | null;

  const hasParams =
    params && params.properties && Object.keys(params.properties).length > 0;

  const handleCopyJson = () => {
    const json = JSON.stringify(
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        output_schema: tool.output_schema,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-3">
      {/* Parameters */}
      {hasParams && params.properties && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Parameters
          </p>
          <ParameterTable
            schema={{
              type: "object" as const,
              properties: params.properties,
              required: params.required,
            }}
          />
        </div>
      )}

      {/* Output schema */}
      {tool.output_schema && typeof tool.output_schema === "object" && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Output Schema
          </p>
          <pre className="text-[10px] font-mono bg-muted/30 rounded p-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {JSON.stringify(tool.output_schema, null, 2)}
          </pre>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {tool.function_path && (
          <span className="flex items-center gap-1">
            <FileCode2 className="w-3 h-3" />
            <code className="bg-muted/40 px-1 py-0.5 rounded">
              {tool.function_path}
            </code>
          </span>
        )}
        {tool.version && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />v{tool.version}
          </span>
        )}
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy JSON"}
        </button>
      </div>
    </div>
  );
}

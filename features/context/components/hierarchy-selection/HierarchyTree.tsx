"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  FolderKanban,
  ListTodo,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/cn";
import { useHierarchySelection } from "./useHierarchySelection";
import type { HierarchySelectionProps, HierarchyOption } from "./types";

const LEVEL_ICONS = {
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

const LEVEL_ACCENT = {
  organization: "text-violet-500",
  project: "text-amber-500",
  task: "text-sky-500",
};

interface TreeNode {
  id: string;
  name: string;
  level: "organization" | "project" | "task";
  children: TreeNode[];
  status?: string | null;
  isPersonal?: boolean;
}

export function HierarchyTree({
  levels = ["organization", "project", "task"],
  value,
  onChange,
  disabled,
  className,
}: HierarchySelectionProps) {
  const ctx = useHierarchySelection({
    levels,
    controlled: { value, onChange },
  });

  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const nodes: TreeNode[] = ctx.orgs.map((org) => {
      const orgProjects = levels.includes("project")
        ? ctx.projects
            .filter(() => value.organizationId === org.id || !value.organizationId)
            .map((proj) => ({
              id: proj.id,
              name: proj.name,
              level: "project" as const,
              children: levels.includes("task")
                ? ctx.tasks
                    .filter(() => value.projectId === proj.id)
                    .map((t) => ({
                      id: t.id,
                      name: t.name,
                      level: "task" as const,
                      children: [],
                      status: t.status,
                    }))
                : [],
            }))
        : [];
      return {
        id: org.id,
        name: org.name,
        level: "organization" as const,
        children: orgProjects,
        isPersonal: org.isPersonal,
      };
    });
    return nodes;
  }, [ctx.orgs, ctx.projects, ctx.tasks, levels, value]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    function prune(node: TreeNode): TreeNode | null {
      if (node.name.toLowerCase().includes(q)) return node;
      const children = node.children.map(prune).filter(Boolean) as TreeNode[];
      if (children.length > 0) return { ...node, children };
      return null;
    }
    return tree.map(prune).filter(Boolean) as TreeNode[];
  }, [tree, search]);

  const effectiveExpanded = search.trim()
    ? new Set(getAllIds(filteredTree))
    : expandedIds;

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedId = value.taskId ?? value.projectId ?? value.organizationId;

  const handleSelect = (node: TreeNode) => {
    if (disabled) return;
    if (node.level === "organization") ctx.setOrg(node.id);
    else if (node.level === "project") ctx.setProject(node.id);
    else if (node.level === "task") ctx.setTask(node.id);
  };

  if (ctx.isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ctx.isError) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <AlertCircle className="h-5 w-5 text-destructive mr-2" />
        <span className="text-xs text-destructive">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-2 py-1.5 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
            disabled={disabled}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredTree.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              expandedIds={effectiveExpanded}
              onSelect={handleSelect}
              onToggle={toggle}
              disabled={disabled}
            />
          ))}
          {filteredTree.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-6">
              {search ? `No results for "${search}"` : "No organizations"}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  disabled,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const Icon = LEVEL_ICONS[node.level];
  const accent = LEVEL_ACCENT[node.level];

  return (
    <>
      <div
        className={cn(
          "group flex items-center rounded-md cursor-pointer transition-all",
          isSelected ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50",
          disabled && "opacity-50 pointer-events-none",
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px`, paddingRight: "4px" }}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node);
        }}
      >
        <div className={cn("h-5 w-5 flex items-center justify-center shrink-0", !hasChildren && "invisible")}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <Icon className={cn("h-3.5 w-3.5 shrink-0 mr-1.5", isSelected ? "text-primary" : accent)} />
        <span className={cn("text-xs truncate flex-1 min-w-0 py-1", isSelected && "font-semibold text-primary")}>
          {node.name}
        </span>
        {hasChildren && (
          <span className="text-[9px] text-muted-foreground/60 font-mono tabular-nums shrink-0 mr-1">
            {node.children.length}
          </span>
        )}
        {node.status && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              node.status === "completed" ? "bg-green-400" :
              node.status === "in_progress" ? "bg-blue-400" :
              node.status === "blocked" ? "bg-red-400" : "bg-gray-400",
            )}
          />
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </>
  );
}

function getAllIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    ids.push(...getAllIds(n.children));
  }
  return ids;
}

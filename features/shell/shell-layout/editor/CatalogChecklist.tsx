"use client";

// CatalogChecklist — everything that can go in the menu, as a three-level tree with check marks. Ticking a
// row brings its default children (each can be unticked); a partly-placed parent shows a dash. Items the
// default menu hides (Settings pages, admin pages, tool windows) sit under "More you can add".
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox, cn } from "@ai-matrx/design-system";
import { SearchField } from "@ai-matrx/design-system/controls";
import ShellIcon from "@/features/shell/components/ShellIcon";
import { filterCatalogTree, tickState, type CatalogTree, type CatalogTreeNode } from "./tree";

interface Props {
  tree: CatalogTree;
  placed: Set<string>;
  onTick: (entryId: string, on: boolean) => void;
  /** The Dock is flat: no nested rows. */
  flat?: boolean;
}

export function CatalogChecklist({ tree, placed, onTick, flat = false }: Props) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const sections: Array<{ key: string; title: string | null; nodes: CatalogTreeNode[] }> = [
    { key: "main", title: null, nodes: tree.main },
    { key: "settings", title: "Settings", nodes: tree.settings },
    { key: "tools", title: "Tool windows", nodes: tree.tools },
    { key: "admin", title: "Admin", nodes: tree.admin },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-2">
        <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a page or tool" aria-label="Find a page or tool" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {sections.map((section, i) => {
          const nodes = filterCatalogTree(section.nodes, query);
          if (nodes.length === 0) return null;
          return (
            <div key={section.key}>
              {i === 1 && !searching ? <p className="type-label px-2 pb-1 pt-3">More you can add</p> : null}
              {section.title ? <p className="type-meta px-2 pb-0.5 pt-2 text-muted-foreground">{section.title}</p> : null}
              <ul>
                {nodes.map((node) => (
                  <CheckRow key={node.entry.id} node={node} depth={1} tree={tree} placed={placed} onTick={onTick} flat={flat} forceOpen={searching} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckRow({
  node,
  depth,
  tree,
  placed,
  onTick,
  flat,
  forceOpen,
}: {
  node: CatalogTreeNode;
  depth: number;
  tree: CatalogTree;
  placed: Set<string>;
  onTick: (entryId: string, on: boolean) => void;
  flat: boolean;
  forceOpen: boolean;
}) {
  const state = tickState(tree, placed, node.entry.id);
  const [open, setOpen] = useState(state === "partial");
  const expanded = forceOpen || open;
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex min-h-8 items-center gap-1.5 rounded-md pr-2 hover:bg-accent" style={{ paddingLeft: `${(depth - 1) * 18 + 4}px` }}>
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? `Collapse ${node.entry.label}` : `Expand ${node.entry.label}`}
            aria-expanded={expanded}
            className="flex h-6 w-5 shrink-0 items-center justify-center text-muted-foreground"
            onClick={() => setOpen(!open)}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <label className={cn("flex min-w-0 flex-1 items-center gap-2 py-1")} data-clickable>
          <Checkbox
            checked={state === "on" ? true : state === "partial" ? "indeterminate" : false}
            onCheckedChange={() => onTick(node.entry.id, state !== "on")}
            aria-label={node.entry.label}
          />
          <ShellIcon name={node.entry.iconName} className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate type-body">{node.entry.label}</span>
        </label>
      </div>
      {hasChildren && expanded ? (
        <ul>
          {node.children.map((child) => (
            <CheckRow key={child.entry.id} node={child} depth={flat ? depth : depth + 1} tree={tree} placed={placed} onTick={onTick} flat={flat} forceOpen={forceOpen} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

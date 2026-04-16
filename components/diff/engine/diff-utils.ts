import type { DiffNode, DiffStats } from "./types";

export function flattenDiffNodes(nodes: DiffNode[]): DiffNode[] {
  const result: DiffNode[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      result.push(...flattenDiffNodes(node.children));
    } else {
      result.push(node);
    }
  }
  return result;
}

export function filterChanges(nodes: DiffNode[]): DiffNode[] {
  return nodes.filter((node) => node.changeType !== "unchanged");
}

export function filterChangesDeep(nodes: DiffNode[]): DiffNode[] {
  const result: DiffNode[] = [];
  for (const node of nodes) {
    if (node.changeType === "unchanged") continue;
    if (node.children) {
      const filteredChildren = filterChangesDeep(node.children);
      result.push({ ...node, children: filteredChildren });
    } else {
      result.push(node);
    }
  }
  return result;
}

export function groupByTopLevelField(nodes: DiffNode[]): Map<string, DiffNode> {
  const map = new Map<string, DiffNode>();
  for (const node of nodes) {
    const topKey = node.path[0] ?? node.key;
    map.set(topKey, node);
  }
  return map;
}

export function countChangedFields(nodes: DiffNode[]): number {
  return nodes.filter((n) => n.changeType !== "unchanged").length;
}

export function aggregateStats(nodes: DiffNode[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 };
  for (const node of nodes) {
    stats.total++;
    switch (node.changeType) {
      case "added":
        stats.added++;
        break;
      case "removed":
        stats.removed++;
        break;
      case "modified":
      case "reordered":
        stats.modified++;
        break;
      case "unchanged":
        stats.unchanged++;
        break;
    }
  }
  return stats;
}

export function pathToString(path: string[]): string {
  return path.reduce((acc, segment, i) => {
    if (i === 0) return segment;
    if (/^\d+$/.test(segment)) return `${acc}[${segment}]`;
    return `${acc}.${segment}`;
  }, "");
}

export function formatChangeType(changeType: DiffNode["changeType"]): string {
  switch (changeType) {
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "modified":
      return "Modified";
    case "reordered":
      return "Reordered";
    case "unchanged":
      return "Unchanged";
  }
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length !== 1 ? "s" : ""}`;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

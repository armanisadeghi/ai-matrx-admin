// rowDisplay — the name and icon a stored row shows (its own override, else the catalog's). Light: no React.
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { getCatalogEntry } from "../catalog";
import type { ShellNode } from "../contract";
import { resolveRetiredNavId } from "../retired-nav-ids";

export function rowLabel(node: ShellNode): string {
  if (node.kind === "nav") return node.label ?? getCatalogEntry(resolveRetiredNavId(node.ref).id ?? node.ref, { isAdmin: true })?.label ?? node.ref;
  return node.label;
}

export function rowIcon(node: ShellNode): ShellIconName {
  if (node.kind === "nav") return node.icon ?? getCatalogEntry(resolveRetiredNavId(node.ref).id ?? node.ref, { isAdmin: true })?.iconName ?? "File";
  if (node.kind === "launchpad") return node.icon ?? "LayoutGrid";
  if (node.kind === "record") return node.icon ?? "FileText";
  return node.icon;
}


"use client";

import { Slash } from "lucide-react";
import { type SettingsTreeNode, findAncestorPath, findNodeById } from "./types";

type SettingsBreadcrumbProps = {
  nodes: SettingsTreeNode[];
  activeId: string | null;
  /** Root label shown as the first crumb. */
  rootLabel?: string;
  /** Click handler for crumbs — usually navigates via the registry. */
  onNavigate?: (id: string | null) => void;
};

/**
 * Renders a compact breadcrumb trail for the active settings path:
 * "Settings / Appearance / Theme"
 */
export function SettingsBreadcrumb({
  nodes,
  activeId,
  rootLabel = "Settings",
  onNavigate,
}: SettingsBreadcrumbProps) {
  const ancestors = activeId ? findAncestorPath(nodes, activeId) : [];
  const active = activeId ? findNodeById(nodes, activeId) : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      <Crumb
        label={rootLabel}
        onClick={onNavigate ? () => onNavigate(null) : undefined}
        interactive
      />
      {ancestors.map((id) => {
        const node = findNodeById(nodes, id);
        if (!node) return null;
        return (
          <span key={id} className="flex items-center gap-1">
            <Slash className="h-3 w-3 opacity-40" />
            <Crumb
              label={node.label}
              onClick={onNavigate ? () => onNavigate(id) : undefined}
              interactive
            />
          </span>
        );
      })}
      {active && (
        <span className="flex items-center gap-1">
          <Slash className="h-3 w-3 opacity-40" />
          <span className="font-medium text-foreground">{active.label}</span>
        </span>
      )}
    </nav>
  );
}

function Crumb({
  label,
  onClick,
  interactive,
}: {
  label: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="hover:text-foreground transition-colors"
      >
        {label}
      </button>
    );
  }
  return <span>{label}</span>;
}

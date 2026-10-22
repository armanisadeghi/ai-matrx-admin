"use client";

// The published chart, drawn by the ONE org chart primitive in read-only mode (no drop, add or
// delete handlers). Boxes rise in one level after another; prefers-reduced-motion shows them at once.
// A box opens nothing — the snapshot names people and agents, it never links to them.

import { Briefcase, Eye, EyeOff, User, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@ai-matrx/design-system/controls";

import { OrgChart } from "@/components/official/org-chart/OrgChart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { cn } from "@/lib/utils";

import { ORG_LINK_KIND_META } from "../constants";
import { snapshotTree, type OrgChartSnapshot, type PublicOrgBox } from "./snapshot";

const EDGE_KINDS = {
  directs: ORG_LINK_KIND_META.directs,
  reports_to: ORG_LINK_KIND_META.reports_to,
};

const ICON = { agent: AGENT_ICON, team: UsersRound, position: Briefcase, person: User } as const;

const TYPE_WORD: Record<PublicOrgBox["box_type"], string> = {
  agent: "AI agent",
  person: "Person",
  team: "Team",
  position: "Position",
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** The publisher's preview: each box can be left off the page. Absent on the public page. */
export interface PublishPreviewEditing {
  isHidden: (key: string) => boolean;
  toggle: (key: string) => void;
}

function PublicCard({ box, depth, editing }: { box: PublicOrgBox; depth: number; editing?: PublishPreviewEditing }) {
  const Icon = ICON[box.box_type];
  const hidden = editing?.isHidden(box.key) ?? false;
  return (
    <div
      role="group"
      aria-label={box.label}
      className={cn(
        "flex h-full w-full items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm",
        box.box_type !== "agent" && "border-l-4 border-l-foreground/25",
        hidden && "border-dashed bg-muted shadow-none",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${Math.min(depth, 6) * 140}ms` } as CSSProperties}
    >
      {box.box_type === "person" ? (
        <Avatar size="md" className="shrink-0">
          {box.avatar_url ? <AvatarImage src={box.avatar_url} alt="" /> : null}
          <AvatarFallback>{initials(box.label)}</AvatarFallback>
        </Avatar>
      ) : (
        <div
          data-matrx-pill="off"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn("line-clamp-2 type-title leading-tight", hidden ? "text-muted-foreground" : "text-foreground")}
          title={box.label}
        >
          {box.label}
        </div>
        <div className="mt-0.5 truncate type-meta leading-tight text-muted-foreground" title={box.sublabel}>
          {hidden ? "Left off the page" : (box.sublabel ?? TYPE_WORD[box.box_type])}
        </div>
      </div>
      {editing && (
        <Button
          variant="quiet"
          icon={hidden ? <EyeOff /> : <Eye />}
          aria-label={hidden ? `Show ${box.label} on the page` : `Leave ${box.label} off the page`}
          title={hidden ? "Show on the page" : "Leave off the page"}
          onClick={() => editing.toggle(box.key)}
        />
      )}
    </div>
  );
}

export function PublishedOrgChart({
  snapshot,
  title,
  editing,
}: {
  snapshot: OrgChartSnapshot;
  title: string;
  /** The publisher's preview only: a show/hide toggle on every box. */
  editing?: PublishPreviewEditing;
}) {
  const roots = snapshotTree(snapshot);
  return (
    <OrgChart<PublicOrgBox>
      roots={roots}
      edgeKinds={EDGE_KINDS}
      getSearchText={(b) => `${b.label} ${b.sublabel ?? ""}`}
      renderCard={(n) => <PublicCard box={n.node.data} depth={n.depth} editing={editing} />}
      exportTitle={title}
      persistKey={`published-org-chart:${title}`}
      ariaLabel={`${title} — org chart`}
      className="h-full"
    />
  );
}

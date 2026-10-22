"use client";

// The published chart, drawn by the ONE org chart primitive in read-only mode (no drop, add or
// delete handlers). Boxes rise in one level after another; prefers-reduced-motion shows them at once.
// A box opens nothing — the snapshot names people and agents, it never links to them.

import { Briefcase, User, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";

import { OrgChart } from "@/components/official/org-chart/OrgChart";
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

function PublicCard({ box, depth }: { box: PublicOrgBox; depth: number }) {
  const Icon = ICON[box.box_type];
  return (
    <div
      role="group"
      aria-label={box.label}
      className={cn(
        "flex h-full w-full items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm",
        box.box_type !== "agent" && "border-l-4 border-l-foreground/25",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${Math.min(depth, 6) * 140}ms` } as CSSProperties}
    >
      {box.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a 36px public avatar; next/image adds nothing here
        <img src={box.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div
          data-matrx-pill="off"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center bg-muted text-foreground",
            box.box_type === "person" ? "rounded-full" : "rounded-lg",
          )}
        >
          {box.box_type === "person" ? (
            <span className="type-secondary font-semibold">{initials(box.label)}</span>
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 type-title leading-tight text-foreground" title={box.label}>
          {box.label}
        </div>
        <div className="mt-0.5 truncate type-meta leading-tight text-muted-foreground" title={box.sublabel}>
          {box.sublabel ?? TYPE_WORD[box.box_type]}
        </div>
      </div>
    </div>
  );
}

export function PublishedOrgChart({ snapshot, title }: { snapshot: OrgChartSnapshot; title: string }) {
  const roots = snapshotTree(snapshot);
  return (
    <OrgChart<PublicOrgBox>
      roots={roots}
      edgeKinds={EDGE_KINDS}
      getSearchText={(b) => `${b.label} ${b.sublabel ?? ""}`}
      renderCard={(n) => <PublicCard box={n.node.data} depth={n.depth} />}
      exportTitle={title}
      persistKey={`published-org-chart:${title}`}
      ariaLabel={`${title} — org chart`}
      className="h-full"
    />
  );
}

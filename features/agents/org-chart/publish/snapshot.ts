// features/agents/org-chart/publish/snapshot.ts — what a published org chart carries (pure, tested).
//
// A published chart is a SNAPSHOT a stranger reads: names, title lines, box types, how each box
// hangs under its parent, and an avatar only when it is already a plain public image. Never an
// email, never a database id — every box gets an opaque key ("b1", "b2", …) that means nothing
// outside this snapshot. The payload carries `__kind: "org_chart_snapshot"` (registered kind; the
// table's CHECK refuses anything else).

import type { OrgChartTreeNode } from "@/components/official/org-chart/layout";

import type { AgentOrgNodeData } from "../buildAgentOrgForest";
import type { OrgBoxType } from "../constants";

export const SNAPSHOT_KIND = "org_chart_snapshot" as const;

export type PublicBoxType = "agent" | "person" | "team" | "position";
export type PublicLinkKind = "directs" | "reports_to";

export interface PublicOrgBox {
  key: string;
  label: string;
  sublabel?: string;
  box_type: PublicBoxType;
  avatar_url?: string;
  link_kind?: PublicLinkKind;
  children: PublicOrgBox[];
}

export interface OrgChartSnapshot {
  __kind: typeof SNAPSHOT_KIND;
  roots: PublicOrgBox[];
}

/** What the chart shows for one box, read by the caller from the chart's own name sources. */
export interface BoxFace {
  name: string | null;
  detail: string | null;
  avatarUrl: string | null;
}

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g;
const SUBLABEL_MAX = 90;
const LABEL_MAX = 80;

const TYPE_OF: Record<OrgBoxType, PublicBoxType> = {
  agent: "agent",
  membership: "person",
  team: "team",
  position: "position",
};

const FALLBACK_LABEL: Record<PublicBoxType, string> = {
  agent: "Agent",
  person: "Team member",
  team: "Team",
  position: "Open position",
};

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Removes anything shaped like an email address; null when nothing worth showing is left. */
export function withoutEmails(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(EMAIL, "").replace(/\s{2,}/g, " ").replace(/^[\s,·-]+|[\s,·-]+$/g, "");
  return cleaned.trim() ? cleaned.trim() : null;
}

/**
 * Only an avatar that is already a plain public image: https, and no signature or token in its
 * address (a signed URL is a handoff, never an identity — and it would expire on the page anyway).
 */
export function publicAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const q = parsed.search.toLowerCase();
  if (/(token|signature|x-amz-|expires|sig=|key=)/.test(q)) return null;
  return parsed.toString();
}

/** Turns the chart as drawn into the snapshot strangers read. */
export function buildPublishSnapshot(
  roots: readonly OrgChartTreeNode<AgentOrgNodeData>[],
  faceOf: (data: AgentOrgNodeData) => BoxFace,
): OrgChartSnapshot {
  let n = 0;
  const walk = (node: OrgChartTreeNode<AgentOrgNodeData>): PublicOrgBox => {
    const d = node.data;
    const type = TYPE_OF[d.boxType];
    const face = faceOf(d);
    const label = clip(withoutEmails(face.name) ?? FALLBACK_LABEL[type], LABEL_MAX);
    const sub = withoutEmails(d.roleTitle) ?? withoutEmails(face.detail);
    const avatar = type === "person" ? publicAvatar(face.avatarUrl) : null;
    const box: PublicOrgBox = {
      key: `b${++n}`,
      label,
      box_type: type,
      children: [],
    };
    if (sub) box.sublabel = clip(sub, SUBLABEL_MAX);
    if (avatar) box.avatar_url = avatar;
    if (node.edgeKind === "directs" || node.edgeKind === "reports_to") box.link_kind = node.edgeKind;
    // A loop is cut where it closes on the chart; the snapshot stops there too.
    box.children = d.loop ? [] : node.children.map(walk);
    return box;
  };
  return { __kind: SNAPSHOT_KIND, roots: roots.map(walk) };
}

export function countBoxes(snapshot: OrgChartSnapshot): number {
  const count = (b: PublicOrgBox): number => 1 + b.children.reduce((s, c) => s + count(c), 0);
  return snapshot.roots.reduce((s, r) => s + count(r), 0);
}

/** The outline the blurb job reads: one box per line, two spaces per level. */
export function snapshotOutline(snapshot: OrgChartSnapshot): string {
  const lines: string[] = [];
  const walk = (b: PublicOrgBox, depth: number) => {
    const parts = [b.label, b.box_type, b.sublabel].filter(Boolean);
    lines.push(`${"  ".repeat(depth)}${parts.join(" — ")}`);
    b.children.forEach((c) => walk(c, depth + 1));
  };
  snapshot.roots.forEach((r) => walk(r, 0));
  return lines.join("\n");
}

/** The snapshot as tree nodes for the ONE chart primitive (read-only). */
export function snapshotTree(snapshot: OrgChartSnapshot): OrgChartTreeNode<PublicOrgBox>[] {
  const walk = (b: PublicOrgBox): OrgChartTreeNode<PublicOrgBox> => ({
    key: b.key,
    edgeKind: b.link_kind ?? null,
    data: b,
    children: b.children.map(walk),
  });
  return snapshot.roots.map(walk);
}

/** Reads a stored snapshot defensively; null when it is not one. */
export function parseSnapshot(value: unknown): OrgChartSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { __kind?: unknown; roots?: unknown };
  if (v.__kind !== SNAPSHOT_KIND || !Array.isArray(v.roots)) return null;
  return value as OrgChartSnapshot;
}

/** A readable address: lowercase words joined by dashes, 3–80 characters (the table's CHECK). */
export function slugify(text: string): string {
  const s = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return s.length >= 3 ? s : `${s || "org"}-chart`;
}

export const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

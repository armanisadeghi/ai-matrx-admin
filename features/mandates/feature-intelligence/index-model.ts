// features/mandates/feature-intelligence/index-model.ts
//
// THE /intelligence DIRECTORY, as data, in the registry's own shape (read live:
// `platform.taxonomy_node`) with every job where the database places it
// (`mandate.intelligence_placement`, arranged by `placement-model.ts`): one
// section per Domain — the Domain's own jobs as its first card, then a card per
// Feature holding jobs (its own and every node below it, any depth) — then
// Everywhere, the owner lanes, Unplaced and (admins) Test fixtures. A job with
// per-surface versions counts once, as its roll-up. Search reads every name on
// the path, the jobs, places and holders. Pure: the component and the tests
// share it.

import type { MandateStatus } from "@/features/mandates/status/mandate-status";
import { declaredPlacesForKeys } from "./registry";
import { shortMandateName } from "./service";
import {
  childrenOf,
  entryKey,
  entryKeys,
  groupOf,
  LANE_ORDER,
  LANES,
  pathOf,
  type NodeGroup,
  type PlacedEntry,
  type Tree,
} from "./placement-model";
import { storedMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";

/** One job as the directory needs it. */
export interface DirectoryJob {
  key: AnyMandateKey;
  /** Name without the feature or domain label the card already shows. */
  name: string;
  description: string | null;
  goal: string | null;
  /** The node (or lane) the job sits on. */
  home: string;
  /** Slugs from the root to its node (empty for a lane). */
  path: readonly string[];
  /** Names along that path, for search. */
  pathNames: string;
  /** Per-surface versions inside this job's roll-up (0 for a plain job). */
  versions: number;
  /** From the member list, once it answers: who runs it from this seat. */
  holderName?: string;
  holderType?: "agent" | "workflow" | null;
  status?: MandateStatus;
}

export interface DirectoryPlace {
  label: string;
  trigger: string;
}

/** A child node inside a card: its name, its job count, its own children. */
export interface DirectoryChild {
  slug: string;
  label: string;
  count: number;
  children: DirectoryChild[];
}

export interface DirectoryFeature {
  /** The page id: a registry node slug, or a lane id. */
  feature: string;
  /** The card's name: the registry's words, or the lane's. */
  label: string;
  /** The Domain's slug, or null for a lane. */
  domain: string | null;
  /** Every job at or below this card's node (a roll-up counts once). */
  jobs: DirectoryJob[];
  /** Child nodes holding jobs, for the card's collapsible rows. */
  children: DirectoryChild[];
  places: DirectoryPlace[];
  /** A lane (Everywhere, Yours, Your organization, Unplaced, Test fixtures). */
  lane: boolean;
  /** A test/parity fixture group — admins only, labeled as such. */
  fixture: boolean;
  /** The node's registry status when it is not active (proposed, legacy). */
  status: string | null;
}

export interface DirectoryDomain {
  /** Section id: a Domain slug, or a lane id. */
  domain: string;
  label: string;
  features: DirectoryFeature[];
}

/** The definition columns the directory reads. */
export interface DirectoryDefinition {
  mandate_key: string;
  label?: string | null;
  description?: string | null;
  goal?: string | null;
}

/** The member-list facts the directory adds to a job. */
export interface DirectoryHolder {
  mandateKey: AnyMandateKey;
  holderName: string;
  holderType: string | null;
  status: MandateStatus;
}

function humanizeKeyTail(key: string): string {
  return humanizeIdentifier(key.slice(key.indexOf(".") + 1)) || key;
}

/** The arranged placement a directory is built from. */
export interface DirectoryPlacement {
  tree: Tree;
  arranged: ReadonlyMap<string, readonly PlacedEntry[]>;
}

export function buildDomains(
  defs: readonly DirectoryDefinition[],
  placement: DirectoryPlacement,
  holders: readonly DirectoryHolder[] = [],
): DirectoryDomain[] {
  const { tree, arranged } = placement;
  const defByKey = new Map(defs.map((def) => [storedMandateKey(def.mandate_key), def]));
  const holderByKey = new Map(holders.map((row) => [row.mandateKey, row]));
  // Once the member list has answered, a card counts only the jobs its page
  // will show from this seat: a definition the viewer can read but the member
  // list does not return for them is not one of their jobs.
  const seated = holders.length > 0;
  const keep = (entry: PlacedEntry) =>
    entryKeys(entry).some((key) => defByKey.has(key) && (!seated || holderByKey.has(key)));

  const jobOf = (entry: PlacedEntry, home: string, cardLabel: string, domainName: string): DirectoryJob => {
    const key = entryKey(entry);
    const def = defByKey.get(key);
    const holder = holderByKey.get(key);
    const path = tree.bySlug.has(home) ? pathOf(tree, home) : [];
    return {
      key,
      name: def?.label
        ? shortMandateName(shortMandateName(def.label, cardLabel), domainName)
        : humanizeKeyTail(key),
      description: def?.description ?? null,
      goal: def?.goal ?? null,
      home,
      path: path.map((node) => node.slug),
      pathNames: path.map((node) => node.name).join(" "),
      versions: entry.kind === "rollup" ? entry.versions.length : 0,
      ...(holder
        ? {
            holderName: holder.holderName,
            holderType:
              holder.holderType === "agent" || holder.holderType === "workflow"
                ? holder.holderType
                : null,
            status: holder.status,
          }
        : {}),
    };
  };

  const jobsOf = (group: NodeGroup, cardLabel: string, domainName: string): DirectoryJob[] => [
    ...group.own.map((entry) => jobOf(entry, group.slug, cardLabel, domainName)),
    ...group.children.flatMap((child) => jobsOf(child, cardLabel, domainName)),
  ];
  const childrenRows = (group: NodeGroup): DirectoryChild[] =>
    group.children.map((child) => ({
      slug: child.slug,
      label: child.name,
      count: child.count,
      children: childrenRows(child),
    }));
  const placesOf = (jobs: readonly DirectoryJob[]): DirectoryPlace[] =>
    declaredPlacesForKeys(new Set<string>(jobs.map((job) => job.key))).map((place) => ({
      label: place.label,
      trigger: place.trigger,
    }));
  const byName = (a: DirectoryFeature, b: DirectoryFeature) => a.label.localeCompare(b.label);

  const out: DirectoryDomain[] = [];
  for (const domainNode of childrenOf(tree, null)) {
    const domainGroup = groupOf(tree, arranged, domainNode.slug, keep);
    if (domainGroup.count === 0) continue;
    const features: DirectoryFeature[] = [];
    // The Domain's own jobs are its first card.
    if (domainGroup.own.length > 0) {
      const jobs = domainGroup.own
        .map((entry) => jobOf(entry, domainNode.slug, domainNode.name, ""))
        .sort((a, b) => a.name.localeCompare(b.name));
      features.push({
        feature: domainNode.slug,
        label: domainNode.name,
        domain: domainNode.slug,
        jobs,
        children: [],
        places: placesOf(jobs),
        lane: false,
        fixture: false,
        status: domainNode.status && domainNode.status !== "active" ? domainNode.status : null,
      });
    }
    const cards: DirectoryFeature[] = domainGroup.children.map((group) => {
      const jobs = jobsOf(group, group.name, domainNode.name).sort((a, b) => a.name.localeCompare(b.name));
      return {
        feature: group.slug,
        label: group.name,
        domain: domainNode.slug,
        jobs,
        children: childrenRows(group),
        places: placesOf(jobs),
        lane: false,
        fixture: false,
        status: group.status && group.status !== "active" ? group.status : null,
      };
    });
    features.push(...cards.sort(byName));
    out.push({ domain: domainNode.slug, label: domainNode.name, features });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));

  for (const lane of LANE_ORDER) {
    const entries = (arranged.get(lane) ?? []).filter(keep);
    if (entries.length === 0) continue;
    const jobs = entries
      .map((entry) => jobOf(entry, lane, LANES[lane], ""))
      .sort((a, b) => a.name.localeCompare(b.name));
    out.push({
      domain: lane,
      label: LANES[lane],
      features: [
        {
          feature: lane,
          label: LANES[lane],
          domain: null,
          jobs,
          children: [],
          places: placesOf(jobs),
          lane: true,
          fixture: lane === "fixtures",
          status: null,
        },
      ],
    });
  }
  return out;
}

/** How a card's jobs are filled, once the member list has answered. */
export interface DirectorySummary {
  agents: number;
  workflows: number;
  /** Jobs nothing runs yet (draft) or that are turned off. */
  notRunning: number;
  /** False until the member list answered for at least one job. */
  known: boolean;
}

export function summarize(feature: DirectoryFeature): DirectorySummary {
  let agents = 0;
  let workflows = 0;
  let notRunning = 0;
  let known = false;
  for (const job of feature.jobs) {
    if (!job.status) continue;
    known = true;
    if (job.status === "draft" || job.status === "disabled") notRunning++;
    else if (job.holderType === "workflow") workflows++;
    else if (job.holderType === "agent") agents++;
  }
  return { agents, workflows, notRunning, known };
}

/** Why a card matched a search that its name alone does not explain. */
export type MatchReason =
  | { kind: "name"; partial?: boolean }
  | { kind: "job"; text: string; partial?: boolean }
  | { kind: "place"; text: string }
  | { kind: "holder"; text: string };

function tokensOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function hasAll(haystack: string, tokens: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}

function jobText(job: DirectoryJob): string {
  return [job.name, job.description, job.goal, job.pathNames].filter(Boolean).join(" ");
}

function childNames(children: readonly DirectoryChild[]): string {
  return children.map((child) => `${child.label} ${childNames(child.children)}`).join(" ");
}

/**
 * Does the feature match every word of the query somewhere — its name, a node
 * below it, a job (name, what it does, its goal, its path), a place, or the
 * agent or workflow running a job? Returns why, or null.
 */
export function matchFeature(
  feature: DirectoryFeature,
  query: string,
  domainLabel = "",
): MatchReason | null {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return { kind: "name" };
  const name = `${feature.label} ${domainLabel}`;
  const everything = [
    name,
    childNames(feature.children),
    ...feature.jobs.map((job) => `${jobText(job)} ${job.holderName ?? ""}`),
    ...feature.places.map((place) => `${place.label} ${place.trigger}`),
  ].join(" ");
  if (!hasAll(everything, tokens)) return null;
  if (hasAll(name, tokens)) return { kind: "name" };
  const job = feature.jobs.find((row) => hasAll(jobText(row), tokens));
  if (job) return { kind: "job", text: job.name };
  const place = feature.places.find((row) =>
    hasAll(`${row.label} ${row.trigger}`, tokens),
  );
  if (place) return { kind: "place", text: place.label };
  const held = feature.jobs.find(
    (row) => row.holderName && hasAll(row.holderName, tokens),
  );
  if (held?.holderName) return { kind: "holder", text: held.holderName };
  // Words spread across several things: the job holding the most of them explains it.
  let best: DirectoryJob | null = null;
  let bestHits = 0;
  for (const row of feature.jobs) {
    const text = jobText(row).toLowerCase();
    const hits = tokens.filter((t) => text.includes(t)).length;
    if (hits > bestHits) {
      best = row;
      bestHits = hits;
    }
  }
  return best
    ? { kind: "job", text: best.name, partial: true }
    : { kind: "name", partial: true };
}

/** Sort key: the name itself, then one thing holding every word, then words spread out. */
export function matchStrength(reason: MatchReason): number {
  if ("partial" in reason && reason.partial) return 0;
  return reason.kind === "name" ? 2 : 1;
}

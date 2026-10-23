// features/shell/breadcrumbs/record-siblings.ts
//
// A RECORD CRUMB OPENS EVERY OTHER RECORD (Arman, 2026-10-22: "Vasaro (Brand Name): Clicking this
// should show all other brands available"). One loader per entity type token, reusing the entity's
// OWN list data source (never a second query), capped at SIBLINGS_MAX; the door filters as you type.
// A record page declares only its record (`useDeclareCurrentRecord({ token, id })`); the derived
// trail asks this table for the record level's siblings when its door first opens.
//
// LOAD LAW: this file is reachable from every header (useDerivedTrail), so each loader imports its
// list service INSIDE the loader — nothing loads until a person opens the door.
//
// Switching keeps the view: on /agents/<a>/build the sibling row for agent b is /agents/<b>/build.
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";

/** Rows a door lists before the search narrows them. */
export const SIBLINGS_MAX = 50;

export interface SiblingRecord {
  id: string;
  label: string;
}

type SiblingsLoader = () => Promise<readonly SiblingRecord[]>;

/** Entity type token → its list's own read, newest first, capped. */
export const RECORD_SIBLINGS: Readonly<Record<string, SiblingsLoader>> = {
  agent: async () => {
    const [{ fetchAgentBrowsePage }, { DEFAULT_ENTITY_LIST_QUERY }] = await Promise.all([
      import("@/features/agents/browse/service"),
      import("@/lib/entity-list/types"),
    ]);
    const page = await fetchAgentBrowsePage(DEFAULT_ENTITY_LIST_QUERY, {
      sort: "updated",
      direction: "desc",
      favoritesFirst: true,
      pageSize: SIBLINGS_MAX,
    });
    return page.rows.map((row) => ({ id: row.id, label: row.name ?? "Untitled agent" }));
  },
  app: async () => {
    // The Applets list's own read (active ones, mine + my organizations + shared), newest first.
    const { listApplets } = await import("@/features/applets/browse/service");
    const rows = await listApplets("active");
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.name || "Untitled applet" }));
  },
  note: async () => {
    // The notes sidebar's own list read (no bodies), newest first.
    const { fetchNoteListItems } = await import("@/features/notes/service/notesService");
    const rows = await fetchNoteListItems();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.label || "Untitled note" }));
  },
  "crm-outreach-list": async () => {
    // The Outreach lists page's own read (mine + my organizations), newest first.
    const [{ fetchOutreachLists }, { supabase }] = await Promise.all([
      import("@/features/crm/outreach-lists/service"),
      import("@/utils/supabase/client"),
    ]);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return [];
    // The read uses only the caller (organizations are asked of the server, never listed here).
    const rows = await fetchOutreachLists({ userId, orgIds: [], orgNames: {} });
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.name || "Untitled list" }));
  },
  "crm-sending-identity": async () => {
    // The Sending mailboxes page's own read (every purpose the page lists).
    const { listSendingIdentities } = await import("@/features/crm/sending-identities/service");
    const rows = await listSendingIdentities();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.from_address || "Mailbox" }));
  },
  pc_show: async () => {
    // The podcast studio's own show list (mine), newest first.
    const { podcastService } = await import("@/features/podcasts/service");
    const rows = await podcastService.fetchAllShows();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.title || "Untitled podcast" }));
  },
  research_topic: async () => {
    // The Research topics list's own read (every lane), newest first.
    const [{ researchTopicListService }, { DEFAULT_ENTITY_LIST_QUERY }] = await Promise.all([
      import("@/features/research/browse/service"),
      import("@/lib/entity-list/types"),
    ]);
    const page = await researchTopicListService.fetchPage(
      { ...DEFAULT_ENTITY_LIST_QUERY, scope: { kind: "all" } },
      { sort: "updated_at", direction: "desc", favoritesFirst: false, pageSize: SIBLINGS_MAX },
    );
    return page.rows.map((row) => ({ id: row.id, label: row.name || "Untitled topic" }));
  },
  memory_trial: async () => {
    // The Memory Lab's own trial list, newest first.
    const { listTrials } = await import("@/features/memory-lab/data");
    const rows = await listTrials();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.title || "Trial" }));
  },
  tool_battle: async () => {
    // Tool Battle's own battle list, newest first. A blind battle keeps its title hidden.
    const { listBattles } = await import("@/features/tool-battle/service");
    const rows = await listBattles();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.blind ? "Blind battle" : row.title || "Battle" }));
  },
  esign_envelope: async () => {
    // The E-Signatures list's own read (every lane), newest first.
    const [{ fetchEnvelopeListPage }, { DEFAULT_ENTITY_LIST_QUERY }] = await Promise.all([
      import("@/features/esign/envelopes/service"),
      import("@/lib/entity-list/types"),
    ]);
    const page = await fetchEnvelopeListPage(
      { ...DEFAULT_ENTITY_LIST_QUERY, scope: { kind: "all" } },
      { sort: "updated_at", direction: "desc", favoritesFirst: false, pageSize: SIBLINGS_MAX },
    );
    return page.rows.map((row) => ({ id: row.id, label: row.title || "Envelope" }));
  },
  billing_spend_alarm: async () => {
    // The Alarms board's own read (the dock's door, resolved included), newest first.
    const { fetchSpendAlarms, alarmTitle } = await import("@/features/admin/spend-alarms/spendAlarms");
    const rows = await fetchSpendAlarms();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: alarmTitle(row) }));
  },
  "visual-map-sample": async () => {
    // The Visual Map Lab list's own read (subjects, workflows, saved samples).
    const { loadLabRows } = await import("@/features/visual-map-lab/service");
    const { rows } = await loadLabRows();
    return rows.slice(0, SIBLINGS_MAX).map((row) => ({ id: row.id, label: row.title || "Sample" }));
  },
};

/** The address for a sibling: the current address with the record's segment swapped. */
export function siblingHref(pathname: string, currentId: string, siblingId: string): string {
  const segs = pathname.split("/");
  // An id with reserved characters (`workflow:<uuid>`) sits in the address encoded.
  const at = segs.findIndex((seg) => seg === currentId || safeDecode(seg) === currentId);
  if (at === -1) return pathname;
  segs[at] = encodeURIComponent(siblingId);
  return segs.join("/");
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** The record level's sibling loader for a declared record, or undefined when its type has none. */
export function recordSiblingsLoader(
  token: string | null | undefined,
  currentId: string | null | undefined,
  pathname: string,
): (() => Promise<CrumbOption[]>) | undefined {
  const load = token ? RECORD_SIBLINGS[token] : undefined;
  if (!load || !currentId) return undefined;
  return async () => {
    const rows = await load();
    return rows.map((r) => ({ label: r.label, href: siblingHref(pathname, currentId, r.id), active: r.id === currentId }));
  };
}

/**
 * Turns the `agent` an agent named in `board_add_items` (an id OR a name) into one real agent from
 * the platform's agent catalog (`@ai-matrx/agents/catalog`, the same registry the one agent picker
 * reads). Pure over an injected lookup, so the class is testable without a catalog; the app's real
 * lookup is `catalogAgentLookup()`.
 *
 * Refusals say why and offer the candidates (id, name, organization) — never a silent pick when two
 * agents share a name, and never a guess when none match.
 */

export interface AgentRow {
  id: string;
  name: string | null;
  isActive: boolean;
  isArchived: boolean;
  organizationName?: string | null;
}

export interface AgentLookup {
  /** Load the catalog if it is not fresh. */
  ensureLoaded: () => Promise<void>;
  rows: () => readonly AgentRow[];
  byId: (id: string) => AgentRow | undefined;
  /** Server search (tier 2): matched ids in rank order; rows are merged into `rows()`/`byId()`. */
  searchServer: (query: string) => Promise<string[]>;
}

export type AgentResolution =
  | { ok: true; id: string; name: string | null }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANDIDATES_SHOWN = 5;

const label = (r: AgentRow) =>
  `${r.name?.trim() || "(unnamed)"} (${r.id}${r.organizationName ? `, ${r.organizationName}` : ""})`;
const usable = (r: AgentRow) => r.isActive && !r.isArchived;
const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

export async function resolveAgentRef(ref: string, lookup: AgentLookup): Promise<AgentResolution> {
  const wanted = ref.trim();
  if (!wanted) return { ok: false, error: "Pass the agent's name or id in `agent`." };
  try {
    await lookup.ensureLoaded();
  } catch (e) {
    return { ok: false, error: `The agent catalog could not be read: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (UUID.test(wanted)) {
    let row = lookup.byId(wanted);
    if (!row) {
      await lookup.searchServer(wanted).catch(() => []);
      row = lookup.byId(wanted);
    }
    if (!row) return { ok: false, error: `No agent with id "${wanted}" is visible to this person.` };
    if (!usable(row)) return { ok: false, error: `${label(row)} is archived or inactive.` };
    return { ok: true, id: row.id, name: row.name };
  }

  const exactOf = (rows: readonly AgentRow[]) => rows.filter((r) => usable(r) && norm(r.name) === norm(wanted));
  let exact = exactOf(lookup.rows());
  if (exact.length === 0) {
    const ids = await lookup.searchServer(wanted).catch(() => [] as string[]);
    exact = exactOf(lookup.rows());
    if (exact.length === 0) {
      const near = ids.flatMap((id) => {
        const r = lookup.byId(id);
        return r && usable(r) ? [r] : [];
      });
      if (near.length === 1) return { ok: true, id: near[0].id, name: near[0].name };
      if (near.length === 0) return { ok: false, error: `No agent named "${wanted}" was found.` };
      return {
        ok: false,
        error: `No agent is named exactly "${wanted}". Closest: ${near.slice(0, CANDIDATES_SHOWN).map(label).join("; ")}. Pass one id in \`agent\`.`,
      };
    }
  }
  if (exact.length === 1) return { ok: true, id: exact[0].id, name: exact[0].name };
  return {
    ok: false,
    error: `${exact.length} agents are named "${wanted}": ${exact.slice(0, CANDIDATES_SHOWN).map(label).join("; ")}. Pass one id in \`agent\`.`,
  };
}

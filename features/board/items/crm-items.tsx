"use client";

/**
 * CRM on a board: a Person or company (`crm.party`).
 *
 * The tile body IS `PartyRecordPage` (`features/crm/components/record/PartyRecordPage.tsx`), the very
 * component `/crm/[partyId]` renders: identity, contact points, addresses, employment both ways, the
 * interaction timeline, notes, deals, attached tasks and files, and the `matrx-user/crm-record` agent
 * surface for this one record (every identity / classification / contact / employment / deal / task
 * write target, with approval), mounted inside it. `embedded` only moves the page's header row (name,
 * Send email, Copy link, Log an activity, Move to trash) from the shell's header to the top of the
 * tile, and drops Back.
 *
 * Start new is the canonical create form (`PartyCreateForm`, with its organization chooser): the record
 * is made when the person presses Create record, and the tile then becomes it. Bring in searches the
 * person's people and companies in EVERY organization they belong to (the deal dialog's own party
 * search), never the active one.
 *
 * Pure helpers: ./crm-items.logic.ts.
 */

import { useCallback, useEffect, useState } from "react";
import { Contact } from "lucide-react";
import { PartyRecordPage } from "@/features/crm/components/record/PartyRecordPage";
import { PartyCreateForm } from "@/features/crm/components/PartyCreateForm";
import { ALL_MY_ORGANIZATIONS, searchPartiesByName } from "@/features/crm/service";
import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton } from "@ai-matrx/design-system";
import { CRM_RECORD_SURFACE_NAME } from "@/features/surfaces/manifests/crm-record.manifest";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { titleToAdopt } from "./feature-items.logic";
import { PartyStructure } from "./structures";
import { NEW_PARTY_TITLE, PARTY_ITEM_KEY, partyFound, partyHref, partyIdOf, partySource } from "./crm-items.logic";

type Row = Awaited<ReturnType<typeof searchPartiesByName>>[number];
type Read = { phase: "reading" } | { phase: "read"; rows: Row[] } | { phase: "failed"; why: string };

function PartyPicker({ onPick, onCancel }: PickerProps) {
  const [search, setSearch] = useState("");
  const [read, setRead] = useState<Read>({ phase: "reading" });
  const [again, setAgain] = useState(0);
  useEffect(() => {
    let alive = true;
    setRead({ phase: "reading" });
    // The person's records in every organization they belong to (never the active one); typing narrows on the server.
    const timer = setTimeout(() => {
      searchPartiesByName({ orgId: ALL_MY_ORGANIZATIONS, search })
        .then((rows) => alive && setRead({ phase: "read", rows }))
        .catch((e: unknown) => alive && setRead({ phase: "failed", why: e instanceof Error ? e.message : String(e) }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, again]);
  return (
    <div className="flex flex-col gap-3">
      <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people and companies…" aria-label="Search people and companies" />
      <div className="max-h-[min(420px,60dvh)] overflow-y-auto rounded-lg border border-border">
        {read.phase === "reading" ? (
          <div className="space-y-2 p-2" aria-busy="true" aria-label="Loading your people and companies">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : read.phase === "failed" ? (
          <div className="p-2">
            <ErrorNotice size="compact" title="Your people and companies could not be listed" message={read.why} operation="List CRM records for the board" onRetry={() => setAgain((n) => n + 1)} />
          </div>
        ) : read.rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {search.trim() ? "Nothing matches." : "No people or companies yet. Make one with New person or company."}
          </div>
        ) : (
          <ul>
            {read.rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => onPick([{ title: r.display_name, source: partySource(r.id) }])}
                >
                  <span className="min-w-0 flex-1 truncate">{r.display_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.party_kind === "person" ? "Person" : "Company"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PartyBody({ source, title, onSource }: ItemBodyProps) {
  const id = partyIdOf(source);
  // The tile is named after its record (renamed on its page, here, or by an agent).
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-card">
        <PartyCreateForm onCreated={(partyId) => onSource(partySource(partyId))} />
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden bg-textured">
      <PartyRecordPage key={id} partyId={id} embedded onName={follow} />
    </div>
  );
}

export const CRM_ITEMS: readonly BoardItemType[] = [
  {
    key: PARTY_ITEM_KEY,
    surface: { name: CRM_RECORD_SURFACE_NAME },
    // The thread the record's own Notes card shows.
    comments: entityComments("party"),
    label: "Person or company",
    sleeps: true, // LOCAL-SLEEP-TEST
    kindLabel: "person or company",
    icon: Contact,
    group: "work",
    section: "work",
    accent: "rose",
    structure: PartyStructure,
    status: { none: "A person or company has no running state; its lifecycle stage is a field on the record." },
    // Identity rail beside the activity column, then the tall timeline: wide and long.
    defaultSize: { w: 1100, h: 1000 },
    matches: (s) => s.kind === "entity" && s.entity === PARTY_ITEM_KEY,
    Body: PartyBody,
    startNew: { label: "New person or company", create: () => ({ title: NEW_PARTY_TITLE, source: partySource(null) }) },
    bringIn: { label: "Person or company", Picker: PartyPicker },
    record: {
      place: (id, title) => ({ title: title?.trim() || "Person or company", source: partySource(id) }),
      // Not in the search projection: the party search the deal dialog uses, over every organization of the person's.
      find: async (query, limit) => {
        const rows = await searchPartiesByName({ orgId: ALL_MY_ORGANIZATIONS, search: query });
        return rows.slice(0, limit).map(partyFound);
      },
    },
    href: (s) => {
      const id = partyIdOf(s);
      return id ? partyHref(id) : null;
    },
  },
];

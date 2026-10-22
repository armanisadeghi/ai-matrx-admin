"use client";

/**
 * RECORD HOST CHROME — ONE answer to "who names this record?".
 *
 * A record component (a task, a person, an agent, a workbook…) is drawn in several hosts: its own
 * route (the shell header names it), a board tile (the tile header names it and offers Open / Full
 * screen / the tile menu), a floating window (its title bar names it), a peek. Before this, every
 * record grew its own `embedded` switch and still drew its name, an "Open" button and a page header
 * inside the tile — the record named two or three times.
 *
 * The host says WHICH record it holds and what its own chrome already shows; that record's header
 * drops exactly that and keeps the record's own controls (modes, its actions) in ONE compact row:
 *
 *   <RecordHostChrome host="board-tile" record={{ token: "task", id }} names opens titleTarget={el} onTitleClaim={fn}>
 *
 *   useHostChromeFor(record)   → the host's value when it holds THIS record, else null
 *   useHostNamesRecord(record) → the host's bar names this record: leave its name out
 *   useHostOpensRecord(record) → the host offers Open (its page): leave its own "Open" out
 *   <HostTitle record>{field}</HostTitle>
 *                              → the record's rename field, moved INTO the host's bar (the tile header)
 *                                when the host names it, drawn in place otherwise
 *   <HostedRecordBar record name|titleField open actions>{controls}</HostedRecordBar>
 *                              → the record's in-body header row: name and Open drop out when the host
 *                                shows them; the row disappears when nothing is left
 *
 * The match is by record (token + id), never by depth: a task shown INSIDE a hosted chat or War Room
 * is a different record, so it keeps its own name. `RecordPageHeader` reads it with its own
 * `record.token` / `record.id`: inside a host that holds that record it draws its modes and actions as
 * this bar instead of the shell header's line.
 *
 * Guard: `features/board/__tests__/host-chrome-contract.test.ts`. Doc: features/shell/FEATURE.md
 * § Record host chrome.
 */

import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** `frame`: a page that frames one record under its own title row (the admin meeting view). */
export type RecordHostKind = "board-tile" | "window" | "peek" | "frame";

/** The record a host holds: the platform entity token (`task`, `party`, `agent`…) and its id. */
export interface HostedRecordRef {
  token: string;
  id: string;
}

export interface RecordHostChromeValue {
  host: RecordHostKind;
  /** The record this host holds; null when the host holds no single record (nothing is dropped). */
  record: HostedRecordRef | null;
  /** The host's own bar shows the record's name. */
  names: boolean;
  /** The host offers "Open" — the record's own page. */
  opens: boolean;
  /** Where the record may put its rename field (the tile header's title slot). Null: the host shows a plain name. */
  titleTarget: HTMLElement | null;
  /** The record's field took the host's title slot (true) or gave it back (false). */
  onTitleClaim?: (claimed: boolean) => void;
}

const RecordHostChromeContext = createContext<RecordHostChromeValue | null>(null);

export function RecordHostChrome({
  host,
  record,
  names,
  opens,
  titleTarget = null,
  onTitleClaim,
  children,
}: Omit<RecordHostChromeValue, "titleTarget"> & { titleTarget?: HTMLElement | null; children: ReactNode }) {
  return (
    <RecordHostChromeContext.Provider value={{ host, record, names, opens, titleTarget, onTitleClaim }}>
      {children}
    </RecordHostChromeContext.Provider>
  );
}

const sameRecord = (a: HostedRecordRef | null | undefined, b: HostedRecordRef | null | undefined): boolean =>
  !!a && !!b && a.token === b.token && a.id === b.id;

/** The host around this record when it holds THIS record; null on the record's own page or inside another record. */
export function useHostChromeFor(record: HostedRecordRef | null | undefined): RecordHostChromeValue | null {
  const host = useContext(RecordHostChromeContext);
  return host && sameRecord(host.record, record) ? host : null;
}

/** The host's bar already names this record — leave the record's name out. */
export function useHostNamesRecord(record: HostedRecordRef | null | undefined): boolean {
  return useHostChromeFor(record)?.names ?? false;
}

/** The host already offers "Open" (this record's page) — leave the record's own Open out. */
export function useHostOpensRecord(record: HostedRecordRef | null | undefined): boolean {
  return useHostChromeFor(record)?.opens ?? false;
}

/**
 * The record's rename field (or name). On its own page or in a host holding something else: drawn in
 * place. In a host that names this record: moved into the host's title slot, so the person renames it
 * where the name is — or left out when the host has no slot (its plain name stands).
 */
export function HostTitle({ record, children }: { record: HostedRecordRef | null | undefined; children: ReactNode }) {
  const host = useHostChromeFor(record);
  const target = host?.names ? host.titleTarget : null;
  const claim = host?.onTitleClaim;
  useLayoutEffect(() => {
    if (!target || !claim) return;
    claim(true);
    return () => claim(false);
  }, [target, claim]);
  if (!host?.names) return <>{children}</>;
  return target ? createPortal(children, target) : null;
}

/**
 * The record's header row inside the body (a record whose header is not the shell's).
 *   · `name` — the record's plain name: left out when the host names the record.
 *   · `titleField` — the record's RENAME field: moved into the host's title slot when the host names
 *     the record (`HostTitle`), drawn on the row otherwise. Pass one of `name` / `titleField`.
 *   · `open` — the door to the record's page: left out when the host offers Open.
 *   · `actions` (the record's own verbs) and `children` (its modes, its status) stay.
 * Nothing left → no row.
 */
export function HostedRecordBar({
  record,
  name,
  titleField,
  open,
  actions,
  children,
  className,
}: {
  /** The record this row heads (matched against the host's record). */
  record: HostedRecordRef | null | undefined;
  name?: ReactNode;
  titleField?: ReactNode;
  open?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const host = useHostChromeFor(record);
  const names = host?.names ?? false;
  const showName = name != null && !names;
  const fieldInRow = titleField != null && !names;
  const showOpen = open != null && !(host?.opens ?? false);
  const hasLeft = showName || fieldInRow || children != null;
  const hasRight = actions != null || showOpen;
  return (
    <>
      {/* The rename field still mounts — in the host's title slot — when the host names the record. */}
      {titleField != null && names ? <HostTitle record={record}>{titleField}</HostTitle> : null}
      {hasLeft || hasRight ? (
        <div
          data-hosted-record-bar={host?.host ?? "page"}
          className={cn(
            "flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card/60 px-2 py-1",
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {showName ? name : null}
            {fieldInRow ? titleField : null}
            {children}
          </div>
          {hasRight ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {actions}
              {showOpen ? open : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

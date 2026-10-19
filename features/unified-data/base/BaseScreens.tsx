"use client";

// features/unified-data/base/BaseScreens.tsx — the Bases list, the Base page and its verbs (lane AT-BASE).
//
// A Base is a Home's group of tables. Its page lists the tables, the pages (interfaces) and the automations that belong to them,
// with a name, icon, color and description a person can change. Duplicate base, snapshots and the two importers start here. The
// whole-base verbs are @ai-matrx/records `duplicateBase` / `snapshotBase` / `restoreSnapshot` over the records client.

import { ActivityFeedButton } from "@/features/unified-data/table-page/TableAccessBar";
import { ensureTable } from "@ai-matrx/records/core";
import { duplicateBase, restoredBaseName, restoreSnapshot, snapshotBase, type BaseCopyProgress, type BaseTable } from "@ai-matrx/records";
import { useRecordsClient } from "@ai-matrx/records/react";
import { Button, Field, Select } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { recordsDataSource } from "@ai-matrx/records-ui/helpers";
import { isInterface, isPage } from "@ai-matrx/records-ui/helpers";
import { MakeMount } from "@/features/make/MakeMount";
import { useObjectOrganization } from "@/features/unified-data/objectOrganization";
import { createClient } from "@/utils/supabase/client";
import { TEMPLATE_GALLERY_HREF } from "@/features/make/gallery/galleryHref";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationsList } from "@/features/scopes/redux/selectors/tree";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";

import { AirtableImportDialog } from "./AirtableImportDialog";
import { GithubImportDialog } from "./GithubImportDialog";
import { SheetsImportDialog } from "./SheetsImportDialog";
import {
  listBases, listSnapshots, readBase, saveBase, saveSnapshot, setSnapshotSchedule, trashSnapshot,
  type BaseIdentity, type BaseSnapshotRow, type HomeTable,
} from "./baseStore";
import { useBasePort } from "./useBasePort";

type Client = ReturnType<typeof useRecordsClient>;

/** Every table the store lists for this person (the store decides which; with an organization, that one), with the Home each lives in. */
async function homeTables(client: Client, organizationId?: string, everyOrganization?: readonly string[]): Promise<HomeTable[]> {
  // Reads span every organization the person belongs to (the active one is never a filter): ask each through the one client.
  const orgs = organizationId ? [organizationId] : everyOrganization?.length ? [...everyOrganization] : [undefined];
  const parts = await Promise.all(orgs.map((o) => client.tableList(o ? { organization_id: o } : undefined)));
  const failed = parts.find((r) => !r.ok);
  if (failed && !failed.ok && parts.every((r) => !r.ok)) throw new Error(failed.error.message);
  // A snapshot's tables are put away and a copy in progress is the app's: neither is ever part of a base.
  const rows = parts.flatMap((r) => (r.ok ? r.data : [])).filter((t) => t.kept_for !== "snapshot" && t.kept_for !== "copying" && !t.archived_at);
  return rows.map((t) => ({ id: t.id, name: t.name, organization_id: t.organization_id, home_id: t.home_id ?? null, icon: null, color: null }));
}

/** A page opens on its own screen, an interface on its own, any other dashboard on its table (the data home's rule). */
function pageHref(d: { dashboard_id: string; presentation?: Record<string, unknown> | null }, tableId: string): string {
  const presentation = d.presentation ?? null;
  if (isInterface({ presentation })) return `/data/interfaces/${d.dashboard_id}`;
  if (isPage({ presentation })) return `/data/pages/${d.dashboard_id}`;
  return `/data/${tableId}?dashboard=${d.dashboard_id}`;
}

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#475569"];

function Swatch({ color, icon, name }: { color: string | null; icon: string | null; name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ background: color || "#475569" }} aria-hidden>
      {icon || name.slice(0, 1).toUpperCase() || "B"}
    </span>
  );
}

function Words({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

// ── the list ────────────────────────────────────────────────────────────────────────────────

export function BasesHome() {
  // org-filter: read-scope the records client is mounted for the organization new things are saved to; the list itself is the store's, not a filter on it
  const active = useOrganizationRequired();
  if (active.organizationState !== "ready" || !active.organizationId) return <div className="p-4"><Words>Choose the organization you are working in (top bar) to see its bases.</Words></div>;
  return <MakeMount organizationId={active.organizationId}><BasesBody /></MakeMount>;
}

function BasesBody() {
  const client = useRecordsClient();
  const everyOrg = useAppSelector(selectOrganizationsList).map((o) => o.id);
  const orgKey = everyOrg.join(",");
  const router = useRouter();
  const [state, setState] = useState<{ bases: Array<{ homeId: string; name: string; icon: string | null; color: string | null; description: string | null; tables: number }> } | { error: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const readBases = useCallback(async (): Promise<NonNullable<typeof state>> => {
    try {
      const [tables, identities] = await Promise.all([homeTables(client, undefined, orgKey ? orgKey.split(",") : undefined), listBases()]);
      const byHome = new Map<string, HomeTable[]>();
      for (const t of tables) if (t.home_id) byHome.set(t.home_id, [...(byHome.get(t.home_id) ?? []), t]);
      const named = new Map(identities.map((b) => [b.home_id, b]));
      const bases = [...byHome.entries()].map(([homeId, ts]) => {
        const id = named.get(homeId);
        return { homeId, name: id?.name ?? ts[0]?.name ?? "Untitled base", icon: id?.icon ?? null, color: id?.color ?? null, description: id?.description ?? null, tables: ts.length };
      });
      // A Base someone named comes first; the rest are Homes that hold tables and have not been named yet.
      bases.sort((a, b) => Number(named.has(b.homeId)) - Number(named.has(a.homeId)) || a.name.localeCompare(b.name));
      return { bases };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "The bases could not be read." };
    }
  }, [client, orgKey]);
  useEffect(() => {
    let live = true;
    void readBases().then((s) => { if (live) setState(s); });
    return () => { live = false; };
  }, [readBases]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4" data-bases-home="">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bases</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>New base</Button>
      </div>
      {state === null ? <Words>Reading your bases…</Words> : "error" in state ? <ErrorNotice message={state.error} size="inline" /> : state.bases.length === 0 ? <Words>No tables yet. Make a base to begin.</Words> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {state.bases.map((b) => (
            <li key={b.homeId}>
              <Link href={`/data/bases/${b.homeId}`} className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted" data-base-card={b.homeId}>
                <Swatch color={b.color} icon={b.icon} name={b.name} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{b.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{b.tables} {b.tables === 1 ? "table" : "tables"}{b.description ? ` · ${b.description}` : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating ? <NewBaseHost onClose={() => setCreating(false)} onMade={(homeId) => router.push(`/data/bases/${homeId}`)} /> : null}
    </div>
  );
}

/** New things are saved in the organization the person set as where they save to (asked in place when none is). */
function NewBaseHost({ onClose, onMade }: { onClose: () => void; onMade: (homeId: string) => void }) {
  // org-filter: write-target a new base is made in the organization new things are saved to
  const active = useOrganizationRequired();
  if (active.organizationState !== "ready" || !active.organizationId) {
    return (
      <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
        <DialogContent className="max-w-[min(480px,96vw)] gap-3 p-4"><DialogTitle>New base</DialogTitle><Words>Choose the organization new things are saved in (top bar), then try again.</Words></DialogContent>
      </Dialog>
    );
  }
  return <MakeMount organizationId={active.organizationId}><NewBaseDialog open onOpenChange={(o) => (!o ? onClose() : undefined)} onMade={onMade} /></MakeMount>;
}

// ── create ──────────────────────────────────────────────────────────────────────────────────

export function NewBaseDialog({ open, onOpenChange, onMade }: { open: boolean; onOpenChange: (o: boolean) => void; onMade: (homeId: string) => void }) {
  const client = useRecordsClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const makeEmpty = async () => {
    setBusy(true);
    setProblem(null);
    // A table born without a Home makes its own: that Home is the new base.
    const made = await ensureTable(client, { name: `${name.trim()} — Table 1`.slice(0, 80), fields: [{ key: "name", label: "Name", type: "text" }] });
    if (!made.ok) {
      setBusy(false);
      setProblem(made.error.message);
      return;
    }
    try {
      const mine = (await homeTables(client)).find((t) => t.id === made.data);
      const home = mine?.home_id ?? made.homeId;
      await saveBase(mine?.organization_id ?? "", home, { name, template: "blank" });
      onMade(home);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "The base could not be named.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!busy ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-w-[min(520px,96vw)] gap-3 p-4" data-new-base="">
        <DialogTitle>New base</DialogTitle>
        <Field autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of the base" aria-label="Name of the base" />
        {problem ? <ErrorNotice message={problem} size="inline" /> : null}
        <div className="flex flex-col gap-2">
          <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void makeEmpty()} data-new-base-empty="">Start empty</Button>
          <div className="flex gap-2">
            <Link href={TEMPLATE_GALLERY_HREF} className="flex-1"><Button variant="quiet" className="w-full" type="button">From a template</Button></Link>
            <Link href="/make" className="flex-1"><Button variant="quiet" className="w-full" type="button">Describe it</Button></Link>
          </div>
          <Words>Templates and described apps make their tables in a new base; open it here afterwards and name it.</Words>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── the page ────────────────────────────────────────────────────────────────────────────────

interface Extras {
  pages: Array<{ id: string; name: string; table: string; href: string }>;
  automations: Array<{ id: string; name: string; enabled: boolean; table: string; href: string }>;
}

/** The page reads the base's tables first (row security, no store client), then mounts the record store for THE BASE'S OWN organization. */
export function BasePage({ homeId }: { homeId: string }) {
  const where = useObjectOrganization(recordsDataSource(createClient()), homeId);
  if (where.state === "resolving") return <div className="p-4"><Words>Reading the base…</Words></div>;
  if (where.state !== "found") return <div className="p-4"><Words>This base was not found, or you have not been given it.</Words></div>;
  return <MakeMount organizationId={where.organizationId}><BasePageBody homeId={homeId} organizationId={where.organizationId} /></MakeMount>;
}

function BasePageBody({ homeId, organizationId }: { homeId: string; organizationId: string }) {
  const client = useRecordsClient();
  const [tables, setTables] = useState<HomeTable[] | null>(null);
  const [identity, setIdentity] = useState<BaseIdentity | null>(null);
  const [extras, setExtras] = useState<Extras>({ pages: [], automations: [] });
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "duplicate" | "move" | "snapshots" | "airtable" | "sheets" | "github">(null);

  const [reloads, setReloads] = useState(0);
  const load = useCallback(() => setReloads((n) => n + 1), []);
  const readAll = useCallback(async (apply: { tables: (t: HomeTable[]) => void; identity: (i: BaseIdentity | null) => void; extras: (e: Extras) => void; error: (m: string) => void }) => {
    try {
      const ts = (await homeTables(client, organizationId)).filter((t) => t.home_id === homeId);
      apply.tables(ts);
      const org = ts[0]?.organization_id;
      apply.identity(org ? await readBase(org, homeId) : null);
      const pages: Extras["pages"] = [];
      const automations: Extras["automations"] = [];
      for (const t of ts) {
        const [d, a] = await Promise.all([client.dashboards({ table_id: t.id }), client.automations({ table_id: t.id })]);
        if (d.ok) for (const x of d.data) pages.push({ id: x.dashboard_id, name: x.name, table: t.name, href: pageHref(x, t.id) });
        if (a.ok) for (const x of a.data.automations) automations.push({ id: x.id, name: x.name, enabled: x.enabled, table: t.name, href: `/data/${t.id}` });
      }
      apply.extras({ pages, automations });
    } catch (e) {
      apply.error(e instanceof Error ? e.message : "The base could not be read.");
    }
  }, [client, homeId, organizationId]);
  useEffect(() => {
    let live = true;
    void readAll({
      tables: (t) => { if (live) setTables(t); },
      identity: (i) => { if (live) setIdentity(i); },
      extras: (e) => { if (live) setExtras(e); },
      error: (m) => { if (live) setError(m); },
    });
    return () => { live = false; };
  }, [readAll, reloads]);

  if (error) return <div className="p-4"><ErrorNotice message={error} size="inline" /></div>;
  if (tables === null) return <div className="p-4"><Words>Reading the base…</Words></div>;
  if (tables.length === 0) return <div className="p-4"><Words>This base has no tables you can open.</Words></div>;
  const name = identity?.name ?? tables[0]?.name ?? "Untitled base";
  const org = tables[0]!.organization_id;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4" data-base-page={homeId}>
      <header className="flex items-start gap-3">
        <Swatch color={identity?.color ?? null} icon={identity?.icon ?? null} name={name} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold" data-base-name="">{name}</h1>
          {identity?.description ? <Words>{identity.description}</Words> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ActivityFeedButton subjectId={homeId} organizationId={org} />
          <Button variant="quiet" onClick={() => setDialog("edit")}>{identity ? "Edit" : "Name this base"}</Button>
          <Button variant="quiet" onClick={() => setDialog("duplicate")} data-base-duplicate="">Duplicate</Button>
          <Button variant="quiet" onClick={() => setDialog("move")} data-base-move="">Move to another workspace</Button>
          <Button variant="quiet" onClick={() => setDialog("snapshots")} data-base-snapshots="">Snapshots</Button>
          <Button variant="quiet" onClick={() => setDialog("airtable")} data-base-airtable="">From Airtable</Button>
          <Button variant="quiet" onClick={() => setDialog("sheets")} data-base-sheets="">From Google Sheets</Button>
          <Button variant="quiet" onClick={() => setDialog("github")} data-base-github="">From GitHub</Button>
        </div>
      </header>

      <section aria-label="Tables">
        <h2 className="mb-1 text-sm font-medium">Tables · {tables.length}</h2>
        <ul className="divide-y divide-border rounded-md border border-border">
          {tables.map((t) => (
            <li key={t.id}><Link href={`/data/${t.id}`} className="block px-3 py-2 text-sm hover:bg-muted" data-base-table={t.id}>{t.name}</Link></li>
          ))}
        </ul>
      </section>
      <section aria-label="Interfaces">
        <h2 className="mb-1 text-sm font-medium">Pages · {extras.pages.length}</h2>
        {extras.pages.length === 0 ? <Words>None yet.</Words> : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {extras.pages.map((p) => <li key={p.id}><Link href={p.href} className="flex justify-between px-3 py-2 text-sm hover:bg-muted" data-base-page-item={p.id}><span>{p.name}</span><span className="text-xs text-muted-foreground">{p.table}</span></Link></li>)}
          </ul>
        )}
      </section>
      <section aria-label="Automations">
        <h2 className="mb-1 text-sm font-medium">Automations · {extras.automations.length}</h2>
        {extras.automations.length === 0 ? <Words>None yet.</Words> : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {extras.automations.map((a) => <li key={a.id}><Link href={a.href} className="flex justify-between px-3 py-2 text-sm hover:bg-muted" data-base-automation={a.id}><span>{a.name}</span><span className="text-xs text-muted-foreground">{a.enabled ? "On" : "Off"} · {a.table}</span></Link></li>)}
          </ul>
        )}
      </section>

      <EditDialog open={dialog === "edit"} onClose={() => setDialog(null)} current={identity} fallbackName={name} onSave={async (v) => { await saveBase(org, homeId, v); setDialog(null); load(); }} />
      <DuplicateDialog open={dialog === "duplicate"} onClose={() => setDialog(null)} name={name} tables={tables} organizationId={org} identity={identity} />
      <MoveBaseDialog open={dialog === "move"} onClose={() => setDialog(null)} homeId={homeId} name={name} organizationId={org} tableCount={tables.length} />
      <SnapshotsDialog open={dialog === "snapshots"} onClose={() => setDialog(null)} homeId={homeId} organizationId={org} name={name} tables={tables} identity={identity} onNeedIdentity={async () => (await saveBase(org, homeId, { name })) } />
      <AirtableImportDialog open={dialog === "airtable"} onClose={() => { setDialog(null); load(); }} organizationId={org} />
      <SheetsImportDialog open={dialog === "sheets"} onClose={() => { setDialog(null); load(); }} organizationId={org} />
      <GithubImportDialog open={dialog === "github"} onClose={() => { setDialog(null); load(); }} organizationId={org} />
    </div>
  );
}

function EditDialog({ open, onClose, current, fallbackName, onSave }: { open: boolean; onClose: () => void; current: BaseIdentity | null; fallbackName: string; onSave: (v: { name: string; icon: string; color: string; description: string }) => Promise<void> }) {
  const [v, setV] = useState({ name: fallbackName, icon: current?.icon ?? "", color: current?.color ?? COLORS[0]!, description: current?.description ?? "" });
  const [busy, setBusy] = useState(false);
  // Reset the form each time the dialog opens (or what it edits changes) — derived during render, not in an effect.
  const sig = open ? JSON.stringify([current?.name, current?.icon, current?.color, current?.description, fallbackName]) : null;
  const [seenSig, setSeenSig] = useState<string | null>(sig);
  if (sig !== seenSig) {
    setSeenSig(sig);
    if (sig !== null) setV({ name: current?.name ?? fallbackName, icon: current?.icon ?? "", color: current?.color ?? COLORS[0]!, description: current?.description ?? "" });
  }
  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(480px,96vw)] gap-3 p-4" data-base-edit="">
        <DialogTitle>Base</DialogTitle>
        <Field value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Name" placeholder="Name" />
        <Field value={v.icon} maxLength={2} onChange={(e) => setV({ ...v, icon: e.target.value })} aria-label="Icon" placeholder="Icon (a letter or emoji)" />
        <div className="flex gap-1.5" role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={v.color === c} aria-label={c} onClick={() => setV({ ...v, color: c })}
              className="size-6 rounded-full border-2" style={{ background: c, borderColor: v.color === c ? "currentColor" : "transparent" }} />
          ))}
        </div>
        <Field value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Description" placeholder="Description" />
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" disabled={busy || !v.name.trim()} onClick={async () => { setBusy(true); try { await onSave(v); } finally { setBusy(false); } }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── duplicate ───────────────────────────────────────────────────────────────────────────────

/** Moves the whole base (its Home, every table with its pages and automations) into another workspace the person belongs to: `custom.base_move`. */
function MoveBaseDialog({ open, onClose, homeId, name, organizationId, tableCount }: { open: boolean; onClose: () => void; homeId: string; name: string; organizationId: string; tableCount: number }) {
  const client = useRecordsClient();
  const router = useRouter();
  const destinations = useAppSelector(selectOrganizationsList).filter((o) => o.id !== organizationId);
  const [to, setTo] = useState<string>("");
  const [phase, setPhase] = useState<{ kind: "ask" } | { kind: "moving" } | { kind: "refused"; text: string }>({ kind: "ask" });
  const go = async () => {
    setPhase({ kind: "moving" });
    const res = await client.baseMove({ home_id: homeId, to_organization_id: to });
    if (!res.ok) { setPhase({ kind: "refused", text: res.error.message }); return; }
    // The base now answers in the other workspace: reload so its page resolves there.
    router.refresh();
    window.location.assign(`/data/bases/${homeId}`);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (!o && phase.kind !== "moving" ? (setPhase({ kind: "ask" }), onClose()) : undefined)}>
      <DialogContent className="max-w-[min(520px,96vw)] gap-3 p-4" data-base-move-dialog="">
        <DialogTitle>Move {name}</DialogTitle>
        {phase.kind === "moving" ? <Words>Moving the base…</Words> : (
          <>
            <label className="flex items-center justify-between gap-2 text-sm"><span>Workspace</span>
              <span className="min-w-0 flex-1" data-base-move-to="">
                <Select
                  className="w-full"
                  value={to}
                  onValueChange={setTo}
                  aria-label="Workspace"
                  options={[{ value: "", label: "Choose a workspace" }, ...destinations.map((o) => ({ value: o.id, label: o.name }))]}
                />
              </span>
            </label>
            <Words>{`${tableCount} tables, with their records, pages and automations, move together.`}</Words>
            {phase.kind === "refused" ? <div data-base-move-refused=""><ErrorNotice message={phase.text} size="inline" /></div> : null}
            <div className="flex justify-end gap-2"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!to} onClick={() => void go()} data-base-move-go="">Move base</Button></div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DuplicateDialog({ open, onClose, name, tables, organizationId, identity }: { open: boolean; onClose: () => void; name: string; tables: HomeTable[]; organizationId: string; identity: BaseIdentity | null }) {
  const port = useBasePort();
  const router = useRouter();
  const [withRecords, setWithRecords] = useState(true);
  const [phase, setPhase] = useState<{ kind: "ask" } | { kind: "copying"; p: BaseCopyProgress | null } | { kind: "done"; text: string; open: string | null } | { kind: "refused"; text: string }>({ kind: "ask" });
  const go = async () => {
    setPhase({ kind: "copying", p: null });
    const list: BaseTable[] = tables.map((t) => ({ id: t.id, name: t.name }));
    const copyName = `${name} (copy)`;
    const res = await duplicateBase(port, { organizationId, tables: list, withRecords, nameFor: (t) => `${t.name} (copy)`, homeName: copyName, onProgress: (p) => setPhase({ kind: "copying", p }) });
    if (!res.ok) { setPhase({ kind: "refused", text: `Stopped at ${res.stoppedAt.name}. ${(res.error as { message?: string })?.message ?? ""} ${res.made.length} of ${list.length} tables were copied.` }); return; }
    const first = res.data.tables[0]?.copy.id ?? null;
    // The copy is its own base: the new Home carries the name, icon, color and description of this one.
    const home = res.data.homeId;
    if (home) await saveBase(organizationId, home, { name: copyName, icon: identity?.icon ?? null, color: identity?.color ?? null, description: identity?.description ?? null, template: "duplicate" });
    setPhase({ kind: "done", open: home ? `/data/bases/${home}` : first ? `/data/${first}` : null,
      text: `${res.data.tables.length} tables${withRecords ? ` with ${res.data.tables.reduce((n, t) => n + t.records, 0)} records` : ""}, ${res.data.relinkedColumns} links re-pointed, ${res.data.automations} automations (off), ${res.data.pages} pages.${res.data.extrasRefused.length ? ` ${res.data.extrasRefused.join(" ")}` : ""}` });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (!o && phase.kind !== "copying" ? (setPhase({ kind: "ask" }), onClose()) : undefined)}>
      <DialogContent className="max-w-[min(520px,96vw)] gap-3 p-4" data-base-duplicate-dialog="">
        <DialogTitle>Duplicate {name}</DialogTitle>
        {phase.kind === "ask" ? (
          <>
            <label className="flex items-center justify-between gap-2 text-sm"><span>Copy the records too</span><input type="checkbox" checked={withRecords} onChange={(e) => setWithRecords(e.target.checked)} aria-label="Copy the records too" /></label>
            <Words>{`${tables.length} tables, their views, pages and automations (automations start off).`}</Words>
            <div className="flex justify-end gap-2"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => void go()} data-base-duplicate-go="">Duplicate</Button></div>
          </>
        ) : null}
        {phase.kind === "copying" ? <Words>{phase.p ? `Copying ${phase.p.tableName} (${phase.p.at} of ${phase.p.of})…` : "Starting the copy…"}</Words> : null}
        {phase.kind === "refused" ? <Words>{phase.text}</Words> : null}
        {phase.kind === "done" ? (
          <>
            <p className="text-sm" data-base-duplicate-done="">{phase.text}</p>
            <div className="flex justify-end">{phase.open ? <Button variant="primary" onClick={() => router.push(phase.open!)}>Open the copy</Button> : null}</div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ── snapshots ───────────────────────────────────────────────────────────────────────────────

function SnapshotsDialog({ open, onClose, homeId, organizationId, name, tables, identity, onNeedIdentity }: {
  open: boolean; onClose: () => void; homeId: string; organizationId: string; name: string; tables: HomeTable[]; identity: BaseIdentity | null; onNeedIdentity: () => Promise<BaseIdentity>;
}) {
  const port = useBasePort();
  const router = useRouter();
  const [base, setBase] = useState<BaseIdentity | null>(identity);
  const [rows, setRows] = useState<BaseSnapshotRow[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(async (b: BaseIdentity | null) => { if (b) setRows(await listSnapshots(b.id)); }, []);
  const [seenOpen, setSeenOpen] = useState<{ open: boolean; identity: BaseIdentity | null } | null>(null);
  if (!seenOpen || seenOpen.open !== open || seenOpen.identity !== identity) {
    setSeenOpen({ open, identity });
    if (open) setBase(identity);
  }
  useEffect(() => {
    if (!open || !identity) return;
    let live = true;
    void listSnapshots(identity.id).then((r) => { if (live) setRows(r); });
    return () => { live = false; };
  }, [open, identity]);

  const take = async () => {
    setBusy("Taking the snapshot…"); setNote(null);
    try {
      const b = base ?? (await onNeedIdentity());
      setBase(b);
      const when = label.trim() || new Date().toLocaleString();
      const res = await snapshotBase(port, { organizationId, tables: tables.map((t) => ({ id: t.id, name: t.name })), label: when, onProgress: (p) => setBusy(`Copying ${p.tableName} (${p.at} of ${p.of})…`) });
      if (!res.ok) {
        // `leftInLists` (@ai-matrx/records ≥ the W4 fix): copies the snapshot could not put away. Read loosely so this
        // compiles against the published package until it carries the field; absent means none were left.
        const left = (res as { leftInLists?: readonly string[] }).leftInLists ?? [];
        setNote(left.length > 0
          ? `The snapshot stopped at ${res.stoppedAt.name}; ${left.length === 1 ? "1 copy is" : `${left.length} copies are`} still in your lists as "Snapshot ${when} · …".`
          : `The snapshot stopped at ${res.stoppedAt.name}; nothing is left in your lists.`);
        return;
      }
      await saveSnapshot(organizationId, b.id, res.snapshot);
      setLabel(""); await load(b);
    } catch (e) { setNote(e instanceof Error ? e.message : "The snapshot failed."); } finally { setBusy(null); }
  };
  const restore = async (s: BaseSnapshotRow) => {
    setBusy("Restoring as a new base…"); setNote(null);
    const restoredOn = new Date().toLocaleDateString();
    const res = await restoreSnapshot(port, { organizationId, baseName: name, restoredOn, snapshot: { label: s.label, origin: s.origin, tables: s.tables }, onProgress: (p) => setBusy(`Copying ${p.tableName} (${p.at} of ${p.of})…`) });
    setBusy(null);
    if (!res.ok) { setNote(`The restore stopped at ${res.stoppedAt.name}. The snapshot itself is untouched.`); return; }
    const home = res.data.homeId;
    if (home) await saveBase(organizationId, home, { name: restoredBaseName(name, restoredOn), icon: identity?.icon ?? null, color: identity?.color ?? null, description: identity?.description ?? null, template: "restore" });
    setNote(`Restored as a new base: ${res.data.tables.length} tables${res.data.extrasRefused.length ? `. ${res.data.extrasRefused.join(" ")}` : ""}.`);
    if (home) router.push(`/data/bases/${home}`);
  };
  const scheduleOn = base?.snapshot_schedule?.enabled === true;
  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(560px,96vw)] gap-3 p-4" data-base-snapshots-dialog="">
        <DialogTitle>Snapshots of {name}</DialogTitle>
        <div className="flex gap-2">
          <Field value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" aria-label="Snapshot label" disabled={!!busy} />
          <Button variant="primary" disabled={!!busy} onClick={() => void take()} data-snapshot-take="">Take snapshot</Button>
        </div>
        {busy ? <Words>{busy}</Words> : null}
        {note ? <Words>{note}</Words> : null}
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.length === 0 ? <li className="px-3 py-2"><Words>No snapshots yet.</Words></li> : rows.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm" data-snapshot={s.id}>
              <span className="min-w-0 truncate">{s.label}<span className="ml-2 text-xs text-muted-foreground">{s.tables.length} tables · {new Date(s.created_at).toLocaleDateString()}</span></span>
              <span className="flex gap-1">
                <Button variant="quiet" disabled={!!busy} onClick={() => void restore(s)} data-snapshot-restore="">Restore as new base</Button>
                <Button variant="quiet" disabled={!!busy} onClick={async () => { await trashSnapshot(s.id); await load(base); }}>Remove</Button>
              </span>
            </li>
          ))}
        </ul>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Take a snapshot every week</span>
          <input type="checkbox" checked={scheduleOn} aria-label="Take a snapshot every week" disabled={!!busy}
            onChange={async (e) => {
              const on = e.target.checked;
              try { const b = base ?? (await onNeedIdentity()); const state = await setSnapshotSchedule(organizationId, b.id, on); setBase({ ...b, snapshot_schedule: state }); setNote(null); }
              catch (err) { setNote(err instanceof Error ? err.message : "The schedule could not be changed."); }
            }} />
        </label>
        <Words>{`${scheduleOn ? "A snapshot is taken every week." : "Off until you turn it on."} Snapshots you remove stay recoverable for 90 days.`}</Words>
        <span hidden data-home={homeId} />
      </DialogContent>
    </Dialog>
  );
}

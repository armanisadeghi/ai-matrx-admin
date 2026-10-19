"use client";

// ShellLayoutEditor — "Edit sidebar…", "Customize header…", "Customize dock…" (custom-experience lane C,
// PLAN §5.4). ONE editor for the three regions of a Layout, for a person or (owner/admin) an organization.
//
//   Sidebar / Dock: left, everything that can go there as a checkbox tree (tick a row → its defaults come
//   too, each can be unticked; "More you can add" holds what the default menu hides); right, your menu as
//   it will look — drag to reorder, onto a group to nest, to "Top level" to promote; rename, re-icon,
//   add a group / link / launchpad, remove.
//   Header: the five header controls (Search and Notifications locked on) and your own buttons.
//
// While a change is unsaved the REAL shell shows it (the slice's `previewBody`), so the preview is the
// actual sidebar, header and dock. Save writes one version; History restores any of them (Set active).
// Must sit under a records provider for the target organization (ShellLayoutMount).
import { useEffect, useState } from "react";
import { History, Lock, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import { Button, RegionSkeleton, SegmentedControl, Switch, Tabs } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { readAppletCatalogue } from "@ai-matrx/applets/catalogue";
import type { RecordHistoryEntry } from "@ai-matrx/records";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { setKnobOverride } from "@/lib/scoped-config/service";
import { useLaunchpads } from "@/features/launchpad/useLaunchpads";
import { buildShellCatalog, defaultDockTree, defaultHeaderButtons, defaultSidebarTree } from "../catalog";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type StoredShellLayout } from "../contract";
import { SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB } from "../knob";
import { shellLayoutPreviewChanged } from "../shellLayoutSlice";
import { useShellLayoutStore } from "../useShellLayoutStore";
import { parseShellLayoutBody, serializeShellLayoutBody, SHELL_DOCK_MAX_ITEMS } from "../validate";
import { AddOwnRow, type OwnRowInput, type PickOption } from "./AddOwnRow";
import { ArrangeTree } from "./ArrangeTree";
import { CatalogChecklist } from "./CatalogChecklist";
import { HeaderPane } from "./HeaderPane";
import { dockOf, headerOf, sidebarOf, startingBody, type EditorRegion } from "./regions";
import { addRow, buildCatalogTree, placedRefs, sameBody, tickEntry, untickEntry, type TreeRegion } from "./tree";

export type ShellLayoutTargetKind = "person" | "organization";

const REGION_TABS: ReadonlyArray<{ value: EditorRegion; label: string }> = [
  { value: "sidebar", label: "Sidebar" },
  { value: "header", label: "Header" },
  { value: "dock", label: "Dock" },
];

function bodyOf(stored: StoredShellLayout | null): ShellLayoutBody | null {
  return stored ? parseShellLayoutBody(stored.body).body : null;
}

function regionWord(region: EditorRegion): string {
  return region === "sidebar" ? "sidebar" : region === "header" ? "header" : "dock";
}

export function ShellLayoutEditor({ target, initialRegion = "sidebar" }: { target: ShellLayoutTargetKind; initialRegion?: EditorRegion }) {
  const store = useShellLayoutStore();
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const userId = useAppSelector(selectUserId);
  const isMobile = useIsMobile();
  const [region, setRegion] = useState<EditorRegion>(initialRegion);
  const [pane, setPane] = useState<"choose" | "arrange">("arrange");
  const [draft, setDraft] = useState<ShellLayoutBody | null>(null);

  const catalog = buildShellCatalog({ isAdmin });
  const tree = buildCatalogTree(catalog);
  const stored = target === "person" ? store.person : store.organization;
  const own = bodyOf(stored);
  const organizationBody = bodyOf(store.organization);
  const body = draft ?? startingBody(own, organizationBody, target);
  const dirty = draft !== null && !sameBody(draft, own);
  const checked = parseShellLayoutBody(serializeShellLayoutBody(body));

  // THE LIVE PREVIEW: the real shell draws the unsaved draft; closing the editor puts it back.
  const previewText = dirty ? serializeShellLayoutBody(body) : null;
  useEffect(() => {
    dispatch(shellLayoutPreviewChanged(previewText));
  }, [dispatch, previewText]);
  useEffect(() => () => void dispatch(shellLayoutPreviewChanged(null)), [dispatch]);

  // The organization's lock ("Members may customize").
  const allowed = useEffectiveKnob(store.organizationId, userId, SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB) !== false;

  const launchpads = useLaunchpads();
  const launchpadOptions: PickOption[] = launchpads.entries.map((e) => ({ value: e.key, label: e.title }));
  const jobs = useJobs(store.organizationId, region === "header");

  if (store.loading) return <RegionSkeleton />;
  if (target === "organization" && !store.canEditOrganization) {
    return <p className="type-secondary p-4 text-muted-foreground">Only an owner or admin can change the organization&apos;s layout</p>;
  }

  const edit = (next: ShellLayoutBody) => setDraft(next);
  const treeRegion: TreeRegion = region === "dock" ? "dock" : "sidebar";
  const nodes = region === "dock" ? dockOf(body) : sidebarOf(body);
  const setNodes = (next: typeof nodes) => edit(region === "dock" ? { ...body, dock: next } : { ...body, sidebar: next });
  const placed = placedRefs(nodes);

  const onTick = (entryId: string, on: boolean) => {
    if (on && region === "dock" && nodes.length >= SHELL_DOCK_MAX_ITEMS) {
      toast.info(`The dock holds ${SHELL_DOCK_MAX_ITEMS}. Remove one first.`);
      return;
    }
    setNodes(on ? tickEntry(nodes, tree, entryId, treeRegion) : untickEntry(nodes, entryId));
  };

  const onAddOwn = (row: OwnRowInput) => {
    if (row.kind === "mandate") return;
    if (row.kind === "group") setNodes(addRow(nodes, { kind: "group", label: row.label, icon: row.icon }, treeRegion));
    if (row.kind === "link") setNodes(addRow(nodes, { kind: "link", label: row.label, href: row.href, icon: row.icon, newTab: row.newTab }, treeRegion));
    if (row.kind === "launchpad") setNodes(addRow(nodes, { kind: "launchpad", key: row.key, label: row.label, icon: row.icon }, treeRegion));
  };

  const save = async () => {
    if (checked.problems.length > 0 || !checked.body) return;
    const note = `Edited the ${regionWord(region)}`;
    const answer = await store.save(target, checked.body, note);
    if (answer.ok) {
      setDraft(null);
      toast.success(target === "organization" ? "Organization layout saved" : "Your layout is saved");
    } else toast.error(answer.error);
  };

  const resetSection = () => {
    const { [region]: _drop, ...rest } = body;
    edit(rest as ShellLayoutBody);
  };

  const resetToOrganization = async () => {
    const ok = await confirm({
      title: "Use your organization's layout?",
      description: "Your own sidebar, header and dock are put away. History keeps them.",
      confirmLabel: "Use organization's",
    });
    if (!ok) return;
    const answer = await store.clear("person");
    if (answer.ok) setDraft(null);
    else toast.error(answer.error);
  };

  const resetToStandard = async () => {
    const ok = await confirm({
      title: "Go back to the standard layout?",
      description:
        target === "organization"
          ? "Members without their own layout see the standard menu. History keeps this one."
          : "Your sidebar, header and dock go back to the standard ones. History keeps this one.",
      confirmLabel: "Reset",
      variant: "destructive",
    });
    if (!ok) return;
    // A person whose organization has a layout keeps a layout of her own — the standard one — so it wins.
    const answer =
      target === "person" && store.organization
        ? await store.save(
            "person",
            { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: body.basedOnCatalogVersion, sidebar: defaultSidebarTree(), header: defaultHeaderButtons(), dock: defaultDockTree() },
            "Reset to standard",
          )
        : await store.clear(target);
    if (answer.ok) setDraft(null);
    else toast.error(answer.error);
  };

  const showChoose = !isMobile || pane === "choose";
  const showArrange = !isMobile || pane === "arrange";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-2 py-1">
        <Tabs aria-label="Region" value={region} onValueChange={setRegion} data={REGION_TABS} />
        {region !== "header" && isMobile ? (
          <SegmentedControl
            aria-label="Pane"
            value={pane}
            onValueChange={setPane}
            data={[
              { value: "choose", label: "Choose" },
              { value: "arrange", label: "Arrange" },
            ]}
          />
        ) : null}
      </div>
      {target === "person" && !allowed ? (
        <p className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-1.5 type-secondary text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Your organization uses one layout for everyone
        </p>
      ) : null}
      {target === "organization" && store.organizationId ? <MembersMayCustomize organizationId={store.organizationId} /> : null}

      {region === "header" ? (
        <HeaderPane
          buttons={headerOf(body)}
          catalog={catalog}
          launchpads={launchpadOptions}
          jobs={jobs.options}
          jobsLoading={jobs.loading}
          onChange={(header) => edit({ ...body, header })}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          {showChoose ? (
            <div className="flex min-h-0 w-full flex-col border-border sm:w-[46%] sm:border-r">
              <CatalogChecklist tree={tree} placed={placedRefs(nodes)} onTick={onTick} flat={region === "dock"} />
            </div>
          ) : null}
          {showArrange ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-1.5 p-2">
                <AddOwnRow kinds={region === "dock" ? ["link", "launchpad"] : ["link", "group", "launchpad"]} launchpads={launchpadOptions} onAdd={onAddOwn} />
                <span className="ml-auto type-meta text-muted-foreground">
                  {region === "dock" ? `${nodes.length} of ${SHELL_DOCK_MAX_ITEMS}` : `${placed.size} pages`}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-1">
                <ArrangeTree nodes={nodes} region={treeRegion} onChange={setNodes} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border px-2 py-1.5">
        <VersionHistory target={target} disabled={!stored} onRestored={() => setDraft(null)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" icon={<RotateCcw />}>
              Reset
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={resetSection}>Reset the {regionWord(region)}</DropdownMenuItem>
            {target === "person" && store.organization && store.person ? (
              <DropdownMenuItem onClick={() => void resetToOrganization()}>Use organization&apos;s layout</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => void resetToStandard()}>Reset to standard</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="ml-auto min-w-0 truncate type-secondary text-muted-foreground" title={checked.problems.join("\n")}>
          {checked.problems.length > 0 ? `Cannot save: ${checked.problems[0]}` : dirty ? "Unsaved, shown live" : stored ? "Saved" : target === "organization" ? "Standard layout" : "Not customized yet"}
        </span>
        {dirty ? (
          <Button variant="quiet" onClick={() => setDraft(null)}>
            Discard
          </Button>
        ) : null}
        <Button variant="primary" disabled={!dirty || checked.problems.length > 0 || store.saving} onClick={() => void save()}>
          {store.saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/** The organization's "Members may customize" switch (knob `shell.members_may_customize`, organization rung). */
export function MembersMayCustomize({ organizationId }: { organizationId: string }) {
  const userId = useAppSelector(selectUserId);
  const value = useEffectiveKnob(organizationId, userId, SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB);
  const [busy, setBusy] = useState(false);
  const on = value !== false;
  const flip = async (next: boolean) => {
    setBusy(true);
    try {
      const result = await setKnobOverride({
        ...SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB,
        scopeKind: "organization",
        scopeId: organizationId,
        organizationId,
        // On is the platform default: clear the override instead of copying the default down.
        value: next ? null : false,
        note: next ? "Members may customize their layout" : "Everyone uses the organization's layout",
      });
      if ((result as { ok?: boolean }).ok === false) toast.error("The setting could not be saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The setting could not be saved");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
      <span className="min-w-0 flex-1 type-body">Members may customize</span>
      <Switch aria-label="Members may customize" checked={on} disabled={busy || value === undefined} onCheckedChange={(next) => void flip(next)} />
    </label>
  );
}

/** Every saved version, newest first; "Set active" makes one the layout again (one new version). */
function VersionHistory({ target, disabled, onRestored }: { target: ShellLayoutTargetKind; disabled: boolean; onRestored: () => void }) {
  const store = useShellLayoutStore();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<RecordHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    setEntries(null);
    setError(null);
    const answer = await store.versions(target);
    if (answer.ok) setEntries([...answer.data]);
    else setError(answer.error);
  };

  const setActive = async (version: number) => {
    setBusy(version);
    const preview = await store.preview(target, version);
    if (!preview.ok) {
      setBusy(null);
      toast.error(preview.error);
      return;
    }
    const answer = await store.restore(target, version, preview.data.seenVersion ?? 0);
    setBusy(null);
    if (answer.ok) {
      toast.success(`Version ${version} is active again`);
      onRestored();
      setOpen(false);
    } else toast.error(answer.error);
  };

  const noteOf = (entry: RecordHistoryEntry): string => {
    const note = entry.changes.find((c) => c.key === "note")?.after;
    return typeof note === "string" && note ? note : entry.operation_label;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<History />} disabled={disabled}>
          History
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1">
        {error ? <p className="type-secondary p-2 text-destructive">{error}</p> : null}
        {!entries && !error ? <RegionSkeleton /> : null}
        <ul className="max-h-80 overflow-y-auto">
          {(entries ?? []).map((entry, i) => (
            <li key={entry.version} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
              <div className="min-w-0 flex-1">
                <p className="truncate type-body">{noteOf(entry)}</p>
                <p className="type-meta text-muted-foreground">
                  v{entry.version} · {new Date(entry.occurred_at).toLocaleString()}
                </p>
              </div>
              {i === 0 ? (
                <span className="type-meta text-muted-foreground">Active</span>
              ) : (
                <Button variant="outline" disabled={busy !== null} onClick={() => void setActive(entry.version)}>
                  {busy === entry.version ? "Restoring…" : "Set active"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** The declared AI jobs this organization can run (the Applet catalogue's job list — the one list). */
function useJobs(organizationId: string | null, wanted: boolean): { options: PickOption[]; loading: boolean } {
  const [options, setOptions] = useState<PickOption[] | null>(null);
  useEffect(() => {
    if (!wanted || !organizationId || options) return;
    let live = true;
    readAppletCatalogue(supabase, { organizationId, maxJobs: 200, sampleRows: 0, maxTables: 0 })
      .then((c) => live && setOptions(c.jobs.map((j) => ({ value: j.key, label: j.label || j.goal || j.key }))))
      .catch((error: unknown) => {
        console.error("[shell-layout] the AI job list could not be read", error);
        if (live) setOptions([]);
      });
    return () => {
      live = false;
    };
  }, [wanted, organizationId, options]);
  return { options: options ?? [], loading: wanted && options === null };
}

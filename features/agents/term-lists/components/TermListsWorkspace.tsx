"use client";

import { FrameSidebarColumn } from "@/features/shell/frame-host/frameSidebarSlot";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, BookA, ChevronLeft, Loader2, Plus, Save } from "lucide-react";
import { Skeleton, Textarea, ToggleGroup, ToggleGroupItem, cn } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { TapTargetButtonSolid } from "@ai-matrx/design-system/tap-target";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { useUserOrganizations } from "@/features/agent-context/hooks/useHierarchy";
import { presentOrganizationRefusal } from "@ai-matrx/chat/host/org";
import {
  archiveTermList,
  createTermList,
  getTermList,
  listArchivedTermLists,
  listTermLists,
  restoreTermList,
  saveTermList,
  type TermListDraft,
} from "../service";
import {
  ENTRY_KINDS,
  MODALITIES,
  MODALITY_LABELS,
  isModality,
  validateEntries,
  type EntryKind,
  type TermList,
} from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { RowSelectionBar, useRowSelection } from "@/lib/entity-list/RowSelectionBar";
import { termListBulkActions } from "./termListBulkActions";
import { TermEntriesTable } from "./TermEntriesTable";
import { replaceAddressOrNavigate } from "@/lib/url-state/addressWithoutNavigating";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  SurfaceRuntimeProvider,
  useSurfaceScopeContribution,
  useSurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { TERM_LISTS_SURFACE_NAME } from "@/features/surfaces/manifests/term-lists.manifest";
import { ArchivedDisclosure, ReadFailure } from "@ai-matrx/design-system";

const EMPTY_ORGS: { id: string; name: string }[] = [];

function draftOf(list: TermList): TermListDraft {
  return {
    name: list.name,
    description: list.description,
    modalities: list.modalities,
    context: list.context,
    source_language: list.source_language,
    entries: list.entries,
  };
}

function defaultKindFor(draft: TermListDraft): EntryKind {
  if (draft.modalities.includes("pronunciation") && draft.modalities.length === 1) {
    return "pronounce";
  }
  if (draft.modalities.includes("transcription") && draft.modalities.length === 1) {
    return "boost";
  }
  return draft.modalities.includes("translation") ? "translate" : "spell_as";
}

/** /resources/term-lists — the org's term lists and the one editor. */
export function TermListsWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const [lists, setLists] = useState<TermList[] | null>(null);
  // The rail's read failure, said in the rail — never "No term lists yet".
  const [listsError, setListsError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const memberOrgs = useUserOrganizations().data ?? EMPTY_ORGS;
  const orgNames = useMemo(
    () => new Map(memberOrgs.map((o) => [o.id, o.name] as const)),
    [memberOrgs],
  );

  const [archivedLists, setArchivedLists] = useState<TermList[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const ticked = useRowSelection(lists ?? [], (l) => l.id);
  const archivedTicked = useRowSelection(archivedLists, (l) => l.id);

  const reload = async () => {
    try {
      const [live, archived] = await Promise.all([listTermLists(), listArchivedTermLists()]);
      setLists(live);
      setArchivedLists(archived);
      setListsError(null);
    } catch (e) {
      setListsError(e);
      setLists([]);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const restoreOne = async (list: TermList) => {
    try {
      await restoreTermList(list.id);
      toast.success(`${list.name} restored`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't restore the term list");
    }
  };

  const select = (id: string) => replaceAddressOrNavigate(router, `/resources/term-lists?id=${id}`);

  const createNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await createTermList({
        name: "Untitled term list",
        modalities: ["house_terms"],
        entries: [],
      });
      await reload();
      select(created.id);
    } catch (e) {
      if (!presentOrganizationRefusal(e, { subject: "The term list", act: "created" })) {
        toast.error(e instanceof Error ? e.message : "Couldn't create the term list");
      }
    } finally {
      setCreating(false);
    }
  };

  // matrx-user/term-lists — the lists; the open editor below contributes its draft and takes drafts.
  const getSurfaceScope = () =>
    ({
      term_lists_load_status: listsError ? "failed" : lists === null ? "loading" : "loaded",
      term_lists: (lists ?? []).slice(0, 50).map((l) => ({ id: l.id, name: l.name, modalities: l.modalities, entry_count: l.entries.length })),
      open_term_list_id: selectedId,
    }) as SurfaceScopePayload;

  return (
    <SurfaceRuntimeProvider surfaceName={TERM_LISTS_SURFACE_NAME} getScope={getSurfaceScope}>
    <div className="flex h-full overflow-hidden pt-[var(--shell-header-h)]">
      <RouteHeader
        left={
          <div className="flex min-w-0 items-center gap-1">
            {selectedId ? (
              // Phone: the list and the editor are one screen each (list → detail).
              <Button
                icon={<ChevronLeft />}
                variant="quiet"
                className="md:hidden"
                aria-label="All term lists"
                onClick={() => replaceAddressOrNavigate(router, "/resources/term-lists")}
              />
            ) : null}
            <span className="type-title">Term lists</span>
          </div>
        }
        right={
          <TapTargetButtonSolid
            ariaLabel="New term list"
            tooltip="New term list"
            onClick={() => void createNew()}
            icon={creating ? <Loader2 className="animate-spin" /> : <Plus />}
          />
        }
      />
      <FrameSidebarColumn
        className={cn(
          "w-full shrink-0 flex-col border-border md:flex md:w-64 md:border-r",
          selectedId ? "hidden" : "flex",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5" data-testid="term-list-rail">
          {lists === null ? (
            <div className="flex flex-col gap-1.5 p-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : listsError != null ? (
            <ReadFailure error={listsError} what="your term lists" onRetry={() => void reload()} size="compact" />
          ) : lists.length === 0 ? (
            <button
              type="button"
              onClick={() => void createNew()}
              className="w-full rounded-md px-2 py-3 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              No term lists yet. Create one.
            </button>
          ) : (
            <>
            <RowSelectionBar
              selection={ticked}
              idOf={(l) => l.id}
              actions={termListBulkActions()}
              noun="term list"
              plural="term lists"
              compact
              onRefresh={() => void reload()}
            />
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-1">
              <Checkbox
                checked={ticked.has(list.id)}
                onCheckedChange={() => ticked.toggle(list.id)}
                aria-label={`Select ${list.name}`}
              />
              <button
                type="button"
                onClick={() => select(list.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  list.id === selectedId && "bg-muted font-medium",
                )}
              >
                <BookA className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{list.name}</span>
                {orgNames.size > 1 && orgNames.get(list.organization_id) ? (
                  <span className="max-w-[6rem] shrink-0 truncate rounded bg-muted px-1 type-meta text-muted-foreground">
                    {orgNames.get(list.organization_id)}
                  </span>
                ) : null}
                <span className="type-secondary text-muted-foreground">{list.entries.length}</span>
              </button>
              </div>
            ))}
            </>
          )}
          <ArchivedDisclosure
            count={archivedLists.length}
            open={showArchived}
            onOpenChange={setShowArchived}
            className="mt-2"
          >
            <RowSelectionBar
              selection={archivedTicked}
              idOf={(l) => l.id}
              actions={termListBulkActions("archived")}
              noun="term list"
              plural="term lists"
              compact
              onRefresh={() => void reload()}
            />
            {archivedLists.map((list) => (
              <div key={list.id} className="flex items-center gap-1">
                <Checkbox
                  checked={archivedTicked.has(list.id)}
                  onCheckedChange={() => archivedTicked.toggle(list.id)}
                  aria-label={`Select ${list.name}`}
                />
                <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm text-muted-foreground">
                  {list.name}
                </span>
                <Button
                  icon={<ArchiveRestore />}
                  variant="quiet"
                  aria-label={`Restore ${list.name}`}
                  onClick={() => void restoreOne(list)}
                />
              </div>
            ))}
          </ArchivedDisclosure>
        </div>
      </FrameSidebarColumn>
      <main
        className={cn(
          "min-w-0 flex-1 overflow-y-auto md:block",
          selectedId ? "block" : "hidden",
        )}
      >
        {selectedId ? (
          <TermListEditor
            key={selectedId}
            id={selectedId}
            onSaved={() => void reload()}
            onArchived={() => {
              void reload();
              replaceAddressOrNavigate(router, "/resources/term-lists");
            }}
          />
        ) : (
          <p className="p-6 type-body text-muted-foreground">
            Pick a term list, or create one. A term list is shared by the whole
            organization and attaches to any agent from its builder.
          </p>
        )}
      </main>
    </div>
    </SurfaceRuntimeProvider>
  );
}

export function TermListEditor({
  id,
  onSaved,
  onArchived,
}: {
  id: string;
  onSaved?: (list: TermList) => void;
  onArchived?: () => void;
}) {
  const [base, setBase] = useState<TermList | null>(null);
  const [draft, setDraft] = useState<TermListDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // The open list as edited (nothing saves until the person presses Save); its notes and entries take
  // an agent's draft. Registered only under the term-lists page surface (a no-op elsewhere).
  useSurfaceScopeContribution(TERM_LISTS_SURFACE_NAME, "term-list-editor", () =>
    ({
      open_term_list: draft
        ? {
            name: draft.name,
            modalities: draft.modalities,
            source_language: draft.source_language ?? null,
            entries: draft.entries,
            unsaved_changes: !!base && JSON.stringify(draftOf(base)) !== JSON.stringify(draft),
            problems: validateEntries(draft.entries).map((p) => `Row ${p.row}: ${p.message}`),
          }
        : null,
      term_list_notes: draft?.context ?? "",
    }) as SurfaceScopePayload,
  );
  const parseEntries = (value: unknown) => {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    if (!items.length || items.length > 200) refuseSurfaceWrite("add_term_entries takes a JSON array of 1-200 entries.");
    const problems: string[] = [];
    const entries = items.map((item, i) => {
      const term = typeof item?.term === "string" ? item.term.trim() : "";
      const kind = item?.kind as EntryKind;
      if (!term) problems.push(`Item ${i + 1}: "term" is required.`);
      if (!ENTRY_KINDS.includes(kind)) problems.push(`Item ${i + 1}: "kind" must be one of ${ENTRY_KINDS.join(", ")}.`);
      if (item?.value !== undefined && typeof item.value !== "string") problems.push(`Item ${i + 1}: "value" must be text.`);
      if (item?.language !== undefined && typeof item.language !== "string") problems.push(`Item ${i + 1}: "language" must be text.`);
      return {
        term,
        kind,
        ...(typeof item?.value === "string" ? { value: item.value } : {}),
        ...(typeof item?.language === "string" ? { language: item.language } : {}),
        ...(typeof item?.case_sensitive === "boolean" ? { case_sensitive: item.case_sensitive } : {}),
      };
    });
    if (problems.length) refuseSurfaceWrite(`${problems.join(" ")} Nothing was changed.`);
    return entries;
  };
  useSurfaceWriteHandlers(TERM_LISTS_SURFACE_NAME, {
    add_term_entries: {
      validate: (value: unknown) => {
        if (!draft) refuseSurfaceWrite("No term list is open.");
        parseEntries(value);
      },
      apply: (value: unknown) => {
        if (!draft) refuseSurfaceWrite("No term list is open.");
        const added = parseEntries(value);
        const next = [...draft!.entries, ...added];
        setDraft({ ...draft!, entries: next });
        const problems = validateEntries(next);
        return {
          summary: `Added ${added.length} entr${added.length === 1 ? "y" : "ies"} to the list. Nothing is saved until the person presses Save.${problems.length ? ` The page flags: ${problems.slice(0, 3).map((p) => `row ${p.row} ${p.message}`).join("; ")}.` : ""}`,
          data: { added: added.length, total: next.length },
        };
      },
    },
    term_list_notes: {
      validate: (value: unknown) => {
        if (!draft) refuseSurfaceWrite("No term list is open.");
        if (typeof value !== "string") refuseSurfaceWrite("term_list_notes takes text.");
      },
      apply: (value: unknown) => {
        if (!draft) refuseSurfaceWrite("No term list is open.");
        const text = String(value);
        setDraft({ ...draft!, context: text || null });
        return { summary: "The notes are filled in. Nothing is saved until the person presses Save.", data: { term_list_notes: text } };
      },
    },
  });

  useEffect(() => {
    let active = true;
    setLoadError(null);
    void getTermList(id)
      .then((list) => {
        if (!active) return;
        if (!list) {
          setMissing(true);
          return;
        }
        setBase(list);
        setDraft(draftOf(list));
      })
      .catch((e: unknown) => {
        if (active) setLoadError(e);
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  if (missing) {
    return <p className="p-6 type-body text-muted-foreground">This term list was archived or does not exist.</p>;
  }
  if (loadError != null && (!base || !draft)) {
    return <ReadFailure error={loadError} what="this term list" onRetry={() => setLoadAttempt((n) => n + 1)} />;
  }
  if (!base || !draft) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const problems = validateEntries(draft.entries);
  const dirty = JSON.stringify(draftOf(base)) !== JSON.stringify(draft);
  const set = (patch: Partial<TermListDraft>) => setDraft({ ...draft, ...patch });

  const save = async () => {
    if (saving || !draft.name.trim() || problems.length) return;
    setSaving(true);
    try {
      const result = await saveTermList(base, draft);
      if (result.status === "saved") {
        setBase(result.list);
        setDraft(draftOf(result.list));
        onSaved?.(result.list);
        toast.success("Saved");
      } else if (result.status === "conflict") {
        const reload = await confirm({
          title: "Someone else changed this list",
          description:
            "Someone saved first; loading it discards your changes",
          confirmLabel: "Load their version",
          variant: "destructive",
        });
        if (reload) {
          setBase(result.current);
          setDraft(draftOf(result.current));
        }
      } else {
        toast.error("This term list no longer exists");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    const ok = await confirm({
      title: `Archive "${base.name}"?`,
      description:
        "Every agent using it stops receiving these terms on its next run. You can restore it from the archive.",
      confirmLabel: "Archive",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await archiveTermList(base.id);
      onArchived?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't archive");
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4" data-testid="term-list-editor">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Name"
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-0 max-w-md flex-1"
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            icon={<Archive />}
            variant="quiet"
            aria-label="Archive"
            onClick={() => void archive()}
          >
            <span className="hidden sm:inline">Archive</span>
          </Button>
          <Button
            icon={saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            variant="primary"
            onClick={() => void save()}
            disabled={!dirty || saving || !draft.name.trim() || problems.length > 0}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="type-secondary text-muted-foreground">Used for</span>
        <ToggleGroup
          type="multiple"
          aria-label="Used for"
          value={draft.modalities}
          onValueChange={(values: string[]) => set({ modalities: values.filter(isModality) })}
          className="flex-wrap justify-start"
        >
          {MODALITIES.map((m) => (
            <ToggleGroupItem
              key={m}
              value={m}
              size="sm"
              variant="outline"
              aria-label={MODALITY_LABELS[m]}
              className="data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary-ink"
            >
              {MODALITY_LABELS[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Source language
          <Input
            aria-label="Source language"
            value={draft.source_language ?? ""}
            onChange={(e) => set({ source_language: e.target.value || null })}
            className="w-20"
            placeholder="en"
          />
        </label>
      </div>

      <Textarea
        aria-label="Notes"
        value={draft.context ?? ""}
        onChange={(e) => set({ context: e.target.value || null })}
        rows={2}
        placeholder="Audience and brand notes; never translated or spoken"
      />

      <TermEntriesTable
        entries={draft.entries}
        onChange={(entries) => set({ entries })}
        defaultKind={defaultKindFor(draft)}
        problemRows={new Set(problems.map((p) => p.row))}
      />
      {problems.length ? (
        <ul className="px-1 type-secondary text-destructive" data-testid="term-list-problems">
          {problems.slice(0, 5).map((p, __i, __all) => (
            <li key={`${p.row}-${p.message}`}>
              Row {p.row}: {p.message}
            {__i === __all.length - 1 && <ErrorAlchemyMenu />}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

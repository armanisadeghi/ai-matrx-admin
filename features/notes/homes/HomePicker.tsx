"use client";

// features/notes/homes/HomePicker.tsx
//
// THE home picker (item homes). One list — each organization's General plus
// every scope grouped by scope type, searchable, with "New home…" — used by
// every move entry point: the bottom-bar chip (popover), every "Move to…"
// menu and the bulk bar (dialog; a plain Dialog is a bottom sheet on phones).
// Picking a home moves the note(s) through `moveNoteToHome` and closes.

import React, { useMemo, useState } from "react";
import { Box, Check, House, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, Select } from "@ai-matrx/design-system/controls";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { createScope } from "@/features/scopes/redux/thunks/scopeTreeMutations";
import { selectNoteById } from "../redux/selectors";
import {
  collidingHomeNames,
  homeDisplayName,
  homeSections,
  isGeneralScopeType,
  type NoteHome,
} from "./homeModel";
import { moveNoteToHome, moveNotesToHome } from "./moveNoteToHome";
import { useNoteHomes } from "./useNoteHomes";

interface HomePickerListProps {
  /** The home to mark as current (single-note moves). */
  currentScopeId: string | null;
  /** Where "New home…" is created by default (the note's organization). */
  defaultOrganizationId: string | null;
  onPick: (home: NoteHome, label: string) => void | Promise<void>;
  busy?: boolean;
}

export function HomePickerList({
  currentScopeId,
  defaultOrganizationId,
  onPick,
  busy = false,
}: HomePickerListProps) {
  const dispatch = useAppDispatch();
  const { homes, organizations, status } = useNoteHomes();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrgId, setNewOrgId] = useState<string>(defaultOrganizationId ?? "");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const sections = useMemo(() => homeSections(homes), [homes]);
  const collidingNames = useMemo(() => collidingHomeNames(homes), [homes]);
  // In a list that spans organizations, every General names its organization.
  const manyGenerals = useMemo(() => homes.filter((h) => h.isGeneral).length > 1, [homes]);
  const labelFor = (home: NoteHome) =>
    homeDisplayName(home, { notesSpanManyOrganizations: manyGenerals, collidingNames });

  const orgId = newOrgId || organizations[0]?.id || "";
  const typeOptions = useMemo(() => {
    const org = organizations.find((o) => o.id === orgId);
    return (org?.scope_types ?? [])
      .filter((type) => !isGeneralScopeType(type))
      .map((type) => ({ value: type.id, label: type.label_singular }));
  }, [organizations, orgId]);
  const typeId = typeOptions.some((o) => o.value === newTypeId) ? newTypeId : (typeOptions[0]?.value ?? "");

  const createHome = async () => {
    const name = query.trim();
    if (!name || !orgId || !typeId || saving) return;
    setSaving(true);
    try {
      const res = await dispatch(createScope({ organization_id: orgId, scope_type_id: typeId, name }));
      if (!res.ok) {
        toast.error(res.error?.message ?? "The home could not be created.");
        return;
      }
      const org = organizations.find((o) => o.id === orgId);
      const type = org?.scope_types.find((t) => t.id === typeId);
      const home: NoteHome = {
        scopeId: res.data.id,
        name: res.data.name,
        organizationId: orgId,
        organizationName: org?.name ?? "",
        scopeTypeId: typeId,
        scopeTypeLabel: type?.label_singular ?? "",
        isGeneral: false,
      };
      setCreating(false);
      await onPick(home, home.name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Command shouldFilter className="flex min-h-0 flex-1 flex-col">
      <CommandInput placeholder="Find a home" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>{status === "ready" ? "No home matches" : "Loading homes"}</CommandEmpty>
        {sections.map((section) => (
          <CommandGroup key={section.label} heading={section.label}>
            {section.homes.map((home) => {
              const label = labelFor(home);
              const isCurrent = home.scopeId === currentScopeId;
              const Icon = home.isGeneral ? House : Box;
              return (
                <CommandItem
                  key={home.scopeId}
                  value={`${label} ${home.organizationName} ${home.scopeTypeLabel} ${home.scopeId}`}
                  disabled={busy || isCurrent}
                  onSelect={() => void onPick(home, label)}
                  data-home-scope-id={home.scopeId}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{label}</span>
                  {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t border-border p-1.5">
        {creating ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <Select
                aria-label="Organization"
                value={orgId}
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                onValueChange={setNewOrgId}
                className="min-w-0 flex-1"
              />
              <Select
                aria-label="Kind of home"
                value={typeId}
                options={typeOptions}
                onValueChange={setNewTypeId}
                disabled={typeOptions.length === 0}
                className="min-w-0 flex-1"
              />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {typeOptions.length === 0 ? (
                <span className="mr-auto text-xs text-muted-foreground">No scope types here yet</span>
              ) : null}
              <Button variant="quiet" onClick={() => setCreating(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void createHome()}
                disabled={!query.trim() || !typeId || saving || busy}
              >
                {query.trim() ? `Create “${query.trim()}”` : "Type a name"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={busy}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary-ink hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            New home…
          </button>
        )}
      </div>
    </Command>
  );
}

/** "Move to…" for one note or many (any mix of organizations). */
export function HomePickerDialog({
  open,
  onOpenChange,
  noteIds,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteIds: readonly string[];
  onMoved?: () => void;
}) {
  const dispatch = useAppDispatch();
  const firstId = noteIds[0] ?? "";
  const first = useAppSelector(useMemo(() => selectNoteById(firstId), [firstId]));
  const [busy, setBusy] = useState(false);

  const pick = async (home: NoteHome, label: string) => {
    if (busy || noteIds.length === 0) return;
    setBusy(true);
    try {
      if (noteIds.length === 1) {
        const result = await dispatch(
          moveNoteToHome({ noteId: noteIds[0], scopeId: home.scopeId, homeLabel: label }),
        ).unwrap();
        if (!result.ok) return;
      } else {
        const result = await dispatch(
          moveNotesToHome({ noteIds, scopeId: home.scopeId, homeLabel: label }),
        ).unwrap();
        if (result.moved === 0) return;
      }
      onMoved?.();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-2 p-3 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {noteIds.length === 1 ? "Move note to…" : `Move ${noteIds.length} notes to…`}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <HomePickerList
            currentScopeId={noteIds.length === 1 ? (first?.home_scope_id ?? null) : null}
            defaultOrganizationId={first?.organization_id ?? null}
            onPick={pick}
            busy={busy}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The note's home, as one chip: shows where it lives; click to move it. */
export function HomeChip({ noteId, className }: { noteId: string; className?: string }) {
  const dispatch = useAppDispatch();
  const note = useAppSelector(useMemo(() => selectNoteById(noteId), [noteId]));
  const { labelOf } = useNoteHomes();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!note) return null;
  const label = labelOf(note.home_scope_id) ?? (note.home_scope_id ? "Home" : "General");

  const pick = async (home: NoteHome, homeLabel: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await dispatch(
        moveNoteToHome({ noteId, scopeId: home.scopeId, homeLabel }),
      ).unwrap();
      if (result.ok) setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Home: ${label}`}
          aria-label={`Home: ${label}. Move this note`}
          data-note-home-chip
          className={cn(
            "inline-flex max-w-[220px] items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
            className,
          )}
        >
          <House className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[320px] flex-col p-0">
        {open ? (
          <HomePickerList
            currentScopeId={note.home_scope_id}
            defaultOrganizationId={note.organization_id}
            onPick={pick}
            busy={busy}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

"use client";

// features/scopes/homes/HomePickerList.tsx
//
// THE home picker (item homes). One list — each organization's General plus
// every scope grouped by scope type, searchable, with "New home…". Every move
// entry point renders it: notes' chip, menus and bulk bar, and the built-in
// "Move to…" bulk verb every list gets (`pickHome`, homePickerOpener.ts).
// It only PICKS; the caller moves (`setHome` / notes' `moveNoteToHome`).

import React, { useMemo, useState } from "react";
import { Box, Check, House, Plus } from "lucide-react";
import { Button, Select } from "@ai-matrx/design-system/controls";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { createScope } from "@/features/scopes/redux/thunks/scopeTreeMutations";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import {
  homeLabels,
  homeMatchScore,
  homeSections,
  isGeneralScopeType,
  type ItemHome,
} from "./homeModel";
import { useHomeChoices } from "./useHomeChoices";

export interface HomePickerListProps {
  /** The home to mark as current (single-record moves). */
  currentScopeId: string | null;
  /** Where "New home…" is created by default (the record's organization). */
  initialOrganizationId: string | null;
  onPick: (home: ItemHome, label: string) => void | Promise<void>;
  busy?: boolean;
  /** Placement of the scrolling list (height). */
  listClassName?: string;
}

export function HomePickerList({
  currentScopeId,
  initialOrganizationId,
  onPick,
  busy = false,
  listClassName,
}: HomePickerListProps) {
  const dispatch = useAppDispatch();
  const { homes, organizations, status } = useHomeChoices();
  const activeOrganizationId = useAppSelector(selectActiveOrganizationId);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrgId, setNewOrgId] = useState<string>(initialOrganizationId ?? "");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const sections = useMemo(() => homeSections(homes), [homes]);
  // In a list that spans organizations, every General names its organization; no two rows read the same.
  const labels = useMemo(
    () => homeLabels(homes, { notesSpanManyOrganizations: homes.filter((h) => h.isGeneral).length > 1 }),
    [homes],
  );
  const labelFor = (home: ItemHome) => labels.get(home.scopeId) ?? home.name;
  // Each item's value is its scope id (unique, never searched); the filter ranks by the home's name.
  const homeById = useMemo(() => new Map(homes.map((home) => [home.scopeId, home])), [homes]);
  const filterHomes = (value: string, search: string) => {
    const home = homeById.get(value);
    if (!home) return 0;
    // Typing narrows to places the note can GO: Enter never lands on the home it is already in.
    if (search.trim() && home.scopeId === currentScopeId) return 0;
    return homeMatchScore(search, home, labelFor(home));
  };

  // A new home is a write: it goes where the note lives, else the active organization — never a guessed first membership.
  const orgId = newOrgId || activeOrganizationId || "";
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
      const home: ItemHome = {
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
    <Command shouldFilter filter={filterHomes} className="flex min-h-0 flex-1 flex-col">
      <CommandInput placeholder="Find a home" value={query} onValueChange={setQuery} />
      <CommandList className={cn("max-h-[360px]", listClassName)}>
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
                  value={home.scopeId}
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


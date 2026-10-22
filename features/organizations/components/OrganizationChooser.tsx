"use client";

// OrganizationChooser — "pick one of MY organizations" as a value (a form field), for a person
// whose organizations are a PAGE of a longer list (bounded organizations, 2026-10-16). The body is
// the platform's ONE organization control (`OrganizationPicker`, `@ai-matrx/design-system`) over
// `usePagedOrganizations`: server-side search, "Show more". It never touches the ACTIVE
// organization — the value is the host's own (a connection's organization, an import target).

import { useState } from "react";
import { Building2 } from "lucide-react";
import { OrganizationPicker, Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { useOrganizationsWith } from "@/features/organizations/hooks/useOrganizationsWith";
import { pagedPickerProps, usePagedOrganizations } from "@/features/organizations/hooks/usePagedOrganizations";
import type { OrganizationWithRole } from "@/features/organizations/types";

export interface OrganizationChooserProps {
  value: string | null;
  /** The chosen organization's name when the host already knows it (it may be beyond the page). */
  valueName?: string | null;
  onChange: (organization: { id: string; name: string; slug: string }) => void;
  placeholder?: string;
  /** An organization the host does not offer (the one it is already in). */
  excludeId?: string | null;
  disabled?: boolean;
  className?: string;
}

function isTestFixture(org: OrganizationWithRole): boolean {
  const settings = org.settings as Record<string, unknown> | undefined;
  return !!settings && typeof settings === "object" && "test_fixture" in settings;
}

export function OrganizationChooser({
  value,
  valueName,
  onChange,
  placeholder = "Pick an organization",
  excludeId = null,
  disabled,
  className,
}: OrganizationChooserProps) {
  const [open, setOpen] = useState(false);
  const paged = usePagedOrganizations();
  // The chosen organization may be beyond the loaded page: asked by id.
  const named = useOrganizationsWith([value]);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const label =
    (picked?.id === value ? picked.name : null) ??
    named.organizations.find((o) => o.id === value)?.name ??
    valueName ??
    (value ? "Organization" : placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button icon={<Building2 aria-hidden="true" />} variant="outline" disabled={disabled} className={className} data-testid="organization-chooser">
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      {/* sizing: fixed — the picker searches as you type; a content-sized box would reflow per keystroke */}
      <PopoverContent align="start" sideOffset={6} className="w-80 p-1">
        <OrganizationPicker
          hideHeading
          organizations={paged.organizations.filter((org) => org.id !== excludeId).map((org) => ({
            id: org.id,
            name: org.name,
            abbreviation: org.abbreviation,
            distinguisher: org.slug,
            isTestFixture: isTestFixture(org),
          }))}
          activeOrganizationId={value}
          loading={paged.loading}
          loadFailed={Boolean(paged.error) && paged.organizations.length === 0}
          onSelect={(org) => {
            const row = paged.organizations.find((o) => o.id === org.id);
            setPicked({ id: org.id, name: org.name });
            onChange({ id: org.id, name: org.name, slug: row?.slug ?? "" });
            setOpen(false);
          }}
          {...pagedPickerProps(paged)}
        />
      </PopoverContent>
    </Popover>
  );
}

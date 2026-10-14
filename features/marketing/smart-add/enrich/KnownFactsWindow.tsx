"use client";

/**
 * Enrich start window: "What we already know" (ENRICH.md §2). Every current fact on the brand, grouped,
 * each with a checkbox and its real value (raw logo, exact handle). Group checkboxes + Select all (default:
 * all checked). Checked facts seed the run as known, confirmed facts; unchecked ones are not sent and not changed.
 */

import { useState } from "react";
import { ExternalLink, Maximize2 } from "lucide-react";
import { Button, RowGroup } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { KNOWN_GROUPS, type KnownFact } from "./known";

type CheckState = boolean | "indeterminate";

function stateOf(ids: string[], checked: ReadonlySet<string>): CheckState {
  const n = ids.filter((id) => checked.has(id)).length;
  return n === 0 ? false : n === ids.length ? true : "indeterminate";
}

function FactValue({ fact }: { fact: KnownFact }) {
  if (fact.imageUrl) {
    // The raw logo, never tinted or wrapped.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fact.imageUrl} alt={fact.label} className="h-10 w-auto max-w-[160px] object-contain" />;
  }
  return <span className="min-w-0 truncate text-sm">{fact.value}</span>;
}

/** The Logo row's Open: a larger preview of the same image (the logo strip's Enlarge), not the raw file. */
function EnlargeImage({ fact }: { fact: KnownFact }) {
  const [open, setOpen] = useState(false);
  const raw = fact.imageUrl ?? "";
  const src = /^https?:\/\//i.test(raw) ? proxiedExternalImageUrl(raw) : raw;
  return (
    <>
      <Button
        variant="outline"
        className="ml-auto shrink-0"
        aria-label={`Enlarge ${fact.label}`}
        title="Enlarge"
        icon={<Maximize2 />}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{fact.label}</DialogTitle>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={fact.label} className="h-[50dvh] w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function KnownFactsWindow({
  brandName,
  facts,
  checked,
  onChange,
  onStart,
  starting,
}: {
  brandName: string;
  facts: KnownFact[];
  checked: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  onStart: () => void;
  starting: boolean;
}) {
  const all = facts.map((f) => f.id);
  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(checked);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };
  const groups = KNOWN_GROUPS.map((g) => ({ ...g, facts: facts.filter((f) => f.group === g.key) })).filter((g) => g.facts.length);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-8 pt-[calc(var(--shell-header-h)+1rem)]" data-testid="smart-add-enrich-known">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="type-title truncate">What we already know</h1>
          <p className="truncate text-sm text-muted-foreground">{brandName}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm" data-testid="enrich-select-all">
          <Checkbox checked={stateOf(all, checked)} onCheckedChange={(v) => toggle(all, v === true)} aria-label="Select all" />
          Select all
        </label>
      </div>
      {groups.length === 0 ? <p className="text-sm text-muted-foreground">Nothing on this brand yet</p> : null}
      {groups.map((g) => {
        const ids = g.facts.map((f) => f.id);
        return (
          <RowGroup
            key={g.key}
            data-testid={`enrich-group-${g.key}`}
            title={
              <label className="flex items-center gap-2">
                <Checkbox checked={stateOf(ids, checked)} onCheckedChange={(v) => toggle(ids, v === true)} aria-label={`All ${g.label}`} />
                {g.label}
                <span className="font-normal normal-case text-muted-foreground">{ids.filter((id) => checked.has(id)).length}/{ids.length}</span>
              </label>
            }
          >
            {g.facts.map((f) => (
              <label key={f.id} className="flex min-h-9 items-center gap-3 px-3 py-1.5" data-testid="enrich-known-fact">
                <Checkbox checked={checked.has(f.id)} onCheckedChange={(v) => toggle([f.id], v === true)} aria-label={`${f.label}: ${f.value}`} />
                <span className="flex w-36 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {f.platform ? <PlatformMark platform={f.platform} /> : null}
                  {f.platform ? platformLabel(f.platform) : f.label}
                </span>
                <FactValue fact={f} />
                {f.imageUrl ? (
                  <EnlargeImage fact={f} />
                ) : f.url ? (
                  <OutboundLink href={f.url} className="ml-auto shrink-0 text-muted-foreground" aria-label="Open">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </OutboundLink>
                ) : null}
              </label>
            ))}
          </RowGroup>
        );
      })}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">{checked.size} of {all.length} facts</span>
        <Button variant="primary" onClick={onStart} disabled={starting} data-testid="enrich-start">
          Start Smart Add
        </Button>
      </div>
    </div>
  );
}

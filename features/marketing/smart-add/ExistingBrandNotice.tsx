"use client";

/**
 * Smart Add · "You already have <Brand>" (BRAND-MATCH in FEATURE.md).
 * One short notice, never a block: open the brand, add what is new to it (the enrich flow, carrying this
 * session's answers), or create a separate one. It lays itself over the space below its anchor
 * (`position: absolute`), so it never pushes the page.
 */
import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { describeCandidate, type BrandMatch } from "./brandMatch";

const MAX_LISTED = 4;

export function ExistingBrandNotice({
  matches,
  error = null,
  onAddTo,
  onSeparate,
  placement,
}: {
  matches: BrandMatch[];
  error?: string | null;
  onAddTo: (match: BrandMatch) => void;
  onSeparate: () => void;
  /** `above`: opens upward from its anchor (the Create bar); `below`: opens downward (the entry field). */
  placement: "above" | "below";
}) {
  const place = placement === "above" ? "bottom-full mb-2" : "top-full mt-3";
  if (!matches.length) {
    return error ? (
      <p role="status" className={`absolute inset-x-0 ${place} text-center text-xs text-muted-foreground`} data-testid="existing-brand-check-failed">
        Couldn&apos;t check your brands
      </p>
    ) : null;
  }
  const listed = matches.slice(0, MAX_LISTED);
  const single = listed.length === 1;
  return (
    <div
      role="status"
      data-testid="existing-brand-notice"
      className={`absolute inset-x-0 ${place} z-20 flex flex-col gap-2 rounded-lg border border-warning/40 bg-card px-4 py-3 text-left shadow-lg`}
    >
      {single ? null : <span className="text-sm font-medium text-foreground">You already have {matches.length} similar brands</span>}
      <ul className="flex flex-col gap-2">
        {listed.map((m) => (
          <li key={m.brand.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5" data-testid="existing-brand-row">
            <span className="min-w-0 flex-1 basis-48 text-sm text-foreground">
              {single ? "You already have " : ""}
              <span className="font-medium">{m.brand.name}</span>
              {describeCandidate(m.brand) ? <span className="text-muted-foreground"> ({describeCandidate(m.brand)})</span> : null}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={marketingRoutes.brand(marketingSeg({ id: m.brand.id, slug: m.brand.slug }))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Open it <ExternalLink className="size-3.5" />
              </a>
              <Button variant="primary" onClick={() => onAddTo(m)} data-testid="existing-brand-enrich">
                Add what&apos;s new to it
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2">
        {matches.length > MAX_LISTED ? <span className="text-xs text-muted-foreground">+{matches.length - MAX_LISTED} more</span> : <span />}
        <Button variant="quiet" onClick={onSeparate} data-testid="existing-brand-separate">
          Create a separate brand
        </Button>
      </div>
    </div>
  );
}

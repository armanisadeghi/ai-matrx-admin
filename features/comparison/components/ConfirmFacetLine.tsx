"use client";

/**
 * "Is this them?" — one compact line for a company facet whose page only resembles the company.
 * Nothing from the page is read or scored until the run's owner says yes; "Not them" leaves the facet
 * empty for good. The cost of yes sits behind the Cost door. Without a handler
 * (a public page, a person who is not the owner) the line is read-only: the question and the link.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { CostDoor } from "@/components/cost/CostDoor";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

import { ComparisonRefusal, type ComparedItem, type ItemFacet } from "../contract";

/** What the page offers to answer the question; the run id and the owner check live behind it. */
export interface FacetConfirm {
  runId: string;
  price: (item: ComparedItem, facet: string) => Promise<number>;
  answer: (item: ComparedItem, facet: string, answer: { url: string } | { reject: true }) => Promise<void>;
}

/** A facet that is waiting on "Is this them?". */
export const isUnconfirmed = (f: ItemFacet | undefined): boolean =>
  Boolean(f && f.status === "failed" && f.possible_url && !f.rejected);

export function ConfirmFacetLine({ item, facet, confirm }: { item: ComparedItem; facet: ItemFacet; confirm?: FacetConfirm }) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const price = useQuery({
    queryKey: ["comparison", "confirm-price", confirm?.runId, item.item_id, item.item_index, facet.key],
    queryFn: () => (confirm as FacetConfirm).price(item, facet.key),
    enabled: Boolean(confirm),
    staleTime: 60_000,
  });
  const page = facet.possible_url as string;
  const name = facet.possible_name || item.name;

  async function reply(kind: "yes" | "no") {
    if (!confirm) return;
    setBusy(kind);
    setProblem(null);
    try {
      await confirm.answer(item, facet.key, kind === "yes" ? { url: page } : { reject: true });
    } catch (err) {
      setProblem(err instanceof ComparisonRefusal ? err.userMessage : "That could not be saved. Try again.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1" data-testid="confirm-facet-line">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="type-secondary min-w-0 text-foreground">
          <span className="text-muted-foreground">{item.name} · </span>Is this them?{" "}
          <OutboundLink href={page} className="inline-flex max-w-full items-center gap-1 align-bottom text-primary hover:underline">
            <span className="truncate">{name}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </OutboundLink>
        </span>
        {confirm ? (
          <span className="flex items-center gap-1.5">
            {price.data && price.data > 0 ? <CostDoor points={price.data} /> : null}
            <Button variant="outline" disabled={busy !== null}
              onClick={() => void reply("yes")}>
              {busy === "yes" ? "Reading" : "Yes, use it"}
            </Button>
            <Button variant="quiet" disabled={busy !== null} onClick={() => void reply("no")}>
              Not them
            </Button>
          </span>
        ) : null}
      </div>
      {problem ? <ErrorNotice size="inline" message={problem} /> : null}
    </div>
  );
}

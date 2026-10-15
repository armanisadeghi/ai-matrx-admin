"use client";

/**
 * "We think" — the suggested option glows and a one-line hint names it; the reason (and the evidence it
 * rests on) lives in the hint's hover card only. Never selects anything. Used by the validation page and
 * the Smart Add compare cards. Spec: SPEC.md § Validation page, "We think".
 */

import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { ANSWER_LABEL, type Suggestion } from "./validate/queue";

/** The hint: "We think: Ours 92%"; hover for why. Renders an empty line of the same height when there is none. */
export function WeThinkHint({ suggestion, kinds, evidence }: { suggestion: Suggestion | null; kinds: BrandRelationKind[]; evidence?: string[] }) {
  if (!suggestion) return <span className="h-5" aria-hidden />;
  const rel = suggestion.relation_key ? kinds.find((k) => k.key === suggestion.relation_key)?.label : null;
  const label = rel ?? ANSWER_LABEL[suggestion.choice];
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <span className="flex h-5 items-center gap-1.5 text-xs text-primary" data-testid="validate-we-think" data-choice={suggestion.choice}>
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          We think: {label}
          {suggestion.probability !== null ? (
            <span className="tabular-nums text-muted-foreground">{Math.round(suggestion.probability * 100)}%</span>
          ) : null}
        </span>
      </HoverCardTrigger>
      {suggestion.reason ? (
        <HoverCardContent className="flex w-72 flex-col gap-1.5 text-xs" data-testid="we-think-reason">
          <span>{suggestion.reason}</span>
          {evidence?.length ? (
            <ul className="flex flex-col gap-0.5 text-muted-foreground">
              {evidence.map((e) => (
                <li key={e} className="break-words">
                  {e}
                </li>
              ))}
            </ul>
          ) : null}
        </HoverCardContent>
      ) : null}
    </HoverCard>
  );
}

/** A soft pulsing ring around the suggested option. Purely visual: the option is never pressed for the person. */
export function Glow({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-flex" data-glow={on ? "true" : undefined}>
      {on ? (
        <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-full bg-primary/25 blur-md motion-safe:animate-pulse" />
      ) : null}
      <span className={`relative inline-flex rounded-full ${on ? "ring-2 ring-primary" : ""}`}>{children}</span>
    </span>
  );
}

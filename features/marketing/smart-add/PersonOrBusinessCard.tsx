"use client";

/**
 * Smart Add — "Is this a person or a business?" (one question, asked only when the deterministic
 * signals conflict or are too weak; server: aidream `services/brand_intake/person_signals.py`).
 *
 * Not wired yet: the identify workflow emits no person verdict until the build after Lane A.
 * Plan: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/PEOPLE-AND-CREATORS.md
 *
 * "We think" glows one option and never selects it. The signals that fired (with their source field)
 * live in a hover card only, never on the card itself.
 */

import type { ReactNode } from "react";
import { Building2, Info, UserRound, UsersRound } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export type PersonOrBusinessAnswer = "person" | "business" | "both" | "later";

export interface PersonSignalView {
  key: string;
  weight: number;
  source: string;
  value: string;
}

const OPTIONS: { answer: Exclude<PersonOrBusinessAnswer, "later">; label: string; icon: ReactNode }[] = [
  { answer: "person", label: "A person", icon: <UserRound aria-hidden /> },
  { answer: "business", label: "A business", icon: <Building2 aria-hidden /> },
  { answer: "both", label: "A person with a business", icon: <UsersRound aria-hidden /> },
];

export function PersonOrBusinessCard({
  name,
  imageUrl,
  detail,
  suggestion,
  signals = [],
  onAnswer,
}: {
  name: string;
  imageUrl?: string | null;
  /** One short line: platform, handle or site. */
  detail?: string | null;
  /** "We think": glows that option only. */
  suggestion?: Exclude<PersonOrBusinessAnswer, "later"> | null;
  signals?: PersonSignalView[];
  onAnswer: (answer: PersonOrBusinessAnswer) => void;
}) {
  return (
    <section
      aria-label="Person or business"
      data-testid="smart-add-person-or-business"
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <header className="flex items-center gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{name}</p>
          {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        {signals.length ? (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="quiet" icon={<Info aria-hidden />} aria-label="Why we ask" data-testid="person-or-business-why" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-xs">
              <ul className="flex flex-col gap-1">
                {signals.map((s) => (
                  <li key={s.key} className="flex gap-2">
                    <span className={s.weight > 0 ? "text-foreground" : "text-muted-foreground"}>
                      {s.weight > 0 ? "Person" : "Business"}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={`${s.source}: ${s.value}`}>
                      {s.value}
                    </span>
                  </li>
                ))}
              </ul>
            </HoverCardContent>
          </HoverCard>
        ) : null}
      </header>

      <p className="text-sm font-medium">Is this a person or a business?</p>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <span
            key={o.answer}
            data-glow={suggestion === o.answer ? "true" : undefined}
            className={suggestion === o.answer ? "rounded-md ring-2 ring-primary/40 ring-offset-1 ring-offset-card" : undefined}
          >
            <Button
              variant="outline"
              icon={o.icon}
              onClick={() => onAnswer(o.answer)}
              data-testid={`person-or-business-${o.answer}`}
            >
              {o.label}
            </Button>
          </span>
        ))}
        <Button variant="quiet" onClick={() => onAnswer("later")} data-testid="person-or-business-later">
          Ask me later
        </Button>
      </div>
    </section>
  );
}

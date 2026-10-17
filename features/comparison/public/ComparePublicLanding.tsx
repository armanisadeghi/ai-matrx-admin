/**
 * /compare for a signed-out visitor — the front door of the comparison product. One elevated stage:
 * the headline, one big input, three proof points. Champions: Versus.com (the comparison itself is the
 * product, the input is the whole page) and Perplexity's front door (one box, nothing else competes).
 * Policy (does running need a free account?) is the comparison.public knobs, read on the server.
 */

import { ListOrdered, Link2, Scale } from "lucide-react";

import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";

import { CompareHero } from "./CompareHero";

const PROOF = [
  { icon: Scale, label: "Real numbers" },
  { icon: Link2, label: "Every source linked" },
  { icon: ListOrdered, label: "Ranked, side by side" },
] as const;

export function ComparePublicLanding({ runRequiresAccount }: { runRequiresAccount: boolean }) {
  return (
    <MarketingPageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-[var(--matrx-page-gutter,1rem)] pb-24 pt-28 text-center sm:pt-36">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Compare anything. See the real numbers.
        </h1>
        <CompareHero runRequiresAccount={runRequiresAccount} />
        <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {PROOF.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </MarketingPageShell>
  );
}

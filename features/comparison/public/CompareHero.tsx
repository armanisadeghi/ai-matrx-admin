"use client";

/**
 * The public landing's one input. Submit sends a signed-out visitor to sign-up (when the
 * comparison.public.run_requires_account knob is on) with the input riding in the destination, so after
 * sign-up they land on /compare with it already in the box. Enter submits; Shift+Enter breaks a line.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

export function compareDestination(text: string): string {
  const q = text.trim();
  return q ? `/compare?q=${encodeURIComponent(q)}` : "/compare";
}

/** What the box promises before the click: free runs a visitor has, or that a free account runs it. */
export function heroNote(runRequiresAccount: boolean, guestFreeRuns: number | null): string | null {
  if (runRequiresAccount) return "A free account runs it";
  return guestFreeRuns ? `${guestFreeRuns} free comparisons a day, no account` : null;
}

export function CompareHero({ runRequiresAccount, guestFreeRuns = null }: { runRequiresAccount: boolean; guestFreeRuns?: number | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const dest = compareDestination(text);
  const ready = text.trim().length > 0;

  function go() {
    if (!ready) return;
    router.push(runRequiresAccount ? `/sign-up?redirectTo=${encodeURIComponent(dest)}` : dest);
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); go(); }}
      className="w-full rounded-2xl border border-border bg-card p-3 shadow-md focus-within:border-primary"
    >
      <label htmlFor="compare-hero-input" className="sr-only">What to compare</label>
      <textarea
        id="compare-hero-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } }}
        rows={2}
        placeholder="Names, websites or links, separated by vs"
        className="block w-full resize-none bg-transparent px-3 py-2 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-xl"
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        {heroNote(runRequiresAccount, guestFreeRuns) ? (
          <span className="type-secondary mr-auto pl-3 text-muted-foreground">{heroNote(runRequiresAccount, guestFreeRuns)}</span>
        ) : null}
        {runRequiresAccount ? (
          <a
            href={`/login?redirectTo=${encodeURIComponent(dest)}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign in
          </a>
        ) : null}
        <Button type="submit" variant="primary" disabled={!ready} icon={<ArrowRight className="h-4 w-4" />}>
          Compare
        </Button>
      </div>
    </form>
  );
}

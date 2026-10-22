"use client";

/**
 * The name box for a link-only source: type a company, an app or an @handle, and compare's ONE
 * lookup finds the page the source reads. Certain → the page is used at once; several fits → "Is
 * this them?" with each candidate; none → said, with the link box still under Advanced. The found
 * page lands in the form's own link value, so the fetch is exactly the link fetch it always was.
 */

import { useState } from "react";
import { Check, ExternalLink, Search } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";
import { lookupItems } from "@/features/comparison/server";

import { answerOf, lookupItemFor, type FinderAnswer, type NameFinder as Finder } from "./nameFinders";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function NameFinder({
  finder,
  organizationId,
  page,
  onPage,
}: {
  finder: Finder;
  organizationId: string;
  /** The page in use now (the form's link value), if any. */
  page: string | null;
  onPage: (page: string | null) => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<FinderAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    const item = lookupItemFor(finder, typed);
    if (!item || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await lookupItems(finder.kind, [item], { organizationId });
      const a = answerOf(finder, res.items[0]);
      setAnswer(a);
      onPage(a.status === "found" ? a.page : null);
    } catch (err) {
      const e = err as { userMessage?: string; message?: string };
      setError(e.userMessage ?? e.message ?? "The lookup did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const found = answer?.status === "found" && page === answer.page ? answer : null;
  return (
    <div className="flex flex-col gap-2" data-name-finder={finder.kind}>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{finder.label}</span>
        <div className="flex items-center gap-2">
          <ProInput
            className="flex-1"
            value={typed}
            placeholder={`e.g. ${finder.example}`}
            enableCleanup={false}
            onChange={(e) => {
              setTyped(e.target.value);
              if (answer) {
                setAnswer(null);
                onPage(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void find();
              }
            }}
            aria-label={finder.label}
            data-field="name"
          />
          <Button type="button" variant="outline" icon={<Search className="h-4 w-4" />} disabled={!lookupItemFor(finder, typed) || busy} onClick={() => void find()}>
            {busy ? "Finding" : "Find"}
          </Button>
        </div>
      </label>
      {found && (
        <div className="flex min-w-0 items-center gap-2 text-sm" data-found-page={found.page}>
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="truncate font-medium text-foreground">{found.match.name}</span>
          <a href={found.page} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 truncate text-xs text-primary hover:underline">
            {hostOf(found.page)}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        </div>
      )}
      {answer?.status === "choose" && (
        <div className="flex flex-col gap-1" data-is-this-them="">
          <span className="text-xs font-medium text-muted-foreground">Is this them?</span>
          {answer.candidates.map((c) => (
            <Button
              key={c.page}
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setAnswer({ status: "found", match: c.match, page: c.page });
                onPage(c.page);
              }}
            >
              <span className="truncate font-medium">{c.match.name}</span>
              <span className="truncate text-muted-foreground">{hostOf(c.page)}</span>
            </Button>
          ))}
        </div>
      )}
      {answer?.status === "not_found" && <p className="text-xs text-warning">{answer.message}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

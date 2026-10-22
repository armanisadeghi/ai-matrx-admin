"use client";

import Link from "next/link";
import { Loader2, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { ReadFailure } from "@ai-matrx/design-system";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTreeError, selectTreeStatus } from "@/features/scopes/redux/selectors/tree";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import { isUuidShape } from "@ai-matrx/kit/uuid";

/**
 * Scope types, scopes and context items are rows of `custom.record` (same ids since the move off
 * `context.*`), so the platform answers for them as `record` — in Trash with a Restore, missing,
 * or denied. Asking as `scope_type` named a dropped table and read "We couldn't work out what
 * happened" (walk-core 2026-10-18).
 */
const SCOPE_ROWS_TOKEN = "record";

interface ScopeNotFoundProps {
  /** Which scope record the route segment addresses (the gate asks as `record`; see above). */
  token: "scope_type" | "scope" | "context_item";
  /** The raw slug-or-id route segment that failed to resolve. */
  param: string;
  /** Lowercase noun for the sentence — "scope type", "context item", a type's label. */
  entityLabel: string;
  backHref: string;
  backLabel: string;
}

/**
 * Shown when a slug/id route segment resolves to nothing AFTER the relevant
 * data has loaded — replaces an endless spinner for mistyped scope URLs.
 *
 * A uuid param names a real record we could not read, so the platform answers
 * (`<AccessGate>`): denied, deleted, missing, or signed out. A slug param that
 * didn't match the loaded list is an address we cannot ask about, so we say
 * exactly that and never upgrade it to "doesn't exist" or "no permission".
 */
export function ScopeNotFound({
  param,
  entityLabel,
  backHref,
  backLabel,
}: ScopeNotFoundProps) {
  const dispatch = useAppDispatch();
  const treeStatus = useAppSelector(selectTreeStatus);
  const treeError = useAppSelector(selectTreeError);
  // A SLUG IS ONLY "NOT A MATCH" AGAINST A TREE THAT LOADED (lane SCOPES-READ-SWITCH-VALIDATE, 2026-09-30).
  // Every caller shows this once the tree has SETTLED — and a failed load settles too. On the store read
  // path a slow or refused tree read put "This address doesn't match a scope type you can open" on the
  // Matters page of the firm's own owner. A failed read is said as a failure, with its retry; a read still
  // in flight is a wait. Only a tree that answered can say the address matched nothing.
  if (treeError) {
    return (
      <div className="py-12">
        <ReadFailure
          error={treeError}
          what="your scopes"
          onRetry={() => void dispatch(ensureScopeTree({ refresh: true }))}
        />
      </div>
    );
  }
  if (treeStatus === "idle" || treeStatus === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground" role="status" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your scopes…
      </div>
    );
  }
  if (isUuidShape(param)) {
    return (
      <AccessGate
        token={SCOPE_ROWS_TOKEN}
        id={param}
        fallbackHref={backHref}
        fallbackLabel={backLabel}
      />
    );
  }

  const article = /^[aeiou]/i.test(entityLabel) ? "an" : "a";
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
          <SearchX className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-5">
          This address doesn&apos;t match {article} {entityLabel} you can open
        </h2>
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </Card>
    </div>
  );
}

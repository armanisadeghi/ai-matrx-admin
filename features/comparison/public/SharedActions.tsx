"use client";

/**
 * The two actions on a shared comparison: copy its address, and (signed in) Refresh — re-fetch every
 * number now. Refresh starts a fresh run in the
 * person's own organization on their own points and hands it to /compare, which follows it to its end.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, RefreshCw } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { toast } from "@/lib/toast";
import { useComparisonOrganizationId } from "../hooks";
import { runComparison } from "../server";
import { ComparisonRefusal, type ComparisonItemInput } from "../contract";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the link");
    }
  }
  return (
    <Button variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} onClick={() => void copy()}>
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export function RefreshButton({ kind, items }: { kind: string; items: ComparisonItemInput[] }) {
  const router = useRouter();
  const organizationId = useComparisonOrganizationId();
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  if (items.length < 2) return null;

  async function refresh() {
    if (!organizationId) return;
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      // the run id is the stream's first event; the run carries on server-side, /compare follows it
      await new Promise<void>((resolve, reject) => {
        runComparison(kind, items, {
          organizationId,
          signal: ctrl.signal,
          onRunId: (runId) => {
            router.push(`/compare?run=${encodeURIComponent(runId)}`);
            resolve();
          },
        }).then(() => resolve(), reject);
      });
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(err instanceof ComparisonRefusal ? err.userMessage : "The refresh could not start");
      setBusy(false);
    }
  }

  return (
    <Button variant="primary" disabled={busy || !organizationId} icon={<RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />} onClick={() => void refresh()}>
      Refresh
    </Button>
  );
}

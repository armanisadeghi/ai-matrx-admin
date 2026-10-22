"use client";

/**
 * Share on the signed-in result: publishes this finished run at its own public address (the run id is
 * in the page address as ?run=). Idempotent on the server, so reopening a shared run shows the same link.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Share2 } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { copyText } from "@ai-matrx/kit/clipboard";

import type { OperationDescriptor } from "@ai-matrx/api";

import { callOptionsFrom, serverApi } from "@/lib/api/server-api";
import { toast } from "@/lib/toast";

import { useComparisonOrganizationId } from "../hooks";
import { CopyLinkButton } from "./SharedActions";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

// Hand-declared until `@ai-matrx/api/data` generates the share operations; they ride the ONE client.
const SHARE_OP: OperationDescriptor = {
  m: "GET",
  p: "/comparison/runs/{run_id}/share",
  d: "aidream",
  a: "user",
  o: "required",
  n: "data.get_run_share",
};
const SHARE_CREATE_OP: OperationDescriptor = { ...SHARE_OP, m: "POST", n: "data.create_run_share" };
const SHARE_STOP_OP: OperationDescriptor = { ...SHARE_OP, m: "DELETE", n: "data.stop_run_share" };

interface ShareLink {
  slug: string;
  path: string;
}

function asLink(v: unknown): ShareLink | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return typeof o.slug === "string" && typeof o.path === "string" ? { slug: o.slug, path: o.path } : null;
}

export function ShareButton() {
  const runId = useSearchParams().get("run");
  const organizationId = useComparisonOrganizationId();
  const [link, setLink] = useState<ShareLink | null>(null);
  const [busy, setBusy] = useState(false);
  const base = runId ? { run_id: runId } : null;

  useEffect(() => {
    setLink(null);
    if (!base || !organizationId) return;
    const ctrl = new AbortController();
    serverApi.call<unknown>(SHARE_OP, { path: base }, callOptionsFrom({ organizationId, signal: ctrl.signal, captureErrors: false }))
      .then((data) => setLink(asLink(data)))
      .catch(() => undefined); // not shared yet, or not readable: the button simply offers Share
    return () => ctrl.abort();
  }, [base, organizationId]);

  if (!base || !organizationId) return null;

  async function share() {
    setBusy(true);
    try {
      const data = await serverApi.call<unknown>(SHARE_CREATE_OP, { path: base!, body: {} }, { organizationId: organizationId! });
      const made = asLink(data);
      if (!made) throw new Error("no link");
      setLink(made);
      await copyText(`${window.location.origin}${made.path}`, { successMessage: "Link copied" });
    } catch {
      toast.error("Could not share this comparison");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await serverApi.call<unknown>(SHARE_STOP_OP, { path: base! }, { organizationId: organizationId! });
      setLink(null);
    } catch {
      toast.error("Could not stop sharing");
    } finally {
      setBusy(false);
    }
  }

  if (!link) {
    // Share is always the glyph alone (Arman, 2026-10-22); the word rides the tooltip and the name.
    return <Button variant="outline" disabled={busy} icon={<Share2 />} onClick={() => void share()} aria-label="Share" title="Share" />;
  }
  return (
    <>
      <CopyLinkButton path={link.path} />
      <Button variant="outline" asChild>
        <OutboundLink href={link.path}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open
        </OutboundLink>
      </Button>
      <Button variant="quiet" disabled={busy} onClick={() => void stop()}>Stop sharing</Button>
    </>
  );
}

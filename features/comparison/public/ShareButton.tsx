"use client";

/**
 * Share on the signed-in result: publishes this finished run at its own public address (the run id is
 * in the page address as ?run=). Idempotent on the server, so reopening a shared run shows the same link.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Share2 } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { del, getJson, postJson } from "@/lib/python-client";
import { toast } from "@/lib/toast";

import { useComparisonOrganizationId } from "../hooks";
import { CopyLinkButton } from "./SharedActions";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

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
  const base = runId ? `/comparison/runs/${encodeURIComponent(runId)}/share` : null;

  useEffect(() => {
    setLink(null);
    if (!base || !organizationId) return;
    const ctrl = new AbortController();
    getJson<unknown>(base, { organizationId, signal: ctrl.signal, captureErrors: false })
      .then(({ data }) => setLink(asLink(data)))
      .catch(() => undefined); // not shared yet, or not readable: the button simply offers Share
    return () => ctrl.abort();
  }, [base, organizationId]);

  if (!base || !organizationId) return null;

  async function share() {
    setBusy(true);
    try {
      const { data } = await postJson<unknown>(base!, {}, { organizationId: organizationId! });
      const made = asLink(data);
      if (!made) throw new Error("no link");
      setLink(made);
      await navigator.clipboard.writeText(`${window.location.origin}${made.path}`).catch(() => undefined);
      toast.success("Link copied");
    } catch {
      toast.error("Could not share this comparison");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await del(base!, { organizationId: organizationId! });
      setLink(null);
    } catch {
      toast.error("Could not stop sharing");
    } finally {
      setBusy(false);
    }
  }

  if (!link) {
    return <Button variant="outline" disabled={busy} icon={<Share2 className="h-4 w-4" />} onClick={() => void share()}>Share</Button>;
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

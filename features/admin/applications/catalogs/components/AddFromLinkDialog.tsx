"use client";

// features/admin/applications/catalogs/components/AddFromLinkDialog.tsx
//
// Catalogs page "Add from link": THE shared discovery view (<ModelDiscovery> from
// @ai-matrx/agents/models/react) — search by kind or paste a link, and the system finds the versions
// that work: every version judged with plain reasons and one Recommended. Nobody picks a file;
// choosing a version promotes it (all of its files) into the model catalog through the one
// discovery engine (features/ai-models/discovery/discovery-port.ts).
//
// Every link goes to that one engine: Hugging Face, Civitai (LoRAs, checkpoints, embeddings) and
// direct file links. The view runs in "catalog" mode: every version can be added, and each row names
// the runtime that runs it (or says Matrx 2 has none yet) — what runs is per runtime and per device,
// never a gate on the catalog.
//
// Kinds that are not models the view promotes (voices, voice model files, presets, ...) fill the entry
// editor from ONE file at a link, read by the same engine (link-prefill.ts → /ai-catalog/discover/probe).

import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { ModelDiscovery } from "@ai-matrx/agents/models/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { createAdminDiscoveryPort } from "@/features/ai-models/discovery/discovery-port";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { kindLabel } from "@/features/admin/applications/catalogs/schemas";
import { MODEL_KINDS, prefillFromLink, readLinkFile } from "@/features/admin/applications/catalogs/link-prefill";
import type { EntryPrefill } from "@/features/admin/applications/catalogs/types";

interface AddFromLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kind of the table the dialog was opened from. Model kinds (or none) open the discovery view; others fill from a link. */
  defaultKind?: string | null;
  /** Fill-from-link hands its prefill to the parent, which opens the entry editor. */
  onPick: (prefill: EntryPrefill) => void;
}

export function AddFromLinkDialog({ open, onOpenChange, defaultKind, onPick }: AddFromLinkDialogProps) {
  const accessToken = useAppSelector(selectAccessToken) ?? null;
  const baseUrl = useAppSelector(selectResolvedBaseUrl) ?? null;
  const organizationId = useServerOrganizationId();
  const port = useMemo(
    () => createAdminDiscoveryPort({ accessToken, baseUrl, organizationId }),
    [accessToken, baseUrl, organizationId],
  );
  const fileKind = defaultKind && !MODEL_KINDS.has(defaultKind) ? defaultKind : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" /> {fileKind ? `Add ${kindLabel(fileKind)} from link` : "Add a model"}
          </DialogTitle>
          <DialogDescription>
            {fileKind ? "Paste a link to one file. We fill the entry from it." : "Search or paste a link. We find the versions that work."}
          </DialogDescription>
        </DialogHeader>
        {!open ? null : fileKind ? (
          <FillFromLink
            kind={fileKind}
            auth={{ accessToken, baseUrl, organizationId }}
            onPick={(prefill) => {
              onPick(prefill);
              onOpenChange(false);
            }}
          />
        ) : (
          <ModelDiscovery port={port} chooseLabel="Add this version" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FillFromLink({
  kind,
  auth,
  onPick,
}: {
  kind: string;
  auth: { accessToken: string | null; baseUrl: string | null; organizationId: string | null };
  onPick: (prefill: EntryPrefill) => void;
}) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    const trimmed = link.trim();
    if (!trimmed) return;
    if (!auth.baseUrl || !auth.accessToken || !auth.organizationId) {
      setError("Sign in and choose an organization first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const file = await readLinkFile({ baseUrl: auth.baseUrl, accessToken: auth.accessToken, organizationId: auth.organizationId, link: trimmed });
      onPick(prefillFromLink(kind, file, trimmed));
    } catch (err) {
      const detail = (err as { detail?: { message?: unknown } } | null)?.detail;
      setError(typeof detail?.message === "string" ? detail.message : err instanceof Error ? err.message : "That link could not be read.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="fill-from-link">
      <Label htmlFor="fill-from-link-url">File link</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          mono
          id="fill-from-link-url"
          aria-label="File link"
          placeholder="https://huggingface.co/…/resolve/main/<file>"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void read();
            }
          }}
        />
        <Button type="button" variant="primary" disabled={busy || !link.trim()} onClick={() => void read()}>
          {busy ? "Reading…" : "Fill the entry"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

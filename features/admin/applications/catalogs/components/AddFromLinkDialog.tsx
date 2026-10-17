"use client";

// features/admin/applications/catalogs/components/AddFromLinkDialog.tsx
//
// Catalogs page "Add from link": THE shared discovery view (<ModelDiscovery> from
// @ai-matrx/agents/models/react) — search by kind or paste a link, and the system finds the versions
// that work: every version judged with plain reasons and one Recommended. Nobody picks a file;
// choosing a version promotes it (all of its files) into the model catalog through the one
// discovery engine (features/ai-models/discovery/discovery-port.ts).
//
// STAND-IN, said on screen: sources and kinds the engine does not cover yet (Civitai, direct file
// URLs, and non-model kinds such as LoRAs, voices and presets) go to the OLDER link reader
// (OlderLinkReader + resolveCatalogLink) with a visible line naming it. Remove the fallback when
// the engine covers them.

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
import { kindLabel } from "@/features/admin/applications/catalogs/schemas";
import type { EntryPrefill } from "@/features/admin/applications/catalogs/types";
import { OlderLinkReader } from "./OlderLinkReader";

/** The catalog kinds the one discovery engine covers (GGUF language/vision models and Whisper). */
export const ENGINE_KINDS: ReadonlySet<string> = new Set(["llm_model", "whisper_model"]);

/** A link the engine reads: a huggingface.co URL, or the bare `owner/name` form. */
export function isEngineLink(link: string): boolean {
  const t = link.trim();
  if (/^[\w.-]+\/[\w.-]+$/.test(t)) return true;
  try {
    const host = new URL(t).hostname.toLowerCase();
    return host === "huggingface.co" || host === "hf.co" || host.endsWith(".huggingface.co");
  } catch {
    return false;
  }
}

/** The words for a source the older reader handles. */
export function olderSourceName(link: string): string {
  try {
    const host = new URL(link.trim()).hostname.toLowerCase();
    if (host.endsWith("civitai.com")) return "Civitai";
  } catch {
    /* not a URL */
  }
  return "direct file";
}

interface AddFromLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kind of the table the dialog was opened from. */
  defaultKind?: string | null;
  /** The older reader hands its reviewed prefill to the parent, which opens the entry editor. */
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
  const [olderUrl, setOlderUrl] = useState<string | null>(null);
  const kindOutsideEngine = Boolean(defaultKind) && !ENGINE_KINDS.has(defaultKind as string);

  const close = () => {
    setOlderUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setOlderUrl(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" /> {kindOutsideEngine ? "Add from link" : "Add a model"}
          </DialogTitle>
          <DialogDescription>
            {kindOutsideEngine ? "Paste a link to suggest an entry." : "Search or paste a link. We find the versions that work."}
          </DialogDescription>
        </DialogHeader>
        {!open ? null : kindOutsideEngine ? (
          <>
            <p className="text-sm text-muted-foreground" data-testid="older-reader-notice">
              Using the older link reader for {kindLabel(defaultKind as string)} links
            </p>
            <OlderLinkReader defaultKind={defaultKind ?? null} onPick={onPick} onDone={close} />
          </>
        ) : (
          <>
            <ModelDiscovery
              port={port}
              chooseLabel="Add this version"
              interceptLink={(link) => {
                if (isEngineLink(link)) {
                  setOlderUrl(null);
                  return false;
                }
                setOlderUrl(link);
                return true;
              }}
            />
            {olderUrl ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="older-reader-notice">
                  Using the older link reader for {olderSourceName(olderUrl)} links
                </p>
                <OlderLinkReader key={olderUrl} initialUrl={olderUrl} defaultKind={defaultKind ?? null} onPick={onPick} onDone={close} />
              </>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

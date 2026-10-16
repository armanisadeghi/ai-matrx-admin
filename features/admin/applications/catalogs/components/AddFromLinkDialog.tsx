"use client";

// features/admin/applications/catalogs/components/AddFromLinkDialog.tsx
//
// Catalogs page "Add from link": THE shared discovery view (<ModelDiscovery> from
// @ai-matrx/agents/models/react) — search by kind or paste a link, and the system finds the versions
// that work: every version judged with plain reasons and one Recommended. Nobody picks a file;
// choosing a version promotes it (all of its files) into the model catalog through the one
// discovery engine (features/ai-models/discovery/discovery-port.ts). The old catalog-entry
// resolver is no longer called for models.

import { useMemo } from "react";
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

interface AddFromLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFromLinkDialog({ open, onOpenChange }: AddFromLinkDialogProps) {
  const accessToken = useAppSelector(selectAccessToken) ?? null;
  const baseUrl = useAppSelector(selectResolvedBaseUrl) ?? null;
  const organizationId = useServerOrganizationId();
  const port = useMemo(
    () => createAdminDiscoveryPort({ accessToken, baseUrl, organizationId }),
    [accessToken, baseUrl, organizationId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" /> Add a model
          </DialogTitle>
          <DialogDescription>
            Search or paste a link. We find the versions that work.
          </DialogDescription>
        </DialogHeader>
        {open ? <ModelDiscovery port={port} chooseLabel="Add this version" /> : null}
      </DialogContent>
    </Dialog>
  );
}

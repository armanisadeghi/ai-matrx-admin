/**
 * features/files/components/core/ShareLinkDialog/ShareLinkDialog.tsx
 *
 * Manage share links for a file or folder. List active links, create new
 * ones (with expiry + max uses + permission level), copy URL to clipboard,
 * and deactivate.
 *
 * Desktop-only — mobile surfaces must wrap the same body in a Drawer
 * instead. The inner content is rendered by ShareLinkDialogBody which is
 * surface-agnostic.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectActiveShareLinksForResource } from "../../../redux/selectors";
import {
  createShareLink,
  deactivateShareLink,
  loadShareLinks,
} from "../../../redux/thunks";
import { formatAbsoluteDate } from "../../../utils/format";
import type { ResourceType } from "../../../types";

export interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  resourceType: ResourceType;
  /** Base URL for building the copyable URL. Defaults to window.location.origin. */
  appOrigin?: string;
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  resourceId,
  resourceType,
  appOrigin,
}: ShareLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Anyone with the link will be able to {resourceType === "folder" ? "view the folder" : "access this file"}.
          </DialogDescription>
        </DialogHeader>
        <ShareLinkDialogBody
          resourceId={resourceId}
          resourceType={resourceType}
          appOrigin={appOrigin}
        />
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Body — pure content, no Dialog chrome. Reused by DrawerShell on mobile.
// ---------------------------------------------------------------------------

interface ShareLinkDialogBodyProps {
  resourceId: string;
  resourceType: ResourceType;
  appOrigin?: string;
}

export function ShareLinkDialogBody({
  resourceId,
  resourceType,
  appOrigin,
}: ShareLinkDialogBodyProps) {
  const dispatch = useAppDispatch();
  const links = useAppSelector((s) =>
    selectActiveShareLinksForResource(s, resourceId),
  );
  const [creating, setCreating] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<"read" | "write">(
    "read",
  );
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(loadShareLinks({ resourceId }));
  }, [dispatch, resourceId]);

  const buildUrl = useCallback(
    (token: string) => {
      const base =
        appOrigin ??
        (typeof window !== "undefined" ? window.location.origin : "");
      return `${base}/share/${token}`;
    },
    [appOrigin],
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      await dispatch(
        createShareLink({
          resourceId,
          resourceType,
          permissionLevel,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
        }),
      ).unwrap();
      setExpiresAt("");
      setMaxUses("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [dispatch, resourceId, resourceType, permissionLevel, expiresAt, maxUses]);

  const handleCopy = useCallback(
    async (token: string) => {
      const url = buildUrl(token);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          setCopiedToken(token);
          setTimeout(() => setCopiedToken(null), 1500);
        } catch {
          /* ignore */
        }
      }
    },
    [buildUrl],
  );

  const handleDeactivate = useCallback(
    async (token: string) => {
      await dispatch(deactivateShareLink({ shareToken: token })).unwrap();
    },
    [dispatch],
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Create new link form */}
      <div className="rounded-md border p-3 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link className="h-4 w-4" />
          Create new link
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Permission</span>
            <select
              value={permissionLevel}
              onChange={(e) =>
                setPermissionLevel(e.target.value as "read" | "write")
              }
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value="read">Read only</option>
              <option value="write">Read + write</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              Expires (optional)
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">
              Max uses (optional)
            </span>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
              style={{ fontSize: "16px" }}
            />
          </label>
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link className="h-4 w-4" />
          )}
          Create link
        </button>
      </div>

      {/* Existing links */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active links
        </h3>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No active links yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => {
              const url = buildUrl(link.shareToken);
              const copied = copiedToken === link.shareToken;
              return (
                <li
                  key={link.id}
                  className="flex items-start gap-2 rounded-md border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate">{url}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground space-x-2">
                      <span className="uppercase">
                        {link.permissionLevel}
                      </span>
                      {link.expiresAt ? (
                        <span>
                          · Expires {formatAbsoluteDate(link.expiresAt)}
                        </span>
                      ) : null}
                      {link.maxUses ? (
                        <span>
                          · {link.useCount}/{link.maxUses} uses
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(link.shareToken)}
                    aria-label="Copy link"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded hover:bg-accent",
                      copied && "text-emerald-500",
                    )}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeactivate(link.shareToken)}
                    aria-label="Deactivate link"
                    className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

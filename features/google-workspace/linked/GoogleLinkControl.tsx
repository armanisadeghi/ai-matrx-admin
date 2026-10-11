"use client";

/**
 * The Google button in a workbook's or document's toolbar: create the linked
 * Google file, then Open / Update from Google / Push to Google / Unlink.
 *
 * "Both sides changed" never overwrites quietly: Update and Push each check,
 * and a person picks which side wins in one dialog. A write the organization
 * routes to review says so, with the approval link — never "done".
 */

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Loader2, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorSentence, toast } from "@/lib/toast";
import { approvalQueueHref, SENT_FOR_APPROVAL_MESSAGE } from "@/features/google-workspace/service";

import { GoogleDocsMark, GoogleSheetsMark } from "./marks";
import {
  readGoogleLink,
  writeGoogleLink,
  writePendingGoogleLink,
  type GoogleFileLink,
  type LinkedRecordKind,
} from "./link-store";
import { completePendingLink } from "./pending-link";
import {
  createDocFromMarkdown,
  createSheetFromWorkbook,
  pushMarkdownToDoc,
  pushWorkbookToSheet,
  readDocAsMarkdown,
  readSheetAsWorkbook,
  type GoogleRemoteVersion,
} from "./linkedService";
import { useGoogleWorkspaceConnection } from "./useGoogleWorkspaceConnection";

/** What a host editor lends the control. Content is a workbook snapshot or markdown. */
export interface GoogleLinkAdapter {
  recordKind: LinkedRecordKind;
  recordId: string;
  title: string;
  /** The live content right now. */
  readLocal: () => unknown;
  /** Put Google's content into the editor and save it; returns the new snapshot id. */
  applyRemote: (content: unknown) => Promise<string | null>;
  /** The newest saved snapshot id (what "changed here since the last sync" compares). */
  latestLocalSnapshotId: () => Promise<string | null>;
}

type Conflict = { from: "update" | "push"; remote: GoogleRemoteVersion; remoteContent?: unknown };

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * What the person wrote, hashed: a workbook's tabs, cells and styles (never the
 * plugin state Univer re-saves on every open), or a document's markdown.
 */
export async function contentFingerprint(content: unknown): Promise<string> {
  const basis =
    typeof content === "string"
      ? content
      : (() => {
          const wb = (content ?? {}) as Record<string, unknown>;
          return stableJson({ sheetOrder: wb.sheetOrder, sheets: wb.sheets, styles: wb.styles });
        })();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(basis));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function GoogleLinkControl({ adapter, editable }: { adapter: GoogleLinkAdapter; editable: boolean }) {
  const isSheet = adapter.recordKind === "workbook";
  const appName = isSheet ? "Google Sheets" : "Google Docs";
  const Mark = isSheet ? GoogleSheetsMark : GoogleDocsMark;
  const { state, connect } = useGoogleWorkspaceConnection();
  const [link, setLink] = useState<GoogleFileLink | null | undefined>(undefined);
  const [busy, setBusy] = useState<null | "create" | "update" | "push" | "unlink">(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  useEffect(() => {
    let live = true;
    void readGoogleLink(adapter.recordKind, adapter.recordId).then((res) => {
      if (!live) return;
      if (res.ok) {
        setLink(res.link);
        // A create that went through an approval: save the link once it is applied.
        if (!res.link) {
          void completePendingLink(adapter.recordKind, adapter.recordId)
            .then((outcome) => {
              if (!live || outcome.state !== "linked") return;
              setLink(outcome.link);
              toast.success(`Linked to ${adapter.recordKind === "workbook" ? "Google Sheets" : "Google Docs"}`);
            })
            .catch((error: unknown) => toast.error(errorSentence(error)));
        }
      } else {
        setLink(null);
        toast.error(`Could not read this item's Google link: ${res.error}`);
      }
    });
    return () => {
      live = false;
    };
  }, [adapter.recordKind, adapter.recordId]);

  // An imported record's first open: what the editor shows IS Google's content,
  // so its fingerprint is the baseline "changed here since?" compares against.
  useEffect(() => {
    if (!link?.baselineOnOpen) return;
    let live = true;
    let tries = 0;
    const attempt = async () => {
      if (!live) return;
      let content: unknown;
      try {
        content = adapter.readLocal();
      } catch {
        if (++tries < 20) window.setTimeout(() => void attempt(), 500);
        return;
      }
      const next: GoogleFileLink = { ...link, baselineOnOpen: false, localFingerprint: await contentFingerprint(content) };
      const res = await writeGoogleLink(adapter.recordKind, adapter.recordId, next);
      if (!live) return;
      if (res.ok) setLink(next);
      else toast.error(`Could not save this item's Google link: ${res.error}`);
    };
    void attempt();
    return () => {
      live = false;
    };
  }, [link?.baselineOnOpen, link?.fileId]);

  const saveLink = async (next: GoogleFileLink | null) => {
    const res = await writeGoogleLink(adapter.recordKind, adapter.recordId, next);
    if (!res.ok) throw new Error(res.error);
    setLink(next);
  };

  const proposed = (assistId: string) =>
    toast.info(SENT_FOR_APPROVAL_MESSAGE, {
      action: { label: "Open", onClick: () => window.open(approvalQueueHref(assistId), "_blank") },
    });

  const openInGoogle = (href: string | null) => {
    if (href) window.open(href, "_blank", "noopener");
  };

  const run = async (kind: NonNullable<typeof busy>, work: () => Promise<void>) => {
    setBusy(kind);
    try {
      await work();
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      setBusy(null);
    }
  };

  const create = () =>
    run("create", async () => {
      if (state.status !== "ready") return;
      const content = adapter.readLocal();
      const outcome = isSheet
        ? await createSheetFromWorkbook(state.connection.connectionId, adapter.title, content)
        : await createDocFromMarkdown(state.connection.connectionId, adapter.title, String(content ?? ""));
      if (outcome.proposed) {
        // Remember WHICH approval makes the file, so approving it also saves the link.
        const queued = await writePendingGoogleLink(adapter.recordKind, adapter.recordId, {
          assistId: outcome.assistId,
          kind: isSheet ? "google_sheet" : "google_doc",
          connectionId: state.connection.connectionId,
          name: adapter.title,
          queuedAt: new Date().toISOString(),
          localFingerprint: await contentFingerprint(content),
          localSnapshotId: await adapter.latestLocalSnapshotId(),
        });
        if (!queued.ok) throw new Error(queued.error);
        proposed(outcome.assistId);
        return;
      }
      const { file, remote, notes } = outcome.result;
      const now = new Date().toISOString();
      await saveLink({
        kind: isSheet ? "google_sheet" : "google_doc",
        connectionId: state.connection.connectionId,
        fileId: file.fileId,
        name: file.name,
        webViewLink: file.webViewLink ?? remote.webViewLink,
        recordId: file.recordId,
        linkedAt: now,
        lastSyncedAt: now,
        remoteVersion: remote.version,
        localSnapshotId: await adapter.latestLocalSnapshotId(),
        localFingerprint: await contentFingerprint(content),
        lastDirection: "to_google",
      });
      toast.success(`Created in ${appName}`, {
        description: notes.join(" ") || undefined,
        action: { label: "Open", onClick: () => openInGoogle(file.webViewLink) },
      });
    });

  const applyFromGoogle = async (current: GoogleFileLink, content: unknown, remote: GoogleRemoteVersion) => {
    const snapshotId = await adapter.applyRemote(content);
    await saveLink({
      ...current,
      name: remote.name ?? current.name,
      webViewLink: remote.webViewLink ?? current.webViewLink,
      lastSyncedAt: new Date().toISOString(),
      remoteVersion: remote.version,
      localSnapshotId: snapshotId,
      localFingerprint: await contentFingerprint(adapter.readLocal()),
      baselineOnOpen: false,
      lastDirection: "from_google",
    });
    toast.success(`Updated from ${appName}`);
  };

  const update = () =>
    run("update", async () => {
      if (!link) return;
      const read = isSheet
        ? await readSheetAsWorkbook(link.connectionId, link.fileId, adapter.recordId).then((r) => ({ content: r.workbook as unknown, remote: r.remote }))
        : await readDocAsMarkdown(link.connectionId, link.fileId).then((r) => ({ content: r.markdown as unknown, remote: r.remote }));
      const remoteChanged = read.remote.version !== link.remoteVersion;
      const localChanged = link.localFingerprint
        ? (await contentFingerprint(adapter.readLocal())) !== link.localFingerprint
        : (await adapter.latestLocalSnapshotId()) !== link.localSnapshotId;
      if (!remoteChanged) {
        toast.info(`Already up to date with ${appName}`);
        return;
      }
      if (localChanged) {
        setConflict({ from: "update", remote: read.remote, remoteContent: read.content });
        return;
      }
      await applyFromGoogle(link, read.content, read.remote);
    });

  const push = (force: boolean) =>
    run("push", async () => {
      if (!link) return;
      const content = adapter.readLocal();
      const outcome = isSheet
        ? await pushWorkbookToSheet(link.connectionId, link.fileId, content, link.remoteVersion, force)
        : { proposed: false as const, result: await pushMarkdownToDoc(link.connectionId, link.fileId, String(content ?? ""), link.remoteVersion, force) };
      if (outcome.proposed) {
        proposed(outcome.assistId);
        return;
      }
      const { status, remote, notes } = outcome.result;
      if (status === "conflict") {
        setConflict({ from: "push", remote });
        return;
      }
      await saveLink({
        ...link,
        lastSyncedAt: new Date().toISOString(),
        remoteVersion: remote.version,
        localSnapshotId: await adapter.latestLocalSnapshotId(),
        localFingerprint: await contentFingerprint(content),
        baselineOnOpen: false,
        lastDirection: "to_google",
      });
      toast.success(`Pushed to ${appName}`, { description: notes.join(" ") || undefined });
    });

  const unlink = () =>
    run("unlink", async () => {
      await saveLink(null);
      toast.success(`Unlinked from ${appName}`);
    });

  const takeGoogle = () => {
    const c = conflict;
    setConflict(null);
    if (!c || !link) return;
    void run("update", async () => {
      const content =
        c.remoteContent ??
        (isSheet
          ? (await readSheetAsWorkbook(link.connectionId, link.fileId, adapter.recordId)).workbook
          : (await readDocAsMarkdown(link.connectionId, link.fileId)).markdown);
      await applyFromGoogle(link, content, c.remote);
    });
  };

  const keepMine = () => {
    setConflict(null);
    void push(true);
  };

  if (link === undefined || state.status === "loading") return null;

  const trigger = (
    <Button
      variant="quiet"
      title={link ? `Linked to ${appName}` : `${appName}`}
      disabled={busy !== null}
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Mark className="size-3.5" />}
      {link && <span className="hidden md:inline">Linked</span>}
    </Button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {state.status !== "ready" ? (
            <DropdownMenuItem onSelect={() => connect(`to link this ${adapter.recordKind} with ${appName}`)}>
              <Mark className="size-4" />
              Connect Google
            </DropdownMenuItem>
          ) : !link ? (
            <DropdownMenuItem onSelect={() => void create()}>
              <Mark className="size-4" />
              {isSheet ? "Create Google Sheet" : "Create Google Doc"}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground" title={link.name}>
                {link.name} · synced {timeAgo(link.lastSyncedAt)}
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => openInGoogle(link.webViewLink)}>
                <ExternalLink className="size-4" />
                Open in {appName}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editable} onSelect={() => void update()}>
                <ArrowDownToLine className="size-4" />
                Update from Google
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void push(false)}>
                <ArrowUpFromLine className="size-4" />
                Push to Google
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!editable} onSelect={() => void unlink()}>
                <Unlink className="size-4" />
                Unlink
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changed in both places</DialogTitle>
            <DialogDescription>
              {`This ${adapter.recordKind} and the Google file both changed since the last sync. Keep which one?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConflict(null)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={takeGoogle} disabled={!editable}>
              <ArrowDownToLine className="size-4" />
              Use Google&apos;s
            </Button>
            <Button onClick={keepMine}>
              <ArrowUpFromLine className="size-4" />
              Keep mine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

/**
 * The Google button in a workbook's or document's toolbar: create the linked
 * Google file, then Open / Update from Google / Push to Google / Unlink.
 *
 * "Both sides changed" never overwrites quietly: Update and Push each check,
 * and a person picks which side wins in one dialog. A write the organization
 * routes to review says so, with the approval link — never "done".
 */

import { formatRelativeTime } from "@ai-matrx/kit/format";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorSentence, toast } from "@/lib/toast";
import { approvalQueueHref, SENT_FOR_APPROVAL_MESSAGE } from "@/features/google-workspace/service";

import { GoogleDocsMark, GoogleSheetsMark, GoogleSlidesMark } from "./marks";
import { GoogleG } from "@/components/icons/google-brand";
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
  createSlidesFromPptx,
  pushMarkdownToDoc,
  pushPptxToSlides,
  pushWorkbookToSheet,
  readDocAsMarkdown,
  readSheetAsWorkbook,
  type GoogleRemoteVersion,
} from "./linkedService";
import { conflictCopy, decideUpdate } from "./sync-decision";
import { googleImageNote, googleReadyMarkdown } from "./doc-images";
import { documentNameFrom, isPlaceholderName } from "./importers";
import { renameDocument } from "@/features/documents/document-service";
import { useGoogleWorkspaceConnection } from "./useGoogleWorkspaceConnection";

/** What a host editor lends the control. Content is a workbook snapshot or markdown. */
export interface GoogleLinkAdapter {
  recordKind: LinkedRecordKind;
  recordId: string;
  title: string;
  /** The content right now (an editor's live content, or a list row's latest saved snapshot). */
  readLocal: () => unknown | Promise<unknown>;
  /** Put Google's content into the editor and save it; returns the new snapshot id. */
  applyRemote: (content: unknown) => Promise<string | null>;
  /** The newest saved snapshot id (what "changed here since the last sync" compares). */
  latestLocalSnapshotId: () => Promise<string | null>;
  /** Presentations only: the content as a base64 .pptx (Google Slides is created by uploading one). */
  toGoogleFile?: (content: unknown) => Promise<string>;
}

/** Everything that differs between the three linkable kinds, in one place. */
const KIND_CONFIG = {
  workbook: { appName: "Google Sheets", linkKind: "google_sheet", createLabel: "Create Google Sheet", Mark: GoogleSheetsMark, remoteKind: "sheet" },
  document: { appName: "Google Docs", linkKind: "google_doc", createLabel: "Create Google Doc", Mark: GoogleDocsMark, remoteKind: "doc" },
  presentation: { appName: "Google Slides", linkKind: "google_slides", createLabel: "Create Google Slides", Mark: GoogleSlidesMark, remoteKind: "slide" },
} as const;

/** Google Slides cannot be read back into a deck, so it has no "Update from Google". */
const READ_BACK_REFUSAL = "Google Slides files cannot be read back into AI Matrx yet.";

type Conflict = {
  from: "update" | "push";
  remote: GoogleRemoteVersion;
  remoteContent?: unknown;
  /** Whether THIS side changed since the last sync: the dialog says "both" only when true. */
  localChanged: boolean;
};

// One link per record, shared by every control showing it (toolbar button, File menu, list row),
// so an action in one is never stale in another.
const linkCache = new Map<string, GoogleFileLink | null>();
const linkListeners = new Set<() => void>();
const cacheKey = (kind: LinkedRecordKind, id: string) => `${kind}:${id}`;
function publishLink(kind: LinkedRecordKind, id: string, link: GoogleFileLink | null) {
  linkCache.set(cacheKey(kind, id), link);
  linkListeners.forEach((l) => l());
}

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
          if (Array.isArray(wb.slides)) return stableJson({ slides: wb.slides, theme: wb.theme });
          return stableJson({ sheetOrder: wb.sheetOrder, sheets: wb.sheets, styles: wb.styles });
        })();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(basis));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useGoogleLink(adapter: GoogleLinkAdapter, editable: boolean, active = true) {
  const config = KIND_CONFIG[adapter.recordKind];
  const isSheet = adapter.recordKind === "workbook";
  const isSlides = adapter.recordKind === "presentation";
  const appName = config.appName;
  const { state, connect } = useGoogleWorkspaceConnection(active);
  const key = cacheKey(adapter.recordKind, adapter.recordId);
  const [loaded, setLoaded] = useState(linkCache.has(key));
  // Shared per-record link: useSyncExternalStore so every control showing it re-renders together
  // (and the compiler cannot cache a render-time read of module state). `undefined` = not read yet.
  const link = useSyncExternalStore(
    (onChange) => {
      linkListeners.add(onChange);
      return () => {
        linkListeners.delete(onChange);
      };
    },
    () => (linkCache.has(key) ? (linkCache.get(key) ?? null) : undefined),
    () => undefined,
  );
  const [busy, setBusy] = useState<null | "create" | "update" | "push" | "unlink">(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const setLink = (next: GoogleFileLink | null) => publishLink(adapter.recordKind, adapter.recordId, next);

  useEffect(() => {
    if (!active) return;
    let live = true;
    void readGoogleLink(adapter.recordKind, adapter.recordId).then((res) => {
      if (!live) return;
      if (!res.ok) {
        setLink(null);
        setLoaded(true);
        toast.error(`Could not read this item's Google link: ${res.error}`);
        return;
      }
      setLink(res.link);
      setLoaded(true);
      // An approval this record is waiting on (a create, or a push into the linked file): record it once applied.
      void completePendingLink(adapter.recordKind, adapter.recordId, res.link)
        .then((outcome) => {
          if (!live || outcome.state !== "linked") return;
          setLink(outcome.link);
          toast.success(res.link ? `Pushed to ${appName}` : `Linked to ${appName}`);
        })
        .catch((error: unknown) => toast.error(errorSentence(error)));
    });
    return () => {
      live = false;
    };
  }, [adapter.recordKind, adapter.recordId, active]);

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
        content = await adapter.readLocal();
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
    // Creating, updating and pushing take a few seconds: say so at once instead of looking like a no-op.
    const working = { create: "Creating in", update: "Updating from", push: "Pushing to", unlink: null }[kind];
    const progressId = working ? toast.loading(`${working} ${appName}…`) : null;
    try {
      await work();
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      if (progressId !== null) toast.dismiss(progressId);
      setBusy(null);
    }
  };

  const slidesFile = async (content: unknown): Promise<string> => {
    if (!adapter.toGoogleFile) throw new Error("This deck cannot be sent to Google Slides from here.");
    return adapter.toGoogleFile(content);
  };

  const create = () =>
    run("create", async () => {
      if (state.status !== "ready") return;
      const content = await adapter.readLocal();
      // Pictures ride as links Google can fetch; any left out are named in the toast.
      const ready = isSheet || isSlides ? null : await googleReadyMarkdown(String(content ?? ""));
      const outcome = isSlides
        ? await createSlidesFromPptx(state.connection.connectionId, adapter.title, await slidesFile(content))
        : isSheet
          ? await createSheetFromWorkbook(state.connection.connectionId, adapter.title, content)
          : await createDocFromMarkdown(
              state.connection.connectionId,
              documentNameFrom(adapter.title, ready?.markdown ?? ""),
              ready?.markdown ?? "",
            );
      if (outcome.proposed) {
        // Remember WHICH approval makes the file, so approving it also saves the link.
        const queued = await writePendingGoogleLink(adapter.recordKind, adapter.recordId, {
          intent: "create",
          assistId: outcome.assistId,
          kind: config.linkKind,
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
        kind: config.linkKind,
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
        description: [...(ready?.notes ?? []), ...notes].join(" ") || undefined,
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
      localFingerprint: await contentFingerprint(await adapter.readLocal()),
      baselineOnOpen: false,
      lastDirection: "from_google",
    });
    // A document still carrying a placeholder name takes the Google file's name.
    if (!isSheet && isPlaceholderName(adapter.title) && remote.name && !isPlaceholderName(remote.name)) {
      await renameDocument(adapter.recordId, remote.name);
    }
    const note = isSheet ? null : googleImageNote(String(content ?? ""));
    toast.success(`Updated from ${appName}`, { description: note ?? undefined });
  };

  const localChangedSince = async (current: GoogleFileLink, content?: unknown): Promise<boolean> =>
    current.localFingerprint
      ? (await contentFingerprint(content ?? (await adapter.readLocal()))) !== current.localFingerprint
      : (await adapter.latestLocalSnapshotId()) !== current.localSnapshotId;

  const update = () =>
    run("update", async () => {
      if (!link) return;
      if (isSlides) throw new Error(READ_BACK_REFUSAL);
      const read = isSheet
        ? await readSheetAsWorkbook(link.connectionId, link.fileId, adapter.recordId).then((r) => ({ content: r.workbook as unknown, remote: r.remote }))
        : await readDocAsMarkdown(link.connectionId, link.fileId).then((r) => ({ content: r.markdown as unknown, remote: r.remote }));
      const localChanged = await localChangedSince(link);
      const decision = decideUpdate(read.remote.version !== link.remoteVersion, localChanged);
      if (decision === "up_to_date") {
        toast.info(`Already up to date with ${appName}`);
        return;
      }
      if (decision === "conflict") {
        setConflict({ from: "update", remote: read.remote, remoteContent: read.content, localChanged });
        return;
      }
      await applyFromGoogle(link, read.content, read.remote);
    });

  const push = (force: boolean) =>
    run("push", async () => {
      if (!link) return;
      const content = await adapter.readLocal();
      const ready = isSheet || isSlides ? null : await googleReadyMarkdown(String(content ?? ""));
      const outcome = isSlides
        ? { proposed: false as const, result: await pushPptxToSlides(link.connectionId, link.fileId, await slidesFile(content)) }
        : isSheet
          ? await pushWorkbookToSheet(link.connectionId, link.fileId, content, link.remoteVersion, force)
          : { proposed: false as const, result: await pushMarkdownToDoc(link.connectionId, link.fileId, ready?.markdown ?? "", link.remoteVersion, force) };
      if (outcome.proposed) {
        // Remember WHICH approval writes the cells, so approving it also brings the link forward.
        const queued = await writePendingGoogleLink(adapter.recordKind, adapter.recordId, {
          intent: "push",
          fileId: link.fileId,
          assistId: outcome.assistId,
          kind: link.kind,
          connectionId: link.connectionId,
          name: link.name,
          queuedAt: new Date().toISOString(),
          localFingerprint: await contentFingerprint(content),
          localSnapshotId: await adapter.latestLocalSnapshotId(),
        });
        if (!queued.ok) throw new Error(queued.error);
        proposed(outcome.assistId);
        return;
      }
      const { status, remote, notes } = outcome.result;
      if (status === "conflict") {
        setConflict({ from: "push", remote, localChanged: await localChangedSince(link, content) });
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
      toast.success(`Pushed to ${appName}`, {
        description: [...(ready?.notes ?? []), ...notes].join(" ") || undefined,
      });
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

  const dialog = (
    <Dialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
      <DialogContent className="sm:max-w-md">
        {(() => {
          const copy = conflictCopy(adapter.recordKind, appName, conflict?.localChanged ?? true);
          return (
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
          );
        })()}
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
  );

  return {
    isSheet,
    isSlides,
    appName,
    Mark: config.Mark,
    state,
    connect,
    link,
    ready: loaded && link !== undefined && state.status !== "loading",
    busy,
    editable,
    adapter,
    create,
    update,
    push,
    unlink,
    openInGoogle,
    dialog,
  };
}

export type GoogleLink = ReturnType<typeof useGoogleLink>;

/**
 * The Google rows. The ONE implementation behind the editor's toolbar button and the shared File menu
 * (editor and list rows), so a change here reaches every door.
 */
export function GoogleLinkMenuItems({ g, withLabel = true }: { g: GoogleLink; withLabel?: boolean }): ReactNode {
  const { Mark, link, appName, isSlides } = g;
  if (g.state.status === "loading" || link === undefined) {
    return (
      <DropdownMenuItem disabled>
        <Loader2 className="size-4 animate-spin" />
        {appName}
      </DropdownMenuItem>
    );
  }
  if (g.state.status !== "ready") {
    return (
      <DropdownMenuItem onSelect={() => g.connect(`to link this ${g.adapter.recordKind} with ${appName}`)}>
        <GoogleG className="size-4" />
        Connect Google
      </DropdownMenuItem>
    );
  }
  if (!link) {
    return (
      <DropdownMenuItem disabled={!g.ready} onSelect={() => void g.create()}>
        <Mark className="size-4" />
        {KIND_CONFIG[g.adapter.recordKind].createLabel}
      </DropdownMenuItem>
    );
  }
  return (
    <>
      {withLabel && (
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground" title={link.name}>
          {link.name} · synced {formatRelativeTime(link.lastSyncedAt, { minUnit: "minute", fallback: "never" })}
        </DropdownMenuLabel>
      )}
      <DropdownMenuItem onSelect={() => g.openInGoogle(link.webViewLink)}>
        <Mark className="size-4" />
        Open in {appName}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!g.editable || isSlides}
        title={isSlides ? READ_BACK_REFUSAL : undefined}
        onSelect={() => void g.update()}
      >
        <ArrowDownToLine className="size-4" />
        Update from Google
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void g.push(false)}>
        <ArrowUpFromLine className="size-4" />
        Push to Google
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={!g.editable} onSelect={() => void g.unlink()}>
        <Unlink className="size-4" />
        Unlink
      </DropdownMenuItem>
    </>
  );
}

export function GoogleLinkControl({ adapter, editable }: { adapter: GoogleLinkAdapter; editable: boolean }) {
  const g = useGoogleLink(adapter, editable);
  if (!g.ready) return null;
  const { Mark, link, busy, appName } = g;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="quiet" title={link ? `Linked to ${appName}` : `${appName}`} disabled={busy !== null}>
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Mark className="size-3.5" />}
            {link && <span className="hidden md:inline">Linked</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <GoogleLinkMenuItems g={g} />
        </DropdownMenuContent>
      </DropdownMenu>
      {g.dialog}
    </>
  );
}

/**
 * The same control in Google's editor layout: a small mark by the title once the file is linked
 * (Google's cloud-icon spot) and the Google rows as a section of the Extensions menu. The hook
 * (`useGoogleLink`) stays in the editor, so the link state and the conflict dialog outlive the menu.
 */
export function googleLinkParts(g: GoogleLink): { mark: ReactNode; items: ReactNode; dialog: ReactNode } {
  const { Mark, link, busy, appName } = g;
  return {
    mark:
      g.ready && (link || busy) ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="quiet"
              aria-label={`Linked to ${appName}`}
              title={link ? `Linked to ${appName} · ${link.name}` : appName}
              disabled={busy !== null}
              data-google-link-mark=""
            >
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Mark className="size-3.5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <GoogleLinkMenuItems g={g} />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
    items: (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger data-google-link-menu="">
          <Mark className="mr-2 size-4" />
          {appName}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-60">
          <GoogleLinkMenuItems g={g} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ),
    dialog: g.dialog,
  };
}

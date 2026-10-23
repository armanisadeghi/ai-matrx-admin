/**
 * DocumentEditor — mounts Univer (preset-docs-core) as ONE VIEW of a document.
 *
 * The document itself is the tab's one in-memory model for this id
 * (`../document-model/documentModel.ts`), not this component:
 *   - Load: a view boots from the model's latest state — another live view of
 *     the same document, or what the last view left behind — and only reads
 *     the newest server snapshot when this tab holds none.
 *   - Edits: every local mutation is replayed into every other view of the
 *     document, so two views (a board tile and the document's page, two
 *     tiles) show one document.
 *   - Save: ONE coalesced save per document (2.5s after the last edit; a new
 *     row in `udt_document_snapshots`, append-only), flushed when the last view
 *     leaves, on page hide and on Save. Status is shared (Redux
 *     `workingCopies["udt_document:<id>"]`, lib/working-copy).
 *   - Realtime / collab: the snapshot channel and the Yjs room are opened once
 *     per document by the model, never once per view.
 * A remount (a board tile waking, a removed tile undone, Back and forward)
 * therefore never rebuilds from a stale server copy and never saves twice —
 * and it does not rebuild the editor at all: the last view parks its Univer
 * instance on the model and the next view re-attaches that same instance to
 * its container, so undo / redo history survives (Univer keeps it per
 * instance).
 *
 * SSR: this is "use client". The page that renders it should use dynamic
 * import with `ssr: false` so Univer never executes server-side.
 */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bookmark, FileText, History, Loader2, MessageSquare, Save } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EditorDocumentHeader } from "@/features/shell/components/header/templates/EditorDocumentHeader";
import { useShellCanvasFullScreen } from "@/features/shell/components/ShellChromeMode";
import { EditorMenuBar, type MenuBarState } from "@/components/editor-chrome/EditorMenuBar";
import { useOpenFeedbackWindow } from "@/features/overlays/definitions/feedbackDialog.overlay";
import { EditorToolbar } from "@/components/editor-chrome/EditorToolbar";
import { EditorRibbon } from "@/components/editor-chrome/EditorRibbon";
import { OfficeLookSwitch } from "@/features/file-actions/skin/OfficeLookSwitch";
import { DOC_RIBBON } from "@/features/documents/chrome/doc-ribbon";
import { EditorSaveStatus } from "@/components/editor-chrome/EditorTitleField";
import {
  boundActions,
  matchesShortcut,
  type EditorMenuEntry,
  defaultDocumentPageStyle,
  PAGE_COLOR_KEY,
  pageSetupCommandParams,
  type PageSetupValues,
} from "@ai-matrx/office/core";
import { buildDocMenus, buildDocToolbar, type DocChromeHost, type DocsApiLike } from "@/features/documents/chrome/doc-commands";
import { countStyledHeadings } from "@/features/documents/chrome/doc-outline";
import { univerDocToMarkdown } from "@ai-matrx/office/docs/io";
import { bodyTextOf } from "@ai-matrx/office/docs";

import {
  createUniver,
  LocaleType,
  merge,
  type FUniver,
} from "@univerjs/presets";
import {
  createParagraphId,
  createSectionId,
  ICommandService,
  type IDocumentData,
  type Univer,
  IUndoRedoService,
} from "@univerjs/core";
import { DocStateChangeManagerService } from "@univerjs/docs";
import { defaultTheme } from "@univerjs/themes";
import { UniverDocsCorePreset } from "@univerjs/preset-docs-core";
import { installSlashMenuRule } from "../univer-slash-menu-rule";
import { holdCanLift } from "../room-hold";
import docsCoreEnUS from "@univerjs/preset-docs-core/locales/en-US";
import {
  DragManagerService,
  HoverManagerService,
} from "@univerjs/preset-sheets-core";
import "@univerjs/preset-docs-core/lib/index.css";
import { UniverDocsHyperLinkPreset } from "@univerjs/preset-docs-hyper-link";
import docsLinkEnUS from "@univerjs/preset-docs-hyper-link/locales/en-US";
import "@univerjs/preset-docs-hyper-link/lib/index.css";
import { UniverDocsDrawingPreset } from "@univerjs/preset-docs-drawing";
import docsDrawingEnUS from "@univerjs/preset-docs-drawing/locales/en-US";
import "@univerjs/preset-docs-drawing/lib/index.css";
// Free Apache-2.0 docs add-ons: find & replace. Comments are ours (useDocComments: the anchor is a custom
// range in the body, the thread lives in platform.comments), never Univer's thread-comment decorations.
import { UniverDocsTocPlugin } from "@univerjs/docs-toc";
import { UniverDocsTocUIPlugin } from "@univerjs/docs-toc-ui";
import docsTocEnUS from "@univerjs/docs-toc-ui/locale/en-US";
import "@univerjs/docs-toc-ui/lib/index.css";
import { DocumentOutlinePanel } from "@/features/documents/components/DocumentOutlinePanel";
import { DocumentToolDialogs, type DocDialogId } from "@/features/documents/components/DocumentToolDialogs";
import { DocumentRuler } from "@/features/documents/components/DocumentRuler";
import { createDocEditOps, writeDocumentStyleKey } from "@ai-matrx/office/docs/tools";
import { DOCUMENT_LANGUAGE_KEY, bookmarkFromHash, looksLikeMarkdown, markdownFragment, readDocumentLanguage } from "@ai-matrx/office/docs/tools";
import { UniverFindReplacePlugin } from "@univerjs/find-replace";
import { UniverDocsFindReplacePlugin } from "@univerjs/docs-find-replace";
import findReplaceEnUS from "@univerjs/find-replace/locale/en-US";
import "@univerjs/find-replace/lib/index.css";
import { useRealtimeManager } from "@ai-matrx/data/realtime/react";

import { supabase } from "@/utils/supabase/client";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectDisplayName } from "@/lib/redux/selectors/userSelectors";
import { RemoteDocCarets } from "@/features/documents/components/RemoteDocCarets";
import { useDocComments } from "@/features/documents/components/useDocComments";
import { Button } from "@/components/ui/button";
import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { useToolToggle } from "@/features/canvas/host/toolCanvas";
import { toast } from "@/components/ui/use-toast";
import { toast as notice } from "@/lib/toast";

import { fitZoomRatio } from "@ai-matrx/office/docs";
import { useMacHomeEndKeys } from "@/features/documents/hooks/useMacHomeEndKeys";
import { fitZoomToApply } from "@/features/documents/components/fitZoomPolicy";
import { applyPageSetup, readPageSetup, type PageSetupApiLike } from "@ai-matrx/office/core/page-setup-apply";
import { PageSetupDialog } from "@/features/documents/components/PageSetupDialog";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import {
  renderDocumentCanvasColorsVerbatim,
  type ReplaceableInjector,
} from "@/features/documents/univer-doc-canvas-colors";
import { mountUniverDocument, replaceUniverDocument } from "@/features/documents/univer-mount-document";
import "@/lib/univer-host";
import { useUniverDarkModeSync } from "@ai-matrx/office/univer";
import { useUniverDocSurfaceTheme } from "@/features/documents/hooks/useUniverDocSurfaceTheme";
import { sanitizeUniverDocSnapshot } from "@ai-matrx/office/docs";
import { identifyUniverUser } from "@ai-matrx/office/univer";
import { registerMatrxImageStore } from "@ai-matrx/office/univer";
import { registerMissingUniverIcons } from "@ai-matrx/office/univer";
import {
  routeUniverNotificationsToApp,
  type NotificationReplaceableInjector,
} from "@ai-matrx/office/univer";
import { matrxImagePorts } from "@ai-matrx/office/univer";
import { disposeUniverInstance } from "@ai-matrx/office/univer";
import { registerUniverFacadeDependencies } from "@ai-matrx/office/univer";
import { readCollabAntiEntropyMs } from "@/lib/knobs/collabAntiEntropy";
import { readCollabOtRooms } from "@/lib/knobs/collabOtRooms";
import { chooseRoom } from "@/lib/collab/choose-room";
import { notSharedNotice, seatRefusal } from "@/lib/collab/seat-notices";
import { useCommentAccess } from "@/features/rich-document/annotations/useCommentAccess";
import { showOfflineNotice } from "@/lib/collab/offlineNotice";
import { RemotePeerChips as RemoteCursorsLayer } from "@ai-matrx/data/realtime/collab/react";
import { DOCUMENT_HISTORY_KIND, documentHistoryToggleInput } from "@ai-matrx/office/univer/history";
import { useHistorySubject } from "@/features/canvas/host/historySubject";
import { DocumentPageReferenceCopyButton } from "@/features/documents/components/DocumentPageReferenceCopyButton";
import { DocumentGoogleLink, useDocumentGoogleLink } from "@/features/google-workspace/linked/EditorGoogleLinks";
import { copyCompoundReference } from "@/features/matrx-envelope/components/CompoundReferenceCopyButton";
import { buildDocumentPageReferenceFence } from "@/features/matrx-envelope/compoundReference";
import type { DocumentBodyPort } from "@ai-matrx/office/docs";
import {
  selectWorkingCopyStatus,
  type WorkingCopyStatus,
} from "@/lib/working-copy/workingCopySlice";
import {
  connectDocumentRealtime,
  documentWorkingCopy,
} from "@/features/documents/document-model/documentModels";
import type { DocumentModel, ParkedDocumentEditor } from "@ai-matrx/office/docs";
import type {
  DocumentAwareness,
  DocumentCollabFactory,
} from "@ai-matrx/office/docs";
import type { CommandServiceLike, DocsOtNotice } from "@ai-matrx/office/univer/collab";
import { getLatestDocumentSnapshot } from "@ai-matrx/office/docs";
import { DocSelectionManagerService } from "@univerjs/docs";
import type { AwarenessState, OpOfflineState } from "@ai-matrx/data/realtime/collab";

import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { WorkingCopyAlert } from "@/lib/working-copy/WorkingCopyAlert";
import { formatCount } from "@ai-matrx/kit/format";

// LOAD MARKER (heavy: must never load before the person engages) — read by the page-load trace; no import, no build edge.
if (typeof window !== "undefined") performance.mark("load:heavy:Univer docs editor", { detail: { home: ["/documents"] } });

const VIEWING_MODE_NOTICE = "Viewing mode — switch to Editing to change";
const JOINING_NOTICE = "Still loading — type in a moment";

type Props = {
  documentId: string;
  /** Pass false to mount in viewer-only mode (no autosave). */
  editable?: boolean;
  /** Used as the document display name on export / shell. Falls back to documentId. */
  documentName?: string;
  /**
   * Opt in to v2 CRDT collab — see `@ai-matrx/data/realtime` README (collab).
   * The document's model joins ONE Yjs room per document (channel prefix
   * "document", so docs and workbooks never share a room) and binds it to the
   * model's command stream, so every view of the document in this tab is in
   * the room through it.
   */
  collab?: boolean;
  /**
   * Lends the body text to the record's agent surface (`document_body_text`
   * and the `document_body` write target, `../document-body-text.ts`): called
   * with a port once Univer has mounted the document, and with null when the
   * instance is torn down. Every call through the port resolves the LIVE
   * document, and every write runs through Univer's command service, so undo,
   * autosave, History, every other view and collab see an agent's edit
   * exactly as a keystroke.
   */
  onBodyPort?: (port: DocumentBodyPort | null) => void;
  /** The record's File menu, in the same place the workbook editor puts it (left of History). */
  toolbarRightSlot?: ReactNode;
  /**
   * The document's page (`/documents/[id]`): draw Google Docs' header — title,
   * marks, menu bar (with the record's shared File menu), actions — around
   * the editor. Absent on a board tile, which keeps its compact bar.
   */
  chrome?: {
    backHref: string;
    title: ReactNode;
    titleMarks?: ReactNode;
    actions?: ReactNode;
    menuBar: MenuBarState;
    /** The shared File menu, mounted with `menuBar.fileMenuProps()`. */
    fileMenu: ReactNode;
    /** The File rows the page owns (New, Open, Version history, Print) — their shortcuts are bound here. */
    fileExtras?: EditorMenuEntry[];
    /** A row under the toolbar (the Rulebook notice). */
    notice?: ReactNode;
    /** A control at the toolbar's far end (the copy and export split). */
    toolbarTrailing?: ReactNode;
  };
};

export default function DocumentEditor({
  documentId,
  editable = true,
  documentName,
  collab = false,
  onBodyPort,
  toolbarRightSlot,
  chrome,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<FUniver | null>(null);
  const univerRef = useRef<Univer | null>(null);
  /** The document's model while this view holds it (save, status, rooms). */
  const modelRef = useRef<DocumentModel | null>(null);
  const store = useAppStore();
  const realtimeManager = useRealtimeManager();
  const realtimeManagerRef = useRef(realtimeManager);
  useEffect(() => {
    realtimeManagerRef.current = realtimeManager;
  }, [realtimeManager]);
  const [awareness, setAwareness] = useState<DocumentAwareness | null>(null);
  /** C10: the ordered room's offline state (unsent edits kept on this device, syncing); null on the relay. */
  const [collabOffline, setCollabOffline] = useState<OpOfflineState | "reconnecting" | null>(null);

  const [bootState, setBootState] = useState<
    "booting" | "ready" | "load_error"
  >("booting");
  /**
   * Univer's UNIT id for the open document — the snapshot's own `id`, which is
   * NOT `documentId` (a new document gets a fresh uuid; a loaded one keeps the
   * id its snapshot was stored with). The theme sync addresses the render by
   * unit, so it needs this rather than the row id.
   */
  const [unitId, setUnitId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /**
   * The co-editing room is joining: the page shows the stored document, the room's is about to replace it. Keys
   * typed now landed on that stale copy and were wiped by the room's load or scattered into other people's words,
   * with no notice (adversarial walk 2 F5/F10, live: "{EARLY-0123456789}" typed 1.9 s after a reload, all lost).
   * Until the room is live the page refuses edits like a view-only page and says why; "Loading document…" stays.
   */
  const [roomJoining, setRoomJoining] = useState(false);
  // After the room is live the hold lasts until the person pauses, so a word started during it is not half kept (F-D).
  const [roomSettling, setRoomSettling] = useState(false);
  const lastRefusedAtRef = useRef(0);
  // ONE status per document, whichever view wrote it.
  const saveStatus: WorkingCopyStatus =
    useAppSelector((state) =>
      selectWorkingCopyStatus(state, documentWorkingCopy.key(documentId)),
    ) ?? "idle";
  // Snapshot history is a canvas tab beside the editor; the button toggles it.
  const snapshotHistory = useToolToggle(documentHistoryToggleInput(documentId, editable, documentName));
  useHistorySubject(DOCUMENT_HISTORY_KIND, documentId);

  // Univer boots ONCE per documentId (see boot effect). `editable` and
  // `collab` can change AFTER boot, so the model reads them through refs —
  // recreating Univer on a prop toggle is what made content load then vanish
  // (disposing Univer mid-render crashes its popups).
  const editableRef = useRef(editable);
  const collabRef = useRef(collab);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  // A commenter's seat is read-only for text but still sends its comment anchors to the room (the door accepts only those).
  const mayComment = useCommentAccess("udt_document", documentId, editable);
  const commentOnly = !editable && mayComment;
  const commentOnlyRef = useRef(commentOnly);
  useEffect(() => {
    commentOnlyRef.current = commentOnly;
  }, [commentOnly]);
  useEffect(() => {
    collabRef.current = collab;
  }, [collab]);

  // Initial dark-mode value for createUniver. Live changes are handled by
  // useUniverDarkModeSync below; this just avoids a light→dark flash on boot.
  const themeMode = useThemeMode();
  const darkModeRef = useRef(themeMode === "dark");
  useEffect(() => {
    darkModeRef.current = themeMode === "dark";
  }, [themeMode]);

  // The body port — published while a document is mounted, withdrawn on
  // teardown. Resolved per call so it never holds a disposed instance.
  const bodyReady = bootState === "ready" && unitId !== null;
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  useMacHomeEndKeys(univerRef, bodyReady);
  const docComments = useDocComments({
    univer: univerRef.current,
    unitId,
    documentId,
    ready: bodyReady,
    editable,
    wrapperRef: canvasWrapperRef,
  });
  useEffect(() => {
    if (!onBodyPort || !bodyReady) return undefined;
    const liveDocument = () => {
      const doc = apiRef.current?.getActiveDocument();
      if (!doc) {
        throw new Error(
          "The document editor is closed or still opening. Nothing was changed; open the document and try again.",
        );
      }
      return doc;
    };
    onBodyPort({
      getDataStream: () => liveDocument().getBody().dataStream,
      getSnapshot: () => liveDocument().save(),
      deleteRange: (start, end) =>
        liveDocument().deleteRange({ startOffset: start, endOffset: end }),
      insertText: (at, text) => liveDocument().insertText(at, text),
      // Markdown an agent writes lands as real structure (tables, headings, lists) through the one converter.
      insertMarkdown: (at, markdown) => {
        const doc = liveDocument();
        doc.setSelection?.(at, at);
        const univer = univerRef.current;
        if (!univer) return false;
        return (
          resolveCommandService(univer).syncExecuteCommand("doc.command.inner-paste", {
            unitId: doc.getId(),
            doc: markdownFragment(markdown),
          }) !== false
        );
      },
      openPageSetup: () => setPageSetupOpen(true),
      openTool: (id) => setToolDialog(id),
      runCommand: async (commandId) => {
        const api = apiRef.current as unknown as { executeCommand?: (id: string) => Promise<unknown> | unknown } | null;
        if (!api?.executeCommand) throw new Error("The document editor is still opening. Try again in a moment.");
        await api.executeCommand(commandId);
      },
    });
    return () => onBodyPort(null);
  }, [onBodyPort, bodyReady]);

  // Keep Univer's dark mode in lockstep with the app theme (Facade API).
  // This reaches Univer's CHROME only — see the hook's header.
  useUniverDarkModeSync(apiRef, bootState === "ready");

  // File → Page setup: the dialog's state, and a counter that re-fits the zoom to the new page width.
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  // View → Show outline.
  const [outlineOpen, setOutlineOpen] = useState(false);
  // The Docs tools: which dialog is open, the editing mode, the ruler, the document language.
  const [toolDialog, setToolDialog] = useState<DocDialogId | null>(null);
  const [docMode, setDocMode] = useState<"editing" | "viewing">("editing");
  const [rulerShown, setRulerShown] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [stageWidth, setStageWidth] = useState(0);
  const [pageRev, setPageRev] = useState(0);
  const dispatch = useAppDispatch();

  // A narrow editor (a phone) fits the page to its width, so the page reflows
  // into view instead of scrolling sideways. View-only: the saved page is untouched.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || bootState !== "ready" || unitId === null) return undefined;
    let fitted = false;
    const apply = () => {
      const api = apiRef.current as unknown as {
        executeCommand?: (id: string, params?: unknown) => unknown;
      } | null;
      // The comment rail and the outline narrow this stage on a desktop too: only a phone-sized window fits the page.
      const zoomRatio = fitZoomToApply(window.innerWidth, fitted, fitZoomRatio(container.clientWidth, readPageSetupWidth(apiRef.current as unknown as PageSetupApiLike | null)));
      if (zoomRatio === null) return;
      fitted = zoomRatio !== 1;
      void api?.executeCommand?.("doc.operation.set-zoom-ratio", { unitId, zoomRatio });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
  }, [bootState, unitId, pageRev]);

  // …and the page itself, which Univer paints from hardcoded LIGHT constants
  // no theme ever reaches. Without this the document renders as a page in the
  // wrong theme inside a frame in the wrong theme (cold walk 18: a black sheet
  // in a white frame, in a dark app). Every Matrx surface that shows a cloud
  // document mounts THIS component, so they all inherit the fix.
  useUniverDocSurfaceTheme(
    univerRef,
    unitId ?? "",
    bootState === "ready" && unitId !== null,
  );

  // Boot Univer EXACTLY ONCE per documentId and attach it to the document's
  // model. `editable` / `collab` are read from refs (above) so toggling them
  // never tears the instance down. This is the lifecycle Univer's docs assume
  // (create once, dispose on unmount) — recreating on a prop change is what
  // crashed Univer's ParagraphMenu popup mid-render and made loaded content
  // disappear.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    let cancelled = false;
    // Hold the document's working copy (Redux status + its one save) and its
    // engine (the DocumentModel, keyed the same way).
    const release = documentWorkingCopy.attach(documentId, store);
    const model = documentWorkingCopy.engine(documentId);
    if (!model) {
      release();
      setLoadError("The document could not be opened in this tab.");
      setBootState("load_error");
      return undefined;
    }
    modelRef.current = model;
    const manager = realtimeManagerRef.current;
    if (manager && !collabRef.current) connectDocumentRealtime(model, manager);
    let detach: (() => void) | null = null;
    const stopAwareness = model.subscribeAwareness(() =>
      setAwareness(model.getAwareness()),
    );

    // The host Univer renders into: the document's KEPT editor when the last
    // view left one (same instance, same undo history — re-attached, never
    // rebuilt), else a new one. It is appended to this view's container and
    // leaves with the instance.
    const container = containerRef.current;
    let booted: KeptUniver | null = null;
    /** Join the room; edits stay refused (`roomJoining`) until it is live or could not start. */
    const joinRoom = () => {
      setRoomJoining(true);
      void startDocumentRoom(model, documentId, selectDisplayName(store.getState()), setCollabOffline, () => cancelled).finally(() => {
        if (!cancelled) setRoomJoining(false);
      });
    };
    const attachPort = (kept: KeptUniver) =>
      model.attachView({
        commandService: resolveCommandService(kept.univer),
        snapshot: () => apiRef.current?.getActiveDocument()?.save() ?? null,
        remount: (snapshot) => {
          if (!apiRef.current) return;
          replaceUniverDocument(
            apiRef.current,
            sanitizeUniverDocSnapshot(snapshot as Partial<IDocumentData>, documentId),
          );
        },
        editable: () => editableRef.current,
        commentOnly: () => commentOnlyRef.current,
        unitId: () => apiRef.current?.getActiveDocument()?.getId?.() ?? null,
        undoRedo: () => resolveUndoRedoService(kept.univer),
        docHistory: () => resolveDocHistory(kept.univer),
        selection: docSelectionPort(kept.univer),
      });
    const parked = model.takeParkedEditor() as ParkedDocumentEditor<KeptUniver> | null;
    if (parked) {
      const kept = parked.instance;
      container.appendChild(kept.host);
      univerRef.current = kept.univer;
      apiRef.current = kept.univerAPI;
      try {
        detach = attachPort(kept);
        booted = kept;
        setUnitId(kept.unitId);
        setBootState("ready");
        if (collabRef.current) joinRoom();
      } catch (err) {
        kept.host.remove();
        disposeUniverInstance(kept.univer);
        univerRef.current = null;
        apiRef.current = null;
        setLoadError(err instanceof Error ? err.message : String(err));
        setBootState("load_error");
      }
    }

    if (!parked) (async () => {
      try {
        const host = document.createElement("div");
        host.className = "absolute inset-0";
        container.appendChild(host);
        const { univer, univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: merge({}, docsCoreEnUS, docsLinkEnUS, docsDrawingEnUS, findReplaceEnUS, docsTocEnUS) },
          theme: defaultTheme,
          darkMode: darkModeRef.current,
          presets: [
            UniverDocsCorePreset({
              container: host,
              ribbonType: "simple",
              // Google's menu bar + toolbar replace Univer's ribbon (components/editor-chrome).
              toolbar: false,
            }),
            UniverDocsHyperLinkPreset(),
            UniverDocsDrawingPreset(),
          ],
          plugins: [UniverFindReplacePlugin, UniverDocsFindReplacePlugin, UniverDocsTocPlugin, UniverDocsTocUIPlugin],
        });
        // Google's rule for "/": the menu opens at a paragraph start or after a space, never mid-word.
        installSlashMenuRule();
        if (cancelled) {
          host.remove();
          univer.dispose();
          return;
        }
        univerRef.current = univer;
        apiRef.current = univerAPI;
        // ONE toaster per page: Univer's notices ride the app's toast path, and
        // Univer never mounts its own sonner Toaster (every toast showed twice).
        const routed = routeUniverNotificationsToApp(
          univer.__getInjector() as unknown as NotificationReplaceableInjector,
        );
        if (!routed.applied) {
          console.warn(`[univer] notifications not routed to the app toaster (${routed.reason}) — toasts may show twice`);
        }
        registerMissingUniverIcons(univer.__getInjector());
        // Pictures go to the file store; the snapshot keeps only a reference.
        registerMatrxImageStore(univer.__getInjector(), matrxImagePorts);
        void identifyUniverUser(univer.__getInjector()).catch((err) =>
          console.warn("[univer] could not attribute edits to the signed-in user", err),
        );

        // THE CANVAS PAINTS WHAT IT IS TOLD. Univer's dark mode otherwise
        // inverts every fill on its way to the context and THROWS on a color
        // its ColorKit cannot parse — inside the render pass, which leaves the
        // whole page unpainted (cold walk 19). Must happen before the document
        // unit exists: `ICanvasColorService` is injected into that unit's
        // `Engine` at creation. Full argument in `../univer-doc-canvas-colors`.
        const verbatim = renderDocumentCanvasColorsVerbatim(
          univer.__getInjector() as unknown as ReplaceableInjector,
        );
        if (!verbatim.applied) {
          // NOTHING FAILS SILENTLY: the page is about to be painted by the
          // inverting service, which is the defect this guards.
          console.warn(
            `[document] could not take Univer's dark-mode color inversion off the canvas (${verbatim.reason}) — the page may render inverted or blank in dark mode`,
          );
        }

        // Sheets Facade mixins are process-global. Once their module exists in
        // this SPA, FUniver attaches the observer to every later instance and
        // resolves these two services when *any* unit reaches Rendered. Sheet
        // plugins are lazy by unit type, so a document-only injector never
        // receives them from UniverSheetsUIPlugin. Register exactly what that
        // observer requires; starting the full sheets plugin creates workbook
        // UI and duplicate internal editor documents on this surface.
        registerUniverFacadeDependencies(univer.__getInjector(), [
          HoverManagerService,
          DragManagerService,
        ]);

        // The model's latest state, never a stale server copy while this tab
        // holds the document; re-read synchronously after the await, because
        // another view may have typed while the read was in flight.
        const opening = await model.openingSnapshot(() =>
          defaultEmptyDocument((store.getState().userPreferences.documents?.defaultPageSetup as PageSetupValues | null | undefined) ?? null),
        );
        if (cancelled) {
          host.remove();
          disposeUniverInstance(univer);
          return;
        }
        const initial: Partial<IDocumentData> = sanitizeUniverDocSnapshot(
          (model.latest() ?? opening) as Partial<IDocumentData>,
          documentId,
        );
        // Univer is the authority on what it actually mounted (the snapshot
        // may have been repaired); a unit that did not mount throws into the
        // catch below and the page says "Load failed" — never "Editing".
        const mountedUnit = mountUniverDocument(univerAPI, initial);
        setUnitId(mountedUnit);

        const kept: KeptUniver = { host, univer, univerAPI, unitId: mountedUnit };
        detach = attachPort(kept);
        booted = kept;
        setBootState("ready");

        if (collabRef.current) joinRoom();
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setBootState("load_error");
      }
    })();

    return () => {
      cancelled = true;
      // The unit belongs to the instance being torn down — never let the next
      // document's theme sync address the previous document's render.
      setUnitId(null);
      stopAwareness();
      // LEAVING IS NOT A REASON TO LOSE THE LAST SENTENCE. Detaching hands
      // this view's document to the model synchronously (before Univer is
      // disposed below); releasing the last hold flushes the one pending save,
      // and a view that comes back before it lands boots from that same state.
      detach?.();
      // KEEP THE EDITOR, KEEP THE HISTORY. The last view parks its booted
      // instance on the document's model (off the page, alive) before the
      // hold is released, so a remount within the session re-attaches it and
      // ⌘Z still undoes what was typed before. Refused (another view is
      // open, or the editor never finished booting): dispose as before.
      const kept = booted;
      const parkedHere =
        kept !== null &&
        model.parkEditor({
          element: kept.host,
          instance: kept,
          remount: (snapshot) => {
            kept.unitId = replaceUniverDocument(
              kept.univerAPI,
              sanitizeUniverDocSnapshot(snapshot as Partial<IDocumentData>, documentId),
            );
          },
          dispose: () => disposeUniverInstance(kept.univer),
        });
      if (parkedHere) kept.host.remove();
      release();
      modelRef.current = null;
      const univer = univerRef.current;
      univerRef.current = null;
      apiRef.current = null;
      if (!parkedHere) {
        kept?.host.remove();
        disposeUniverInstance(univer);
      }
    };
  }, [documentId]);

  const handleSaveNow = () => {
    const model = modelRef.current;
    if (!model) {
      // NOTHING FAILS SILENTLY: a Save that cannot reach the document says so
      // with the one remedy that keeps the words (cold walk 8, 2026-09-17).
      toast({
        title: "This document cannot be saved right now",
        description:
          "Your text is still on screen — copy it somewhere safe, then reload this page to reconnect the editor.",
        variant: "destructive",
      });
      return;
    }
    void documentWorkingCopy.flush(documentId, "manual", true);
  };

  const statusPill = useMemo(() => statusPillFor(saveStatus), [saveStatus]);

  // ─── Google Docs chrome: menus, toolbar, bound shortcuts ───
  const [fullScreen, setFullScreen] = useState(false);
  useShellCanvasFullScreen(fullScreen);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const api = apiRef.current;
    if (bootState !== "ready" || !api) return undefined;
    const sub = api.addEvent(api.Event.CommandExecuted, (command) => {
      const ratio = (command.params as { zoomRatio?: unknown } | undefined)?.zoomRatio;
      if (command.id === "doc.operation.set-zoom-ratio" && typeof ratio === "number") setZoom(ratio);
    });
    return () => sub.dispose();
  }, [bootState]);
  const liveSnapshot = () =>
    (apiRef.current as unknown as { getActiveDocument?: () => { save: () => unknown } | null } | null)
      ?.getActiveDocument?.()
      ?.save() ?? null;
  const printDocument = () =>
    void import("@ai-matrx/rich-content/copy/content-export").then((m) =>
      m.printContent(univerDocToMarkdown(liveSnapshot() as Parameters<typeof univerDocToMarkdown>[0]), documentName),
    );
  const showWordCount = () => {
    const snap = liveSnapshot() as { body?: { dataStream?: string } } | null;
    const text = bodyTextOf(snap?.body?.dataStream ?? "").text;
    const words = text.split(/\s+/).filter(Boolean).length;
    toast({ title: `${formatCount(words)} words`, description: `${formatCount(text.replace(/\s/g, "").length)} characters` });
  };
  const openFeedback = useOpenFeedbackWindow();
  const changePage = async (values: PageSetupValues) => {
    try {
      await applyPageSetup(apiRef.current as unknown as PageSetupApiLike, values);
      setPageRev((n) => n + 1);
    } catch (err) {
      toast({ title: "Page setup failed", description: err instanceof Error ? err.message : String(err) });
    }
  };
  const editOps = useMemo(
    () =>
      createDocEditOps({
        api: () => apiRef.current as never,
        injector: () => (univerRef.current as unknown as { __getInjector?: () => { get: <T>(t: unknown) => T | undefined } } | null)?.__getInjector?.() ?? null,
      }),
    [],
  );
  // Plain text that is markdown (a pasted table above all) is drawn as structure, never typed as pipes;
  // anything with HTML is Univer's own paste.
  useEffect(() => {
    const el = containerRef.current;
    if (bootState !== "ready" || !el || !editable || docMode !== "editing") return undefined;
    const onPaste = (e: ClipboardEvent) => {
      const data = e.clipboardData;
      const text = data?.getData("text/plain") ?? "";
      if (!data || data.types.includes("text/html") || data.files.length > 0 || !looksLikeMarkdown(text)) return;
      e.preventDefault();
      e.stopPropagation();
      void editOps.insertMarkdown(text).then((ok) => {
        if (!ok) notice.info("Click inside the document, then paste again.", { id: "doc-paste-markdown" });
      });
    };
    el.addEventListener("paste", onPaste, true);
    return () => el.removeEventListener("paste", onPaste, true);
  }, [bootState, editable, docMode, editOps]);
  // Viewing mode (and a seat without edit access) is Univer's own read-only permission on this document; a refused edit says so in our words.
  useEffect(() => {
    if (bootState !== "ready") return undefined;
    const holding = roomJoining || roomSettling;
    const viewing = docMode === "viewing" || !editable || holding;
    const refusal = !editable ? seatRefusal(commentOnly) : holding ? JOINING_NOTICE : VIEWING_MODE_NOTICE;
    void editOps.setViewOnly(viewing);
    if (!viewing) return undefined;
    let stop: (() => void) | null = null;
    let gone = false;
    void editOps
      .onEditDenied(() => {
        if (holding) lastRefusedAtRef.current = Date.now();
        notice.info(refusal, { id: "doc-viewing-mode" });
      })
      .then((unsubscribe) => (gone ? unsubscribe() : (stop = unsubscribe)));
    return () => {
      gone = true;
      stop?.();
    };
  }, [bootState, docMode, editable, commentOnly, editOps, unitId, roomJoining, roomSettling]);
  // The room is live: keep refusing until the burst typed during the hold has paused (never half a word), then lift.
  useEffect(() => {
    if (roomJoining) {
      lastRefusedAtRef.current = 0;
      setRoomSettling(true);
      return undefined;
    }
    if (!roomSettling) return undefined;
    const settleStartedAt = Date.now();
    const lift = () => {
      if (!holdCanLift({ now: Date.now(), lastRefusedAt: lastRefusedAtRef.current, settleStartedAt })) return false;
      lastRefusedAtRef.current = 0;
      setRoomSettling(false);
      return true;
    };
    if (lift()) return undefined;
    const timer = window.setInterval(() => {
      if (lift()) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [roomJoining, roomSettling]);
  useEffect(() => {
    if (bootState !== "ready") return;
    const style = (apiRef.current as unknown as PageSetupApiLike | null)?.getActiveDocument?.()?.getDocumentDataModel?.()?.getSnapshot().documentStyle;
    setLanguage(readDocumentLanguage(style));
  }, [bootState, unitId]);
  // A link ending #bookmark=<name> opens at that bookmark.
  useEffect(() => {
    if (bootState !== "ready" || typeof window === "undefined") return;
    const name = bookmarkFromHash(window.location.hash);
    const hit = name ? editOps.bookmarks().find((b) => b.name.toLowerCase() === name.toLowerCase()) : undefined;
    if (hit) editOps.goTo(hit.offset + 1);
  }, [bootState, editOps, unitId]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !rulerShown) return undefined;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rulerShown, bootState]);
  const setDocumentLanguage = (code: string) => {
    setLanguage(code);
    void writeDocumentStyleKey(apiRef.current as never, DOCUMENT_LANGUAGE_KEY, code);
  };
  const chromeHost: DocChromeHost | null =
    bootState === "ready" && apiRef.current
      ? {
          api: apiRef.current as unknown as DocsApiLike,
          editable: editable && docMode === "editing",
          blockStart: () => editOps.toBlockStart(),
          unitId: () => unitId,
          headingCount: () => countStyledHeadings(apiRef.current?.getActiveDocument()?.save() ?? null),
          notice: (title) => notice.info(title, { id: "doc-command-notice" }),
          zoom: () => zoom,
          print: printDocument,
          wordCount: showWordCount,
          fullScreen: () => fullScreen,
          toggleFullScreen: () => setFullScreen((v) => !v),
          sendFeedback: () => openFeedback(),
          openPageSetup: () => setPageSetupOpen(true),
          pageless: () => readPageSetup(apiRef.current as unknown as PageSetupApiLike).pageless,
          setPageless: (pageless) => void changePage({ ...readPageSetup(apiRef.current as unknown as PageSetupApiLike), pageless }),
          show: {
            outline: () => outlineOpen,
            toggleOutline: () => setOutlineOpen((v) => !v),
          },
          tools: {
            open: (id) => setToolDialog(id),
            mode: () => docMode,
            setMode: (m) => setDocMode(m),
            ruler: () => rulerShown,
            toggleRuler: () => setRulerShown((v) => !v),
            imageOptions: () => void editOps.openImagePanel(),
          },
        }
      : null;
  const menus = chromeHost ? buildDocMenus(chromeHost) : [];
  const toolbarItems = chromeHost ? buildDocToolbar(chromeHost) : [];
  const boundRef = useRef<ReturnType<typeof boundActions>>([]);
  boundRef.current = boundActions([...menus, ...(chrome?.fileExtras ? [{ id: "file", label: "File", items: chrome.fileExtras }] : [])]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = containerRef.current?.closest("[data-editor-document-header],[data-document-editor]");
      if (!root || !(e.target instanceof Node) || !(root.contains(e.target) || e.target === document.body)) return;
      const hit = boundRef.current.find((a) => a.shortcut && matchesShortcut(e, a.shortcut));
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      void Promise.resolve(hit.run()).catch(() => {});
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const toolbar = (
    <EditorToolbar
      items={toolbarItems}
      menus={menus}
      trailing={chrome?.toolbarTrailing}
      className={bootState === "ready" ? undefined : "invisible"}
    />
  );
  // Extensions (Google keeps its own in the menu bar): the Google link and the page reference are
  // rows of ONE menu, with a small mark by the title once the Google link exists.
  const ready = bootState === "ready";
  const googleLink = useDocumentGoogleLink(apiRef, documentId, documentName, editable, ready && !!chrome);
  const extensionRows = ready ? (
    <>
      {googleLink.items}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        data-editor-command="extensions.page-reference"
        onSelect={() =>
          void copyCompoundReference(
            () => buildDocumentPageReferenceFence({ documentId, pageIndex: 1, documentName }),
            documentName ? `${documentName} (page 1)` : "Document page 1",
          )
        }
      >
        <Bookmark className="mr-2 size-4" />
        Copy page reference
      </DropdownMenuItem>
    </>
  ) : null;

  const pageSetupDialog = ready ? (
    <>
    <DocumentToolDialogs
      open={toolDialog}
      onClose={() => setToolDialog(null)}
      ops={editOps}
      documentId={documentId}
      documentName={documentName ?? "Untitled document"}
      language={language}
      onLanguage={setDocumentLanguage}
      exec={(id, params) => (apiRef.current as unknown as DocsApiLike | null)?.executeCommand(id, params)}
    />
    <PageSetupDialog
      open={pageSetupOpen}
      onOpenChange={setPageSetupOpen}
      initial={readPageSetup(apiRef.current as unknown as PageSetupApiLike)}
      onApply={(values) => void changePage(values)}
      onSetDefault={(values) => {
        dispatch(setPreference({ module: "documents", preference: "defaultPageSetup", value: values }));
        toast({ title: "Saved as the page for new documents" });
      }}
    />
    </>
  ) : null;

  if (chrome) {
    return (
      <EditorDocumentHeader
        record={{ token: "udt_document", id: documentId }}
        backHref={chrome.backHref}
        backLabel="Back to documents"
        productTone="docs"
        productIcon={<FileText />}
        title={chrome.title}
        titleMarks={
          <>
            {chrome.titleMarks}
            {ready ? googleLink.mark : null}
            {bootState === "ready" ? (
              <EditorSaveStatus
                state={saveStatus === "idle" ? "saved" : saveStatus}
                offline={collabOffline}
                {...(editable ? { onSaveNow: handleSaveNow } : {})}
              />
            ) : (
              <span className="flex size-7 items-center justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </span>
            )}
          </>
        }
        menuBar={
          <EditorMenuBar
            menus={menus}
            state={chrome.menuBar}
            fileMenu={bootState === "ready" ? chrome.fileMenu : null}
            extensions={extensionRows}
          />
        }
        actions={
          <>
            {collab && bootState === "ready" && awareness && (
              <span className="hidden md:flex">
                <RemoteCursorsLayer states={awareness.states} selfUid={awareness.selfUid} />
              </span>
            )}
            <ControlButton
              variant="quiet"
              icon={<History />}
              aria-label="Version history"
              title="Version history"
              pressed={snapshotHistory.isVisible}
              className="hidden sm:inline-flex"
              onClick={snapshotHistory.toggle}
            />
            <ControlButton
              variant="quiet"
              icon={<MessageSquare />}
              aria-label="Comments"
              title="Comments"
              className="hidden sm:inline-flex"
              disabled={bootState !== "ready"}
              pressed={docComments.open}
              onClick={docComments.toggle}
            />
            {chrome.actions}
          </>
        }
        toolbar={toolbar}
        ribbon={
          <EditorRibbon
            tabs={DOC_RIBBON}
            menus={menus}
            toolbar={toolbarItems}
            fileMenu={bootState === "ready" ? chrome.fileMenu : null}
            extensions={extensionRows}
            end={
              <>
                {chrome.toolbarTrailing}
                <OfficeLookSwitch />
              </>
            }
          />
        }
      >
        {googleLink.dialog}
        {pageSetupDialog}
        <div className="matrx-univer-shell relative flex min-h-0 flex-1 flex-col" data-document-editor="">
          {bootState === "load_error" && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
              Load failed: {loadError ?? "unknown"}
              <ErrorAlchemyMenu error={loadError} />
            </div>
          )}
          {chrome.notice}
          <WorkingCopyAlert kind={documentWorkingCopy} id={documentId} />
          <div className="flex min-h-0 flex-1">
            {outlineOpen && ready ? (
              <DocumentOutlinePanel
                readSnapshot={liveSnapshot}
                onClose={() => setOutlineOpen(false)}
                onJump={(offset) => {
                  const doc = apiRef.current?.getActiveDocument() as unknown as { setSelection?: (a: number, b: number) => void } | null;
                  doc?.setSelection?.(offset, offset);
                }}
              />
            ) : null}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {rulerShown && ready ? (
                <DocumentRuler
                  containerWidth={stageWidth}
                  zoom={zoom}
                  rev={pageRev}
                  readStyle={() => (apiRef.current as unknown as PageSetupApiLike | null)?.getActiveDocument?.()?.getDocumentDataModel?.()?.getSnapshot().documentStyle as never}
                />
              ) : null}
              <div ref={canvasWrapperRef} className="relative min-h-0 min-w-0 flex-1">
                <div ref={containerRef} className="absolute inset-0" />
                <RemoteDocCarets univer={univerRef.current} unitId={unitId} carets={awareness?.carets ?? NO_CARETS} />
                {docComments.layer}
              </div>
            </div>
            {docComments.rail}
          </div>
        </div>
      </EditorDocumentHeader>
    );
  }

  return (
    // Univer owns its own light/dark theming via the Facade API
    // (useUniverDarkModeSync), so we do NOT pin a colorScheme here — that fought
    // Univer's portals and broke dark mode. The wrapper bg uses a semantic
    // token so it adapts with the app theme during boot.
    <div className="matrx-univer-shell flex h-full w-full flex-col" data-document-editor="">
      {pageSetupDialog}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-xs min-w-0">
        <div className="text-muted-foreground flex-1 min-w-0 truncate">
          {(bootState === "booting" || (bootState === "ready" && roomJoining)) && (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              Loading document…
            </span>
          )}
          {bootState === "load_error" && (
            <span className="text-destructive">
              Load failed: {loadError ?? "unknown"}
              <ErrorAlchemyMenu error={loadError} />
            </span>
          )}
          {bootState === "ready" && !roomJoining && (
            <span>{editable ? "Editing" : "Viewing"}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {collab && bootState === "ready" && awareness && (
            <RemoteCursorsLayer
              states={awareness.states}
              selfUid={awareness.selfUid}
            />
          )}
          {bootState === "ready" && saveStatus !== "idle" && (
            /* Save state is the one thing on this bar a person must be able
               to trust, so it is not hidden on a phone and it no longer wears
               a hardcoded green border while saying "Unsaved changes" in
               amber. */
            <div className={`flex items-center gap-1 ${statusPill.className}`}>
              {statusPill.icon}
              <span>{statusPill.text}</span>
            </div>
          )}
          {bootState === "ready" && (
            <DocumentGoogleLink apiRef={apiRef} documentId={documentId} documentName={documentName} editable={editable} />
          )}
          {bootState === "ready" && (
            <DocumentPageReferenceCopyButton
              documentId={documentId}
              documentName={documentName}
            />
          )}
          {editable && bootState === "ready" && (
            <Button
              icon={<Save />}
              variant="quiet"
              onClick={handleSaveNow}
              disabled={saveStatus === "saving"}
              title="Save a labeled snapshot now (bypass autosave debounce)"
            >
              <span className="hidden sm:inline">Save now</span>
            </Button>
          )}
          {bootState === "ready" && toolbarRightSlot}
          <Button
            icon={<History />}
            variant="quiet"
            onClick={snapshotHistory.toggle}
            aria-pressed={snapshotHistory.isVisible}
            title="View snapshot history"
          >
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>
      {toolbar}
      <WorkingCopyAlert kind={documentWorkingCopy} id={documentId} />
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        <RemoteDocCarets univer={univerRef.current} unitId={unitId} carets={awareness?.carets ?? NO_CARETS} />
      </div>

      {/* Hidden — documentName is reserved for the parent shell label. */}
      <span className="hidden">{documentName}</span>
    </div>
  );
}

const NO_CARETS: NonNullable<DocumentAwareness["carets"]> = [];

// ─── helpers ─────────────────────────────────────────────────────────────────

/** One booted Univer editor and the element it renders into (what the model keeps between views). */
interface KeptUniver {
  host: HTMLDivElement;
  univer: Univer;
  univerAPI: FUniver;
  unitId: string;
}

/** Univer's command service for one instance — what the model listens to and replays into. */
function resolveCommandService(univer: Univer): CommandServiceLike {
  const injector = (
    univer as unknown as {
      __getInjector?: () => { get: <T>(token: unknown) => T | undefined };
    }
  ).__getInjector?.();
  const resolved = injector?.get<CommandServiceLike>(ICommandService as unknown);
  if (
    !resolved ||
    typeof resolved.onMutationExecutedForCollab !== "function" ||
    typeof resolved.syncExecuteCommand !== "function"
  ) {
    // A view the model cannot hear would type into a copy nobody saves.
    throw new Error(
      "The editor could not connect to this document's change stream (Univer command service unavailable).",
    );
  }
  return resolved;
}

/** Univer's undo/redo service for one instance (the co-editing room rebases its items over peers' edits). */
function resolveUndoRedoService(univer: Univer): unknown {
  const injector = (univer as unknown as { __getInjector?: () => { get: <T>(token: unknown) => T | undefined } }).__getInjector?.();
  try {
    return injector?.get<unknown>(IUndoRedoService as unknown) ?? null;
  } catch {
    return null;
  }
}

/** Univer Docs' typing-burst history, so the co-editing room stacks an open burst before a collaborator's edit applies. */
function resolveDocHistory(univer: Univer): { flushPendingChanges(unitId: string): void } | null {
  const injector = (univer as unknown as { __getInjector?: () => { get: <T>(token: unknown) => T | undefined } }).__getInjector?.();
  try {
    return injector?.get<{ flushPendingChanges(unitId: string): void }>(DocStateChangeManagerService as unknown) ?? null;
  } catch {
    return null;
  }
}

/** This view's body selection, so a collaborator's edit moves the caret with the characters (§6.8). */
function docSelectionPort(univer: Univer) {
  const svc = () => {
    const injector = (univer as unknown as { __getInjector?: () => { get: <T>(token: unknown) => T | undefined } }).__getInjector?.();
    return injector?.get<{
      getTextRanges: () => Array<{ startOffset: number; endOffset: number; segmentId?: string }> | null | undefined;
      replaceDocRanges: (ranges: Array<{ startOffset: number; endOffset: number }>) => void;
    }>(DocSelectionManagerService as unknown);
  };
  return {
    get: () => svc()?.getTextRanges()?.map((r) => ({ startOffset: r.startOffset, endOffset: r.endOffset, segmentId: r.segmentId ?? "" })) ?? null,
    set: (ranges: Array<{ startOffset: number; endOffset: number }>) => svc()?.replaceDocRanges(ranges),
  };
}

/** What a co-editing notice says, in plain words (our toast). */
function showCollabNotice(n: DocsOtNotice): void {
  if (showOfflineNotice(n, "document")) return;
  switch (n.kind) {
    case "rolled_back":
      if (n.reason === "replace") {
        toast({ title: "A version was restored", description: "Your last few letters weren't kept." });
        return;
      }
      if (n.reason === "opening" || n.reason === "rebuild") {
        toast({ title: n.reason === "opening" ? "Still connecting" : "Catching up", description: "Your last few letters weren't kept." });
        return;
      }
      toast({ title: "Your last edit was undone", description: "It clashed with a change someone else made at the same moment.", variant: "destructive" });
      return;
    case "overridden":
      toast({ title: "Someone edited the same text", description: "Their change came in last, so it was kept." });
      return;
    case "read_only":
      toast({ title: "This document stopped syncing", description: "Reload the page to keep editing.", variant: "destructive" });
      return;
    case "not_shared":
      toast(notSharedNotice());
      return;
    case "not_live":
      toast({ title: "Reconnecting", description: "Your last keystroke was made while reconnecting and was not kept." });
      return;
  }
}

/**
 * Join the document's co-editing room: the ordered log (C3) when the document's room exists or
 * `collab.ot_rooms` opens one, otherwise the 0.6 relay. A document already on the ordered log never falls back
 * to the relay (a relay seat's saves would never reach the room); a failed start says so. When the room check
 * itself cannot be answered (no network at open), it is retried with backoff under a "Reconnecting…" status
 * (`chooseRoom`) — an unknown answer is never read as "no room".
 */
async function startDocumentRoom(
  model: DocumentModel,
  documentId: string,
  displayName: string | null,
  onOffline: (state: OpOfflineState | "reconnecting" | null) => void,
  cancelled: () => boolean,
): Promise<void> {
  let ordered = false;
  try {
    const { documentUsesOrderedRoom, documentOtFactory } = await import("@ai-matrx/office/univer/collab");
    const { collabRoomExists } = await import("@ai-matrx/data/realtime/collab");
    const knob = await readCollabOtRooms("docs");
    const who = (await getClaimsUser(supabase)).data?.user?.id;
    const chosen = await chooseRoom({
      roomExists: () => collabRoomExists(supabase as unknown as Parameters<typeof collabRoomExists>[0], documentId),
      usesOrderedRoom: () =>
        documentUsesOrderedRoom(
          documentId,
          knob,
          async () => {
            const res = await getLatestDocumentSnapshot(documentId);
            return res.success && res.data === null;
          },
          who ? `${documentId}:${who}` : undefined,
        ),
      onReconnecting: (on) => onOffline(on ? "reconnecting" : null),
      cancelled,
    });
    if (chosen === null) return;
    ordered = chosen;
    if (!ordered) {
      await model.startCollab(collabFactoryFor(documentId));
      return;
    }
    const { data: userData } = await getClaimsUser(supabase);
    const uid = userData?.user?.id;
    if (!uid) return;
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await model.startOtRoom(
      documentOtFactory({
        documentId,
        uid,
        clientId,
        ...(displayName ? { displayName } : {}),
        readAntiEntropyIntervalMs: readCollabAntiEntropyMs,
        onNotice: showCollabNotice,
        onOffline,
        onIncident: (i) => console.warn(`[document] co-editing incident ${i.kind} at rev ${i.rev}`, i.detail ?? ""),
      }),
    );
  } catch (err) {
    console.warn("[document] co-editing room did not start", err);
    if (ordered) {
      toast({ title: "Live editing is not connected", description: "Reload the page before editing this document.", variant: "destructive" });
    }
  }
}

/**
 * The document's ONE collab room, bound to the model's command stream (so
 * every view in this tab is in the room through it). Lazy-imports yjs so
 * non-collab documents never load it.
 */
function collabFactoryFor(documentId: string): DocumentCollabFactory {
  return async (commandService, onAwareness, onReplaced, base) => {
    const { data: userData } = await getClaimsUser(supabase);
    const uid = userData?.user?.id;
    if (!uid) return null;
    const [{ WorkbookCollabSession }, { SupabaseYjsProvider }] = await Promise.all([
      import("@ai-matrx/office/univer/collab"),
      import("@ai-matrx/data/realtime/collab"),
    ]);
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let host = true; // solo = host
    // ONE saver per room (the lowest uid's tab leader): a second saver's checkpoint could trim entries
    // the other's snapshot lacks.
    const elect = () => session.electHost({ tabTieBreak: true }).isHost;
    const session = new WorkbookCollabSession({
      // The session takes an opaque resource id — the documentId rides the
      // `workbookId` field; the session only forwards it to makeProvider.
      workbookId: documentId,
      // A document's typed text IS its doc.mutation.* stream; without this the room drops it as cell-editor scratch.
      forwardDocumentMutations: true,
      // What this tab booted from: the room never replays an edit that snapshot already holds.
      base,
      uid,
      clientId,
      commandService,
      makeProvider: ({ workbookId: rid, clientId: cid, doc, awareness, onLeaderChange }) =>
        new SupabaseYjsProvider({
          workbookId: rid,
          // Distinct channel namespace — docs and workbooks never share a
          // broadcast room, even if their UUIDs accidentally collided.
          channelPrefix: "document",
          clientId: cid,
          doc,
          awareness,
          onLeaderChange,
          readAntiEntropyIntervalMs: readCollabAntiEntropyMs,
        }),
      onAwarenessChange: (aw) => {
        host = elect();
        onAwareness({
          states: new Map(aw.getStates() as Map<number, AwarenessState>),
          selfUid: uid,
        });
      },
      onReplaced: () => onReplaced(),
    });
    await session.start();
    host = elect();
    return {
      stop: () => session.stop(),
      isHost: () => host,
      announceReplaced: (snapshotId) => session.announceReplaced(snapshotId),
      coveredNow: () => session.coveredNow(),
      checkpoint: (snapshotId, covered) => session.checkpoint(snapshotId, covered),
    };
  };
}

/**
 * Univer's minimal empty document. Univer's dataStream encoding:
 *   \r  — paragraph break
 *   \n  — section break (must terminate the body)
 *
 * One empty paragraph + section break = a brand-new blank page.
 */
function defaultEmptyDocument(defaultPage: PageSetupValues | null = null): Partial<IDocumentData> {
  return {
    id: cryptoRandomId(),
    locale: LocaleType.EN_US,
    title: "Untitled document",
    body: {
      dataStream: "\r\n",
      paragraphs: [
        { startIndex: 0, paragraphId: createParagraphId(new Set()) },
      ],
      sectionBreaks: [{ startIndex: 1, sectionId: createSectionId(new Set()) }],
    },
    documentStyle: defaultPage
      ? ({ ...defaultDocumentPageStyle(), ...pageSetupCommandParams(defaultPage), [PAGE_COLOR_KEY]: defaultPage.pageColor } as NonNullable<IDocumentData["documentStyle"]>)
      : defaultDocumentPageStyle(),
  };
}

/** The open page's width in layout pixels (Letter's when the editor has no document yet). */
function readPageSetupWidth(api: PageSetupApiLike | null): number {
  const style = api?.getActiveDocument?.()?.getDocumentDataModel?.()?.getSnapshot().documentStyle as
    | { pageSize?: { width?: number } }
    | undefined;
  return style?.pageSize?.width ?? defaultDocumentPageStyle().pageSize?.width ?? 816;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function statusPillFor(s: WorkingCopyStatus): {
  text: string;
  icon: React.ReactNode;
  className: string;
} {
  switch (s) {
    case "saving":
      return {
        text: "Saving…",
        icon: <Loader2 className="size-3 animate-spin" />,
        className: "text-muted-foreground",
      };
    case "saved":
      return {
        text: "Saved",
        icon: null,
        className: "text-emerald-600 dark:text-emerald-500",
      };
    case "dirty":
      return {
        text: "Unsaved changes",
        icon: null,
        className: "text-amber-600 dark:text-amber-500",
      };
    case "error":
      return {
        text: "Save failed",
        icon: null,
        className: "text-destructive",
      };
    case "conflict":
      return {
        text: "Changed elsewhere",
        icon: null,
        className: "text-amber-600 dark:text-amber-500",
      };
    default:
      return { text: "", icon: null, className: "" };
  }
}

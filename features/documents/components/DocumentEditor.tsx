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
import { EditorToolbar } from "@/components/editor-chrome/EditorToolbar";
import { EditorSaveStatus } from "@/components/editor-chrome/EditorTitleField";
import { boundActions, matchesShortcut, type EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import { buildDocMenus, buildDocToolbar, type DocChromeHost, type DocsApiLike } from "@/features/documents/chrome/doc-commands";
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";
import { bodyTextOf } from "@/features/documents/document-body-text";

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
} from "@univerjs/core";
import { defaultTheme } from "@univerjs/themes";
import { UniverDocsCorePreset } from "@univerjs/preset-docs-core";
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
// Free Apache-2.0 docs add-ons: comments (thread state lives in the snapshot's
// resources) and find & replace. The File menu opens both.
import { UniverDocsThreadCommentPreset } from "@univerjs/preset-docs-thread-comment";
import docsCommentEnUS from "@univerjs/preset-docs-thread-comment/locales/en-US";
import "@univerjs/preset-docs-thread-comment/lib/index.css";
import { UniverFindReplacePlugin } from "@univerjs/find-replace";
import { UniverDocsFindReplacePlugin } from "@univerjs/docs-find-replace";
import findReplaceEnUS from "@univerjs/find-replace/locale/en-US";
import "@univerjs/find-replace/lib/index.css";
import { useRealtimeManager } from "@ai-matrx/realtime/react";

import { supabase } from "@/utils/supabase/client";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { Button } from "@ai-matrx/design-system";
import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { useToolToggle } from "@/features/canvas/host/toolCanvas";
import { toast } from "@/components/ui/use-toast";

import { fitZoomRatio } from "@/features/documents/utils/fitZoomRatio";
import { defaultDocumentPageStyle } from "@/features/documents/document-page-style";
import {
  renderDocumentCanvasColorsVerbatim,
  type ReplaceableInjector,
} from "@/features/documents/univer-doc-canvas-colors";
import { mountUniverDocument, replaceUniverDocument } from "@/features/documents/univer-mount-document";
import { useUniverDarkModeSync } from "@/lib/univer/useUniverDarkModeSync";
import { useUniverDocSurfaceTheme } from "@/features/documents/hooks/useUniverDocSurfaceTheme";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";
import { identifyUniverUser } from "@/lib/univer/identifyUniverUser";
import { registerMatrxImageStore } from "@/lib/univer/univerImageStore";
import { registerMissingUniverIcons } from "@/lib/univer/registerMissingUniverIcons";
import {
  routeUniverNotificationsToApp,
  type NotificationReplaceableInjector,
} from "@/lib/univer/routeUniverNotificationsToApp";
import { matrxImagePorts } from "@/lib/univer/matrxImagePorts";
import { disposeUniverInstance } from "@/lib/univer/disposeUniverInstance";
import { registerUniverFacadeDependencies } from "@/lib/univer/registerUniverFacadeDependencies";
import { RemoteCursorsLayer } from "@/lib/collab/RemoteCursorsLayer";
import { documentHistoryToggleInput } from "@/lib/univer/historyKinds";
import { DocumentPageReferenceCopyButton } from "@/features/documents/components/DocumentPageReferenceCopyButton";
import { DocumentGoogleLink, useDocumentGoogleLink } from "@/features/google-workspace/linked/EditorGoogleLinks";
import { copyCompoundReference } from "@/features/matrx-envelope/components/CompoundReferenceCopyButton";
import { buildDocumentPageReferenceFence } from "@/features/matrx-envelope/compoundReference";
import type { DocumentBodyPort } from "@/features/documents/document-body-text";
import {
  selectWorkingCopyStatus,
  type WorkingCopyStatus,
} from "@/lib/working-copy/workingCopySlice";
import {
  connectDocumentRealtime,
  documentWorkingCopy,
} from "@/features/documents/document-model/documentModels";
import type { DocumentModel, ParkedDocumentEditor } from "@/features/documents/document-model/documentModel";
import type {
  DocumentAwareness,
  DocumentCollabFactory,
} from "@/features/documents/document-model/documentModel";
import type { CommandServiceLike } from "@/features/workbooks/collab/WorkbookCollabSession";
import type { AwarenessState } from "@/lib/collab/types";

import { getClaimsUser } from "@ai-matrx/auth";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { WorkingCopyAlert } from "@/lib/working-copy/WorkingCopyAlert";

type Props = {
  documentId: string;
  /** Pass false to mount in viewer-only mode (no autosave). */
  editable?: boolean;
  /** Used as the document display name on export / shell. Falls back to documentId. */
  documentName?: string;
  /**
   * Opt in to v2 CRDT collab — see `lib/collab/FEATURE.md`.
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
  // ONE status per document, whichever view wrote it.
  const saveStatus: WorkingCopyStatus =
    useAppSelector((state) =>
      selectWorkingCopyStatus(state, documentWorkingCopy.key(documentId)),
    ) ?? "idle";
  // Snapshot history is a canvas tab beside the editor; the button toggles it.
  const snapshotHistory = useToolToggle(documentHistoryToggleInput(documentId, editable, documentName));

  // Univer boots ONCE per documentId (see boot effect). `editable` and
  // `collab` can change AFTER boot, so the model reads them through refs —
  // recreating Univer on a prop toggle is what made content load then vanish
  // (disposing Univer mid-render crashes its popups).
  const editableRef = useRef(editable);
  const collabRef = useRef(collab);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
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

  // A narrow editor (a phone) fits the page to its width, so the page reflows
  // into view instead of scrolling sideways. View-only: the saved page is untouched.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || bootState !== "ready" || unitId === null) return undefined;
    const apply = () => {
      const api = apiRef.current as unknown as {
        executeCommand?: (id: string, params?: unknown) => unknown;
      } | null;
      void api?.executeCommand?.("doc.operation.set-zoom-ratio", {
        unitId,
        zoomRatio: fitZoomRatio(container.clientWidth, defaultDocumentPageStyle().pageSize?.width ?? 595),
      });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
  }, [bootState, unitId]);

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
        if (collabRef.current) {
          void model.startCollab(collabFactoryFor(documentId)).catch((err) => {
            console.warn("[document] collab boot failed — falling back to solo mode", err);
          });
        }
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
          locales: { [LocaleType.EN_US]: merge({}, docsCoreEnUS, docsLinkEnUS, docsDrawingEnUS, docsCommentEnUS, findReplaceEnUS) },
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
            UniverDocsThreadCommentPreset(),
          ],
          plugins: [UniverFindReplacePlugin, UniverDocsFindReplacePlugin],
        });
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
        // inverts every fill on its way to the context and THROWS on a colour
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
            `[document] could not take Univer's dark-mode colour inversion off the canvas (${verbatim.reason}) — the page may render inverted or blank in dark mode`,
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
        const opening = await model.openingSnapshot(defaultEmptyDocument);
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

        if (collabRef.current) {
          void model.startCollab(collabFactoryFor(documentId)).catch((err) => {
            console.warn(
              "[document] collab boot failed — falling back to solo mode",
              err,
            );
          });
        }
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
    toast({ title: `${words.toLocaleString()} words`, description: `${text.replace(/\s/g, "").length.toLocaleString()} characters` });
  };
  const chromeHost: DocChromeHost | null =
    bootState === "ready" && apiRef.current
      ? {
          api: apiRef.current as unknown as DocsApiLike,
          editable,
          unitId: () => unitId,
          zoom: () => zoom,
          print: printDocument,
          wordCount: showWordCount,
          fullScreen: () => fullScreen,
          toggleFullScreen: () => setFullScreen((v) => !v),
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

  if (chrome) {
    return (
      <EditorDocumentHeader
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
              aria-pressed={snapshotHistory.isVisible}
              className="hidden aria-pressed:bg-accent sm:inline-flex"
              onClick={snapshotHistory.toggle}
            />
            <ControlButton
              variant="quiet"
              icon={<MessageSquare />}
              aria-label="Comments"
              title="Comments"
              className="hidden sm:inline-flex"
              disabled={bootState !== "ready"}
              onClick={() => void apiRef.current?.executeCommand("docs.operation.toggle-comment-panel")}
            />
            {chrome.actions}
          </>
        }
        toolbar={toolbar}
      >
        {googleLink.dialog}
        <div className="matrx-univer-shell relative flex min-h-0 flex-1 flex-col" data-document-editor="">
          {bootState === "load_error" && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
              Load failed: {loadError ?? "unknown"}
              <ErrorAlchemyMenu error={loadError} />
            </div>
          )}
          {chrome.notice}
          <WorkingCopyAlert kind={documentWorkingCopy} id={documentId} />
          <div className="relative min-h-0 flex-1">
            <div ref={containerRef} className="absolute inset-0" />
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
      <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-xs min-w-0">
        <div className="text-muted-foreground flex-1 min-w-0 truncate">
          {bootState === "booting" && (
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
          {bootState === "ready" && (
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
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleSaveNow}
              disabled={saveStatus === "saving"}
              title="Save a labeled snapshot now (bypass autosave debounce)"
            >
              <Save className="size-3" />
              <span className="hidden sm:inline">Save now</span>
            </Button>
          )}
          {bootState === "ready" && toolbarRightSlot}
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 gap-1 px-2 text-xs", snapshotHistory.isVisible && "bg-accent text-accent-foreground")}
            onClick={snapshotHistory.toggle}
            aria-pressed={snapshotHistory.isVisible}
            title="View snapshot history"
          >
            <History className="size-3" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>
      {toolbar}
      <WorkingCopyAlert kind={documentWorkingCopy} id={documentId} />
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Hidden — documentName is reserved for the parent shell label. */}
      <span className="hidden">{documentName}</span>
    </div>
  );
}

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

/**
 * The document's ONE collab room, bound to the model's command stream (so
 * every view in this tab is in the room through it). Lazy-imports yjs so
 * non-collab documents never load it.
 */
function collabFactoryFor(documentId: string): DocumentCollabFactory {
  return async (commandService, onAwareness, onReplaced) => {
    const { data: userData } = await getClaimsUser(supabase);
    const uid = userData?.user?.id;
    if (!uid) return null;
    const [{ WorkbookCollabSession }, { SupabaseYjsProvider }] = await Promise.all([
      import("@/features/workbooks/collab/WorkbookCollabSession"),
      import("@/lib/collab/SupabaseYjsProvider"),
    ]);
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let host = true; // solo = host
    const session = new WorkbookCollabSession({
      // The session takes an opaque resource id — the documentId rides the
      // `workbookId` field; the session only forwards it to makeProvider.
      workbookId: documentId,
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
        }),
      onAwarenessChange: (aw) => {
        host = session.electHost().isHost;
        onAwareness({
          states: new Map(aw.getStates() as Map<number, AwarenessState>),
          selfUid: uid,
        });
      },
      onReplaced: () => onReplaced(),
    });
    await session.start();
    return {
      stop: () => session.stop(),
      isHost: () => host,
      announceReplaced: (snapshotId) => session.announceReplaced(snapshotId),
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
function defaultEmptyDocument(): Partial<IDocumentData> {
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
    documentStyle: defaultDocumentPageStyle(),
  };
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

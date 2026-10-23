/**
 * WorkbookEditor — mounts Univer for one workbook.
 *
 * V1 storage model (matches `udt_v2_workbook_snapshots.sql`):
 *   - Load: read the LATEST snapshot for the workbook; if none, create an
 *     empty workbook.
 *   - Save: debounce 2.5s after the last edit, then write a NEW row to
 *     udt_workbook_snapshots. Append-only.
 *   - Realtime: subscribe to snapshot inserts; if a new snapshot arrives
 *     from a DIFFERENT user, hot-swap the workbook with the new snapshot.
 *     Snapshots from the CURRENT user are ignored (we just wrote it).
 *
 * NOT a CRDT layer. Concurrent edits = last-write-wins on the snapshot row.
 * Real per-cell collab (Yjs / Univer's @univerjs/collaboration plugin) is
 * a follow-up phase; this is the foundation it would build on.
 *
 * SSR: this component is "use client". The page that renders it should use
 * dynamic import with `ssr: false` so Univer never executes server-side.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, FilePlus2, FolderOpen, History, Info, Loader2, MessageSquare, Printer, Settings, Sheet, Upload } from "lucide-react";
import { EditorDetailsDialog, formatDetailDate } from "@/components/editor-chrome/EditorDetailsDialog";
import { importWorkbookFile, unsupportedFileReason } from "@ai-matrx/office/sheets/xlsx";
import { workbookSourceLabel } from "@ai-matrx/office/sheets";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { EditorDocumentHeader } from "@/features/shell/components/header/templates/EditorDocumentHeader";
import { useShellCanvasFullScreen } from "@/features/shell/components/ShellChromeMode";
import { EditorMenuBar, useMenuBarState } from "@/components/editor-chrome/EditorMenuBar";
import { useOpenFeedbackWindow } from "@/features/overlays/definitions/feedbackDialog.overlay";
import { EditorToolbar } from "@/components/editor-chrome/EditorToolbar";
import { EditorRibbon } from "@/components/editor-chrome/EditorRibbon";
import { OfficeLookSwitch } from "@/features/file-actions/skin/OfficeLookSwitch";
import { SHEET_RIBBON } from "@/features/workbooks/chrome/sheet-ribbon";
import { EditorSaveStatus } from "@/components/editor-chrome/EditorTitleField";
import { boundActions, matchesShortcut, type EditorMenuEntry, type Workbook } from "@ai-matrx/office/core";
import { buildSheetMenus, buildSheetToolbar, sheetPageSetupRow, type SheetChromeHost, type SheetsApiLike } from "@/features/workbooks/chrome/sheet-commands";
import { createWorkbook } from "@ai-matrx/office/sheets";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { downloadSheetAsCsv, downloadSheetAsHtml, downloadSheetAsPdf, downloadSheetAsTsv, printSheet } from "@ai-matrx/office/sheets";
import { pageSetupFromMetadata, type SheetPageSetup } from "@ai-matrx/office/sheets";
import { readSheetPageSetup, writeSheetPageSetup } from "@ai-matrx/office/sheets";
import { SheetPageSetupDialog } from "@/features/workbooks/components/SheetPageSetupDialog";
import { SheetToolPanels, type PanelApi } from "@/features/workbooks/components/SheetToolPanels";
import { useSheetExtras } from "@/features/workbooks/components/useSheetExtras";
import type { CellRange } from "@ai-matrx/office/sheets";
import { useFileRecordMenu } from "@/features/file-actions/useFileRecordMenu";
import { WORKBOOK_ADAPTER } from "@/features/file-actions/adapters";

import {
  createUniver,
  LocaleType,
  merge,
  type FUniver,
} from "@univerjs/presets";
import type { IWorkbookData, Univer } from "@univerjs/core";
import { defaultTheme } from "@univerjs/themes";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
// Free Apache-2.0 add-ons: Google-Sheets-class basics. Their state lives in
// the workbook snapshot (cells, resources), so autosave/history/collab carry it.
import { UniverSheetsSortPreset } from "@univerjs/preset-sheets-sort";
import sheetsSortEnUS from "@univerjs/preset-sheets-sort/locales/en-US";
import "@univerjs/preset-sheets-sort/lib/index.css";
import { UniverSheetsFilterPreset } from "@univerjs/preset-sheets-filter";
import sheetsFilterEnUS from "@univerjs/preset-sheets-filter/locales/en-US";
import "@univerjs/preset-sheets-filter/lib/index.css";
import { UniverSheetsTablePreset } from "@univerjs/preset-sheets-table";
import sheetsTableEnUS from "@univerjs/preset-sheets-table/locales/en-US";
import "@univerjs/preset-sheets-table/lib/index.css";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import sheetsDVEnUS from "@univerjs/preset-sheets-data-validation/locales/en-US";
import "@univerjs/preset-sheets-data-validation/lib/index.css";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import sheetsCFEnUS from "@univerjs/preset-sheets-conditional-formatting/locales/en-US";
import "@univerjs/preset-sheets-conditional-formatting/lib/index.css";
import { UniverSheetsFindReplacePreset } from "@univerjs/preset-sheets-find-replace";
import sheetsFREnUS from "@univerjs/preset-sheets-find-replace/locales/en-US";
import "@univerjs/preset-sheets-find-replace/lib/index.css";
import { UniverSheetsHyperLinkPreset } from "@univerjs/preset-sheets-hyper-link";
import sheetsLinkEnUS from "@univerjs/preset-sheets-hyper-link/locales/en-US";
import "@univerjs/preset-sheets-hyper-link/lib/index.css";
import { UniverSheetsDrawingPreset } from "@univerjs/preset-sheets-drawing";
import sheetsDrawingEnUS from "@univerjs/preset-sheets-drawing/locales/en-US";
import "@univerjs/preset-sheets-drawing/lib/index.css";
import { UniverSheetsNotePreset } from "@univerjs/preset-sheets-note";
import actionRecorderEnUS from "@univerjs/action-recorder/locale/en-US";
import { UniverActionRecorderPlugin } from "@univerjs/action-recorder";
import "@univerjs/action-recorder/lib/index.css";
import sheetsNoteEnUS from "@univerjs/preset-sheets-note/locales/en-US";
import "@univerjs/preset-sheets-note/lib/index.css";

import { supabase } from "@/utils/supabase/client";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { EditorBootCover, useFirstPaint } from "@/components/editor-chrome/EditorBootCover";
import { Button } from "@ai-matrx/design-system/controls";
import { useToolToggle } from "@/features/canvas/host/toolCanvas";
import { toast } from "@/components/ui/use-toast";
import { workbookSeatOptions, type WorkbookSeatApi } from "@/features/workbooks/collab/workbookSeatOptions";

import { useWorkbookRealtime } from "@ai-matrx/office/univer/realtime";
import "@/lib/univer-host";
import { useUniverDarkModeSync } from "@ai-matrx/office/univer";
import { identifyUniverUser } from "@ai-matrx/office/univer";
import { registerMatrxImageStore } from "@ai-matrx/office/univer";
import { registerMissingUniverIcons } from "@ai-matrx/office/univer";
import {
  routeUniverNotificationsToApp,
  type NotificationReplaceableInjector,
} from "@ai-matrx/office/univer";
import { matrxImagePorts } from "@ai-matrx/office/univer";
import { disposeUniverInstance } from "@ai-matrx/office/univer";
import { isWorkbookSnapshotMutation } from "@ai-matrx/office/univer";
import { mayAutosave, remoteOriginOf } from "@ai-matrx/data/realtime/collab";
import { readCollabAntiEntropyMs } from "@/lib/knobs/collabAntiEntropy";
import { readCollabOtRooms } from "@/lib/knobs/collabOtRooms";
import { chooseRoom } from "@/lib/collab/choose-room";
import { RemotePeerChips as RemoteCursorsLayer } from "@ai-matrx/data/realtime/collab/react";
import { useAppStore } from "@/lib/redux/hooks";
import { selectActiveUserAvatarUrl, selectDisplayName } from "@/lib/redux/selectors/userSelectors";
import { WorkbookCursorOverlay } from "@/features/workbooks/components/WorkbookCursorOverlay";
import { useSheetComments } from "@/features/workbooks/components/useSheetComments";
import { useSheetSeatLock } from "@/features/workbooks/components/useSheetSeatLock";
import { installSheetCommentAnchors } from "@ai-matrx/office/sheets/comment-anchors";
import { getLatestSnapshot, saveSnapshot } from "@ai-matrx/office/sheets";
import { useWorkbookGoogleLink, useLiveGoogleAdapter } from "@/features/google-workspace/linked/EditorGoogleLinks";
import { registerWorkbookScopeSource } from "@ai-matrx/office/sheets";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { isServiceFailure } from "@ai-matrx/records/core";
import { downloadUniverAsXlsx } from "@ai-matrx/office/sheets/xlsx";
import { resolveExportImage } from "@ai-matrx/office/univer";
import { WORKBOOK_HISTORY_KIND, workbookHistoryToggleInput } from "@ai-matrx/office/univer/history";
import { useHistorySubject } from "@/features/canvas/host/historySubject";
import { copyActiveSheetReference } from "@/features/workbooks/components/WorkbookSheetReferenceCopyButton";
import { useWorkbookTableLink } from "@/features/workbooks/table-link/WorkbookTableLink";
import type { OpOfflineState } from "@ai-matrx/data/realtime/collab";
import { swapContentGuarded, registerOpenEditorContent, type SavedEditorSnapshot } from "@ai-matrx/office/univer";
import { stampCovered, takeCovered } from "@ai-matrx/office/univer";

import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

// LOAD MARKER (heavy: must never load before the person engages) — read by the page-load trace; no import, no build edge.
if (typeof window !== "undefined") performance.mark("load:heavy:Univer sheets editor", { detail: { home: ["/workbooks"] } });

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Characters Excel (and therefore Univer) rejects in a sheet name. Used by the
 * `workbook_sheet_names` surface write target so a bad name is refused with a
 * readable reason instead of failing silently inside Univer.
 */
/** The longest an unbroken run of edits waits before the autosave runs anyway (see the debounce below). */
const WORKBOOK_SAVE_MAX_WAIT_MS = 20_000;

const SHEET_NAME_FORBIDDEN_CHARS = /[:\\/?*[\]]/;

type Props = {
  workbookId: string;
  /** Pass false to mount in viewer-only mode (no autosave). */
  editable?: boolean;
  /** Used as the XLSX filename on export. Falls back to workbookId. */
  workbookName?: string;
  /**
   * Opt in to v2 CRDT collab — see `@ai-matrx/data/realtime` README (collab).
   * Defaults to `false` so v1 behavior (snapshot-per-save last-write-wins)
   * is unchanged until the workbook page explicitly turns this on. When
   * `true`, the editor wires a `WorkbookCollabSession`, broadcasts mutations
   * via Supabase Broadcast, and renders a remote-cursors strip in the
   * toolbar. Snapshot writes become host-gated.
   */
  collab?: boolean;
  /**
   * The page's parts of the Google-Sheets header this editor draws
   * (`EditorDocumentHeader`): the title field and its marks, the page actions
   * (Share, last), and the rename path the File menu's Rename row uses.
   */
  chrome: {
    backHref: string;
    title: React.ReactNode;
    titleMarks?: React.ReactNode;
    actions?: React.ReactNode;
    onRename?: (name: string) => Promise<void>;
  };
  /** The open workbook row: feeds the shared File menu (copy, move, star, trash). Omit to hide it. */
  record?: Workbook | null;
  /** Called after "Move to project" so the page can refresh its copy of the row. */
  onProjectMoved?: (projectId: string | null) => void;
  /** Inside a board tile: the header leaves the shell alone and its product mark is not a link. */
  embedded?: boolean;
};

export default function WorkbookEditor({
  workbookId,
  editable = true,
  workbookName,
  collab = false,
  chrome,
  record = null,
  onProjectMoved,
  embedded = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<FUniver | null>(null);
  const univerRef = useRef<Univer | null>(null);
  // Render-safe copies of the boot-assigned instances (refs can't be read in render).
  const [univerInstance, setUniverInstance] = useState<Univer | null>(null);
  const [univerApiInstance, setUniverApiInstance] = useState<FUniver | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBurstStartRef = useRef<number | null>(null);
  const lastSaveByUserRef = useRef<string | null>(null);
  /** The snapshot row the canvas shows (loaded, saved, or replaced to). */
  const shownSnapshotIdRef = useRef<string | null>(null);
  /** The collab-room entries the shown snapshot already holds (never replayed on top of it). */
  const baseCoveredRef = useRef<ReadonlySet<string>>(new Set());
  /** True while the content is being swapped: what Univer emits then is not an edit. */
  const replacingRef = useRef(false);
  const appStore = useAppStore();
  // V2 collab session — null until `collab=true` AND Univer has booted.
  // See `../collab/FEATURE.md` for the full architecture; this ref is the
  // sole live connection between Univer's command service and Yjs.
  const collabSessionRef = useRef<
    import("@ai-matrx/office/univer/collab").WorkbookCollabSession | null
  >(null);
  // Univer selection-listener disposer, kept ref-side so the unmount path can
  // reach it regardless of which render registered it.
  // The ordered-log room (COLLAB-DESIGN §6, C6) — set instead of the relay session when this workbook's room
  // exists or `collab.ot_rooms` opens one. Exactly one of the two is ever live.
  const otRoomRef = useRef<import("@ai-matrx/office/univer/collab").WorkbookOtRoomHandle | null>(null);
  const collabSelectionDisposerRef = useRef<{ dispose: () => void } | null>(
    null,
  );
  const [remoteAwareness, setRemoteAwareness] = useState<
    Map<number, import("@ai-matrx/data/realtime/collab").AwarenessState>
  >(new Map());
  const [collabIsHost, setCollabIsHost] = useState(true); // solo = host by default
  const [collabSelfUid, setCollabSelfUid] = useState<string>("");

  const [bootState, setBootState] = useState<
    "booting" | "ready" | "load_error"
  >("booting");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  /** C10: the ordered room's offline state (unsent edits kept on this device, syncing); null on the relay. */
  /** Set when the editor closes: a room check still retrying must stop. */
  const roomClosedRef = useRef(false);
  const [collabOffline, setCollabOffline] = useState<OpOfflineState | "reconnecting" | null>(null);
  // Snapshot history is a canvas tab beside the editor; the button toggles it.
  const snapshotHistory = useToolToggle(workbookHistoryToggleInput(workbookId, editable, workbookName));
  useHistorySubject(WORKBOOK_HISTORY_KIND, workbookId);
  const router = useRouter();
  const menuBar = useMenuBarState();
  const [formulaBarHidden, setFormulaBarHidden] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  useShellCanvasFullScreen(fullScreen);
  // The toolbar reads the live selection (bold, font, zoom); a tick re-reads it
  // after every command, at most once a frame.
  const [, setChromeTick] = useState(0);
  const chromeFrameRef = useRef<number | null>(null);
  const bumpChrome = useCallback(() => {
    if (chromeFrameRef.current !== null) return;
    chromeFrameRef.current = requestAnimationFrame(() => {
      chromeFrameRef.current = null;
      setChromeTick((t) => t + 1);
    });
  }, []);

  // Univer boots ONCE per workbookId (see boot effect). `editable`, `collab`,
  // and the collab host-election flag can change AFTER boot, so we read them
  // from refs inside the long-lived command listener rather than the effect
  // deps — recreating Univer on a prop toggle disposes it mid-render and
  // crashes its popups (content loads, then vanishes).
  const editableRef = useRef(editable);
  const collabRef = useRef(collab);
  const collabIsHostRef = useRef(collabIsHost);
  /** The person whose tabs write the canonical snapshot (null until a peer is known = solo). */
  const collabHostUidRef = useRef<string | null>(null);
  const collabSelfUidRef = useRef("");
  /** True once an edit this tab may write has been seen since the last save. */
  const saveAllowedRef = useRef(false);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  useEffect(() => {
    collabRef.current = collab;
  }, [collab]);
  useEffect(() => {
    collabIsHostRef.current = collabIsHost;
  }, [collabIsHost]);
  useEffect(() => {
    collabSelfUidRef.current = collabSelfUid;
  }, [collabSelfUid]);

  // Initial dark-mode value for createUniver; live changes handled by
  // useUniverDarkModeSync below (avoids a light→dark flash on boot).
  const themeMode = useThemeMode();
  const darkModeRef = useRef(themeMode === "dark");
  useEffect(() => {
    darkModeRef.current = themeMode === "dark";
  }, [themeMode]);

  // Keep Univer's dark mode in lockstep with the app theme (Facade API).
  useUniverDarkModeSync(apiRef, bootState === "ready");

  // Stable identity for the realtime callback so the hook doesn't resubscribe
  // every render.
  const onRemoteSnapshot = useCallback(
    (evt: { snapshotId: string; createdBy: string | null }) => {
      // V2 (collab=true): the CRDT is the source of truth for live edits,
      // and the elected host writes snapshots as periodic checkpoints. A
      // remote-snapshot hot-swap here would overwrite the local Yjs doc and
      // momentarily desync peers. Suppress unless the local doc is genuinely
      // far behind (a disaster-recovery path tracked separately). For v1
      // (collab=false) the old behavior is preserved: refetch on any remote
      // snapshot from another user.
      if (collab) return;
      if (
        evt.createdBy &&
        lastSaveByUserRef.current &&
        evt.createdBy === lastSaveByUserRef.current
      ) {
        // Our own save echoed back via realtime — ignore.
        return;
      }
      // A different client saved. Refetch + reload.
      void reloadFromLatest();
    },
    // reloadFromLatest is stable via useCallback below; including it would
    // create a cycle. Captured by ref via apiRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collab],
  );

  // V2 disables the snapshot-driven hot-swap (CRDT handles live state);
  // gating the hook call keeps the realtime subscription off entirely when
  // collab is on. Zero overhead, zero redundant refetches.
  useWorkbookRealtime(workbookId, onRemoteSnapshot, { enabled: !collab });

  const reloadFromLatest = useCallback(async () => {
    if (!apiRef.current) return;
    const res = await getLatestSnapshot(workbookId);
    if (isServiceFailure(res)) {
      toast({
        title: "Could not load latest workbook state",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    const row = res.data;
    // Already showing it (our own save, or a joiner that loaded it): nothing to swap.
    if (!row?.snapshot || row.id === shownSnapshotIdRef.current) return;
    replaceWorkbookContent({ id: row.id, snapshot: row.snapshot }, { announce: false });
    // replaceWorkbookContent is declared below and stable (refs only).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbookId]);

  // Boot Univer EXACTLY ONCE per workbookId. `editable` / `collab` are read
  // from refs (above) so toggling them never tears the instance down — the
  // lifecycle Univer's docs assume (create once, dispose on unmount).
  useEffect(() => {
    if (!containerRef.current) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { univer, univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: {
            [LocaleType.EN_US]: merge({}, sheetsCoreEnUS, sheetsSortEnUS, sheetsFilterEnUS, sheetsTableEnUS, sheetsDVEnUS, sheetsCFEnUS, sheetsFREnUS, sheetsLinkEnUS, sheetsDrawingEnUS, sheetsNoteEnUS, actionRecorderEnUS),
          },
          theme: defaultTheme,
          darkMode: darkModeRef.current,
          presets: [
            UniverSheetsCorePreset({
              container: containerRef.current as HTMLElement,
              // 'simple' collapses Univer's "Start / Formulas / Data" ribbon
              // tabs into a single icon row — keeps the editor's vertical
              // footprint tight (Google-Sheets-shaped), which matters on
              // phones and short laptop screens.
              ribbonType: "simple",
              // Google's menu bar + toolbar replace Univer's ribbon
              // (components/editor-chrome); the formula bar stays.
              toolbar: false,
              // Zoom lives in the toolbar and View menu, as in Google; the footer keeps the sheet tabs.
              footer: { zoomSlider: false },
            }),
            UniverSheetsSortPreset(),
            UniverSheetsFilterPreset(),
            UniverSheetsTablePreset(),
            UniverSheetsDataValidationPreset(),
            UniverSheetsConditionalFormattingPreset(),
            UniverSheetsFindReplacePreset(),
            UniverSheetsHyperLinkPreset(),
            UniverSheetsDrawingPreset(),
            UniverSheetsNotePreset(),
          ],
        });
        if (cancelled) {
          univer.dispose();
          return;
        }
        univer.registerPlugin(UniverActionRecorderPlugin);
        // Cell comment anchors: registered before the workbook unit so its saved anchors load with it (C9).
        installSheetCommentAnchors(univer);
        univerRef.current = univer;
        apiRef.current = univerAPI;
        setUniverInstance(univer);
        setUniverApiInstance(univerAPI);
        // ONE toaster per page: Univer's notices ride the app's toast path, and
        // Univer never mounts its own sonner Toaster (every toast showed twice).
        const routed = routeUniverNotificationsToApp(
          univer.__getInjector() as unknown as NotificationReplaceableInjector,
        );
        if (!routed.applied) {
          console.warn(`[univer] notifications not routed to the app toaster (${routed.reason}) — toasts may show twice`);
        }
        // Pictures go to the file store; the snapshot keeps only a reference.
        registerMissingUniverIcons(univer.__getInjector());
        registerMatrxImageStore(univer.__getInjector(), matrxImagePorts);
        void identifyUniverUser(univer.__getInjector()).catch((err) =>
          console.warn("[univer] could not attribute edits to the signed-in user", err),
        );

        // Hydrate from the latest persisted snapshot, or create empty.
        const res = await getLatestSnapshot(workbookId);
        if (cancelled) return;
        if (isServiceFailure(res)) {
          setLoadError(res.error);
          setBootState("load_error");
          return;
        }
        const loaded = takeCovered((res.data?.snapshot ?? null) as Partial<IWorkbookData> | null);
        baseCoveredRef.current = loaded.covered;
        const initial: Partial<IWorkbookData> = loaded.snapshot ?? defaultEmptyWorkbook();
        apiRef.current.createWorkbook(initial);
        shownSnapshotIdRef.current = res.data?.id ?? null;
        setBootState("ready");

        // Command stream → debounced autosave. Registered for the lifetime of
        // the instance; viewer-mode (editable=false) is honored at fire time
        // via editableRef so a later edit-permission grant needs no remount.
        // D97: only snapshot-affecting MUTATIONs mark the workbook dirty —
        // scroll / selection / viewport commands must never trigger a save.
        apiRef.current.addEvent(
          apiRef.current.Event.CommandExecuted,
          (command) => {
            bumpChrome();
            if (!isWorkbookSnapshotMutation(command)) return;
            if (!editableRef.current || replacingRef.current) return;
            setSaveStatus("dirty");
            // One edit is written ONCE: by the tab that made it (or, for another person's edit, the
            // elected host) — never by every tab that merely applied it (mayAutosave).
            if (
              otRoomRef.current ||
              mayAutosave({
                collab: collabRef.current,
                isHost: collabIsHostRef.current,
                hostUid: collabHostUidRef.current,
                selfUid: collabSelfUidRef.current,
                remoteFrom: remoteOriginOf(command.params),
              })
            ) {
              saveAllowedRef.current = true;
            }
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            // Debounce from the last edit, but never past WORKBOOK_SAVE_MAX_WAIT_MS from the first of an unbroken run:
            // in a live room every peer's cell resets this timer, so the checkpoint (what thumbnails and previews read)
            // otherwise waits for the first pause in everyone's typing (measured 76 s for 198 cells, fold2 2026-10-19).
            const now = Date.now();
            if (saveBurstStartRef.current == null) saveBurstStartRef.current = now;
            const wait = Math.max(0, Math.min(2500, saveBurstStartRef.current + WORKBOOK_SAVE_MAX_WAIT_MS - now));
            saveTimerRef.current = setTimeout(() => {
              saveBurstStartRef.current = null;
              if (!editableRef.current) return;
              if (!saveAllowedRef.current) return;
              saveAllowedRef.current = false;
              void performSave();
            }, wait);
          },
        );

        // V2 CRDT collab — opt-in. Mounted only after Univer is ready so we
        // can resolve ICommandService and the local user identity.
        //
        // Fire-and-forget with a hard try/catch: a failure in collab boot
        // (offline, broken injector path, dynamic-import miss, permission
        // glitch) must NEVER take the workbook page down. The user keeps a
        // working solo workbook; collab silently degrades with a console
        // warning that surfaces in error tracking.
        if (collabRef.current) {
          void startWorkbookRoom().catch((err) => {
            console.warn(
              "[workbook] collab boot failed — falling back to solo mode",
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

    roomClosedRef.current = false;
    return () => {
      cancelled = true;
      roomClosedRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      collabSelectionDisposerRef.current?.dispose();
      collabSelectionDisposerRef.current = null;
      collabSessionRef.current?.stop();
      collabSessionRef.current = null;
      otRoomRef.current?.stop();
      otRoomRef.current = null;
      const univer = univerRef.current;
      univerRef.current = null;
      apiRef.current = null;
      disposeUniverInstance(univer);
    };
    // performSave / startCollabSession are stable per workbookId and declared
    // below this effect; intentionally omitted so Univer boots exactly once
    // per workbook (route nav remounts via the workbookId change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbookId]);

  /**
   * Join the workbook's co-editing room: the ordered log (C6) when the workbook's room exists or
   * `collab.ot_rooms` opens one, otherwise the 0.6 relay. A workbook already on the ordered log never falls
   * back to the relay (a relay seat's saves would never reach the room); a failed start says so. When the room
   * check itself cannot be answered (no network at open), it is retried with backoff under a "Reconnecting…"
   * status (`chooseRoom`) — an unknown answer is never read as "no room".
   */
  const startWorkbookRoom = async () => {
    let ordered = false;
    try {
      const { workbookUsesOrderedRoom } = await import("@ai-matrx/office/univer/collab");
      const { collabRoomExists } = await import("@ai-matrx/data/realtime/collab");
      const knob = await readCollabOtRooms("sheets");
      const who = (await getClaimsUser(supabase)).data?.user?.id;
      const chosen = await chooseRoom({
        roomExists: () => collabRoomExists(supabase as unknown as Parameters<typeof collabRoomExists>[0], workbookId),
        usesOrderedRoom: () =>
          workbookUsesOrderedRoom(
            workbookId,
            knob,
            async () => {
              const res = await getLatestSnapshot(workbookId);
              return !isServiceFailure(res) && res.data === null;
            },
            who ? `${workbookId}:${who}` : undefined,
          ),
        onReconnecting: (on) => setCollabOffline(on ? "reconnecting" : null),
        cancelled: () => roomClosedRef.current,
      });
      if (chosen === null) return;
      ordered = chosen;
    } catch (err) {
      // An unanswered question is never "no room": do not join the relay for a workbook that may be on the ordered log.
      console.warn("[workbook] could not choose the co-editing room", err);
      toast({ title: "Live editing is not connected", description: "Reload the page before editing this workbook.", variant: "destructive" });
      return;
    }
    if (!ordered) return startCollabSession();
    try {
      await startOrderedRoom();
    } catch (err) {
      console.warn("[workbook] co-editing room did not start", err);
      toast({ title: "Live editing is not connected", description: "Reload the page before editing this workbook.", variant: "destructive" });
    }
  };

  /** Show `snapshot` in place of what is open, keeping the unit id (the ordered room's load and restore). */
  const swapInPlace = (snapshot: unknown) => {
    const api = apiRef.current;
    if (!api) throw new Error("The workbook editor is not ready yet. Try again in a moment.");
    collabSelectionDisposerRef.current?.dispose();
    collabSelectionDisposerRef.current = null;
    replacingRef.current = true;
    try {
      const current = api.getActiveWorkbook();
      const next = { ...(snapshot as Partial<IWorkbookData>) };
      if (current) {
        next.id = current.getId();
        api.disposeUnit(current.getId());
      }
      api.createWorkbook(next);
    } finally {
      replacingRef.current = false;
    }
    wireCollabSelection();
  };

  /** The ordered room asks for the record's coalesced save; the room decides whether this seat writes. */
  const scheduleSave = () => {
    if (!editableRef.current) return;
    saveAllowedRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!saveAllowedRef.current) return;
      saveAllowedRef.current = false;
      void performSave();
    }, 2500);
  };

  const startOrderedRoom = async () => {
    const univer = univerRef.current;
    if (!univer) return;
    const { data: userData } = await getClaimsUser(supabase);
    const uid = userData?.user?.id;
    if (!uid) return;
    setCollabSelfUid(uid);
    const { startWorkbookOrderedRoom } = await import("@/features/workbooks/collab/workbookOrderedRoom");
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const handle = await startWorkbookOrderedRoom({
      univer,
      workbookId,
      uid,
      clientId,
      // the other seats' chips show this person's name and picture (Docs passes the same two)
      displayName: selectDisplayName(appStore.getState()),
      avatarUrl: selectActiveUserAvatarUrl(appStore.getState()) ?? null,
      unitId: () => apiRef.current?.getActiveWorkbook()?.getId() ?? null,
      load: swapInPlace,
      markDirty: scheduleSave,
      readAntiEntropyIntervalMs: readCollabAntiEntropyMs,
      onOffline: setCollabOffline,
      onAwareness: (states) => {
        setRemoteAwareness(states);
        setCollabIsHost(otRoomRef.current?.isSaver() ?? true);
      },
    });
    if (univerRef.current !== univer) {
      handle.stop(); // the editor unmounted while the room opened
      return;
    }
    otRoomRef.current = handle;
    setCollabIsHost(handle.isSaver());
    wireCollabSelection();
  };

  // Lazy-import the collab classes so the bundle for non-collab users stays
  // free of yjs / y-protocols. Resolved at session-start time only.
  const startCollabSession = useCallback(async () => {
    if (!univerRef.current) return;
    const { data: userData } = await getClaimsUser(supabase);
    const uid = userData?.user?.id;
    if (!uid) return;
    setCollabSelfUid(uid);

    const [{ WorkbookCollabSession }, { SupabaseYjsProvider }] =
      await Promise.all([
        import("@ai-matrx/office/univer/collab"),
        import("@ai-matrx/data/realtime/collab"),
      ]);

    // Univer's `__getInjector` is technically a private path (the double
    // underscore is the warning). On some build/runtime combos it returns
    // undefined or `injector.get(ICommandService)` returns undefined; both
    // would crash the page if uncaught. Probe defensively — when we can't
    // resolve the command service, log + return so the editor runs in
    // solo-without-collab mode rather than tearing down the route.
    let commandService:
      | import("@ai-matrx/office/univer/collab").CommandServiceLike
      | null = null;
    try {
      const injector = (
        univerRef.current as unknown as {
          __getInjector?: () => {
            get: <T>(token: unknown) => T | undefined;
          };
        }
      ).__getInjector?.();
      if (!injector) {
        console.warn("[workbook] collab: Univer injector unavailable");
        return;
      }
      const { ICommandService } = await import("@univerjs/core");
      const resolved = injector.get<
        import("@ai-matrx/office/univer/collab").CommandServiceLike
      >(ICommandService as unknown);
      if (
        !resolved ||
        typeof resolved.onMutationExecutedForCollab !== "function"
      ) {
        console.warn(
          "[workbook] collab: ICommandService missing the onMutationExecutedForCollab hook",
        );
        return;
      }
      commandService = resolved;
    } catch (err) {
      console.warn("[workbook] collab: command-service resolution threw", err);
      return;
    }

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const session = new WorkbookCollabSession({
      workbookId,
      uid,
      clientId,
      commandService,
      // Each seat mounts its own Univer unit: peers' mutations are re-addressed
      // to it, and one that cannot be applied says so and re-syncs.
      ...workbookSeatOptions({
        getApi: () => apiRef.current as unknown as WorkbookSeatApi,
        onFailed: () => {
          toast({
            title: "A collaborator's change could not be applied",
            description: "Showing the last saved version of this workbook.",
            variant: "destructive",
          });
          void reloadFromLatest();
        },
      }),
      makeProvider: ({ workbookId: wid, clientId: cid, doc, awareness, onLeaderChange }) =>
        new SupabaseYjsProvider({
          workbookId: wid,
          clientId: cid,
          doc,
          awareness,
          onLeaderChange,
          readAntiEntropyIntervalMs: readCollabAntiEntropyMs,
        }),
      onAwarenessChange: (aw) => {
        setRemoteAwareness(
          new Map(
            aw.getStates() as Map<
              number,
              import("@ai-matrx/data/realtime/collab").AwarenessState
            >,
          ),
        );
        const election = session.electHost({ tabTieBreak: true });
        collabHostUidRef.current = election.hostUid;
        setCollabIsHost(election.isHost);
      },
      // A peer restored history / took Google's version: show the newest save.
      onReplaced: () => void reloadFromLatest(),
      // What this seat booted from: the room never replays an edit that snapshot already holds, and a
      // seat that booted from an older snapshot than the room's newest checkpoint loads the newest first.
      base: {
        snapshotId: () => shownSnapshotIdRef.current,
        covered: () => baseCoveredRef.current,
        reload: () => reloadFromLatest(),
      },
    });

    collabSessionRef.current = session;
    await session.start();

    wireCollabSelection();
  }, [workbookId]);

  // Stream local selection changes into Awareness so remote peers can render
  // this user's cell ring. Bound to the CURRENT workbook unit, so a content
  // swap unbinds it first (Univer's facade reads the current unit inside the
  // listener and throws on none) and rebinds it to the new unit after.
  const wireCollabSelection = () => {
    collabSelectionDisposerRef.current?.dispose();
    collabSelectionDisposerRef.current = null;
    if (!collabSessionRef.current && !otRoomRef.current) return;
    try {
      const fb = (
        apiRef.current as unknown as {
          getActiveWorkbook?: () =>
            | {
                getActiveSheet?: () => { getSheetId: () => string } | null;
                onSelectionChange?: (
                  cb: (
                    selections: Array<{
                      startRow: number;
                      startColumn: number;
                    }>,
                  ) => void,
                ) => { dispose: () => void };
              }
            | undefined;
        } | null
      )?.getActiveWorkbook?.();
      if (fb?.onSelectionChange) {
        collabSelectionDisposerRef.current = fb.onSelectionChange((selections) => {
          const target = collabSessionRef.current ?? otRoomRef.current;
          if (!target) return;
          const first = selections?.[0];
          if (!first) return;
          const sheetId = fb.getActiveSheet?.()?.getSheetId() ?? null;
          target.setCursor({
            sheetId,
            row: first.startRow,
            col: first.startColumn,
          });
        });
      }
    } catch (err) {
      console.warn("[workbook] collab: selection wiring failed", err);
    }
  };

  /**
   * THE content swap for this editor (see lib/univer/openEditorContent): show
   * a SAVED snapshot in place of what is open. The pending autosave is dropped
   * (it would write the old content back over the new one), the unit keeps its
   * id (peers' mutations address it), and with `announce` every collab peer
   * reloads the same snapshot and the shared log is emptied.
   */
  const replaceWorkbookContent = (
    row: SavedEditorSnapshot,
    { announce }: { announce: boolean },
  ): void | Promise<void> => {
    // An ordered-log room restores through collab_replace: one atomic replace every seat applies.
    const room = otRoomRef.current;
    if (room) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return room.replace(takeCovered(row.snapshot).snapshot).then(() => setSaveStatus("idle"));
    }
    const api = apiRef.current;
    if (!api) throw new Error("The workbook editor is not ready yet. Try again in a moment.");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const session = collabSessionRef.current;
    collabSelectionDisposerRef.current?.dispose();
    collabSelectionDisposerRef.current = null;
    const swapTo = (content: unknown) => {
      const current = api.getActiveWorkbook();
      const snapshot = { ...(content as Partial<IWorkbookData>) };
      if (current) {
        snapshot.id = current.getId();
        api.disposeUnit(current.getId());
      }
      api.createWorkbook(snapshot);
    };
    const previous = api.getActiveWorkbook()?.save() ?? null;
    // Guarded: if the new content cannot be created, the old content is put back at once (never a
    // blank grid), then the latest saved version is reloaded; the error still reaches the caller.
    const next = takeCovered(row.snapshot);
    const guarded = () => swapContentGuarded({ swap: swapTo, next: next.snapshot, previous });
    replacingRef.current = true;
    let swapped: ReturnType<typeof guarded>;
    try {
      swapped = session ? session.muteWhile(guarded) : guarded();
    } finally {
      replacingRef.current = false;
    }
    if (!swapped.ok) {
      wireCollabSelection();
      void (async () => {
        const latest = await getLatestSnapshot(workbookId);
        if (isServiceFailure(latest) || !latest.data?.snapshot) return;
        replacingRef.current = true;
        try {
          const shown = takeCovered(latest.data.snapshot);
          swapTo(shown.snapshot);
          shownSnapshotIdRef.current = latest.data.id;
          baseCoveredRef.current = shown.covered;
        } catch (err) {
          console.warn("[workbook] could not show the latest saved version after a failed swap", err);
        } finally {
          replacingRef.current = false;
        }
        wireCollabSelection();
      })();
      throw swapped.error instanceof Error ? swapped.error : new Error(String(swapped.error));
    }
    shownSnapshotIdRef.current = row.id;
    baseCoveredRef.current = next.covered;
    setSaveStatus("idle");
    wireCollabSelection();
    if (announce) session?.announceReplaced(row.id);
  };

  // History restore, Google update and table refresh reach the open canvas here.
  useEffect(
    () =>
      registerOpenEditorContent("workbook", workbookId, (row) =>
        replaceWorkbookContent(row, { announce: true }),
      ),
    // replaceWorkbookContent reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workbookId],
  );

  // Stable save fn — pulled out so the timer callback and the manual-save
  // button can both reach it.
  const performSave = useCallback(
    async (origin: "autosave" | "manual" = "autosave") => {
      if (!apiRef.current) return;
      const workbook = apiRef.current.getActiveWorkbook();
      if (!workbook) return;
      // The ordered-log room saves a checkpoint only at a quiet point with a matching hash, from its saver.
      const room = otRoomRef.current;
      if (room) {
        setSaveStatus("saving");
        let wrote = false;
        try {
          wrote = await room.write(origin === "manual" ? "manual" : "autosave");
        } catch (err) {
          setSaveStatus("error");
          toast({ title: "Could not save workbook", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
          return;
        }
        setSaveStatus(wrote ? "saved" : "idle");
        if (origin === "manual") {
          toast(wrote ? { title: "Snapshot saved", variant: "success" } : { title: "Not saved yet", description: "Edits are still reaching the other editors. Try again in a moment." });
        }
        if (wrote) setTimeout(() => setSaveStatus((st) => (st === "saved" ? "idle" : st)), 1500);
        return;
      }
      // The room entries this workbook holds, read WITH the snapshot: the saved row names them, so a
      // seat that reloads from it never replays them on top of it.
      const session = collabSessionRef.current;
      const covered = session ? session.coveredNow() : null;
      const saved = workbook.save();
      const snapshot = covered ? stampCovered(saved, covered) : saved;
      setSaveStatus("saving");

      const { data: userData } = await getClaimsUser(supabase);
      lastSaveByUserRef.current = userData?.user?.id ?? null;

      const res = await saveSnapshot({ workbookId, snapshot, origin });
      if (isServiceFailure(res)) {
        setSaveStatus("error");
        toast({
          title: "Could not save workbook",
          description: res.error,
          variant: "destructive",
        });
        return;
      }
      setSaveStatus("saved");
      shownSnapshotIdRef.current = res.data.id;
      // The host's saved snapshot now holds those entries: they leave the shared log (by id).
      if (session && covered && collabIsHostRef.current) {
        session.checkpoint(res.data.id, covered);
      }
      if (origin === "manual") {
        toast({ title: "Snapshot saved", variant: "success" });
      }
      // Drop the "saved" indicator after a moment to reduce visual noise.
      setTimeout(
        () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
        1500,
      );
    },
    [workbookId],
  );

  const handleSaveNow = useCallback(() => {
    // Cancel any pending autosave so we don't race ourselves.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void performSave("manual");
  }, [performSave]);

  const handleExportXlsx = useCallback(async () => {
    if (!apiRef.current) return;
    const workbook = apiRef.current.getActiveWorkbook();
    if (!workbook) return;
    try {
      const snapshot = workbook.save();
      const report = await downloadUniverAsXlsx(snapshot, {
        filename: workbookName ?? workbookId,
        resolveImage: resolveExportImage,
      });
      // Name whatever the xlsx file could not hold — never drop it silently.
      if (report.dropped.length) {
        toast({
          title: "Exported, with changes",
          description: report.dropped.join(". "),
        });
      }
    } catch (err) {
      toast({
        title: "Could not export workbook",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }, [workbookId, workbookName]);

  // OpenDocument: the same xlsx the editor already builds, converted by the office service (LibreOffice).
  const handleExportOds = useCallback(async () => {
    const workbook = apiRef.current?.getActiveWorkbook();
    if (!workbook) return;
    try {
      const name = workbookName ?? workbookId;
      const { univerSnapshotToXlsxBytes } = await import("@ai-matrx/office/sheets/xlsx");
      const { downloadOpenXmlAs } = await import("@/features/file-actions/office-convert");
      const bytes = await univerSnapshotToXlsxBytes(workbook.save(), { resolveImage: resolveExportImage });
      await downloadOpenXmlAs(bytes, `${name}.xlsx`, name, "ods");
    } catch (err) {
      toast({
        title: "Could not export as OpenDocument",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }, [workbookId, workbookName]);

  // CSV / Print read the ACTIVE sheet of the live workbook.
  const withActiveSheet = useCallback(
    (run: (snapshot: unknown, sheetId: string | undefined, title: string) => boolean) => {
      const workbook = apiRef.current?.getActiveWorkbook();
      if (!workbook) return;
      const sheetId = (
        workbook as unknown as { getActiveSheet?: () => { getSheetId?: () => string } | null }
      ).getActiveSheet?.()?.getSheetId?.();
      const ok = run(workbook.save(), sheetId, workbookName ?? "Workbook");
      if (!ok) {
        toast({
          title: "This sheet has nothing to export",
          variant: "destructive",
        });
      }
    },
    [workbookName],
  );
  const handleExportCsv = useCallback(
    () =>
      withActiveSheet((snapshot, sheetId, title) =>
        downloadSheetAsCsv(snapshot, { ...(sheetId ? { sheetId } : {}), filename: title }),
      ),
    [withActiveSheet],
  );
  const handleExportTsv = useCallback(
    () =>
      withActiveSheet((snapshot, sheetId, title) =>
        downloadSheetAsTsv(snapshot, { ...(sheetId ? { sheetId } : {}), filename: title }),
      ),
    [withActiveSheet],
  );
  const handleExportHtml = useCallback(
    () =>
      withActiveSheet((snapshot, sheetId, title) =>
        downloadSheetAsHtml(snapshot, { ...(sheetId ? { sheetId } : {}), filename: title }),
      ),
    [withActiveSheet],
  );
  // Print settings live on the workbook (File → Page setup); Print and PDF read them from here.
  const [pageSetup, setPageSetup] = useState<SheetPageSetup>(() => pageSetupFromMetadata(record?.metadata));
  const pageSetupRef = useRef(pageSetup);
  useEffect(() => {
    pageSetupRef.current = pageSetup;
  }, [pageSetup]);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  useEffect(() => {
    let live = true;
    void readSheetPageSetup(workbookId).then((res) => {
      if (live && res.ok) setPageSetup(res.data);
    });
    return () => {
      live = false;
    };
  }, [workbookId]);
  const savePageSetup = useCallback(
    async (values: SheetPageSetup) => {
      setPageSetup(values);
      const res = await writeSheetPageSetup(workbookId, values);
      if (!res.ok) toast({ title: "Could not save page setup", description: res.error, variant: "destructive" });
      else setPageSetup(res.data);
    },
    [workbookId],
  );
  // The cells selected right now, for "Print: selected cells".
  const activeSelection = useCallback((): CellRange | null => {
    const range = apiRef.current?.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.getRange();
    return range ? { startRow: range.startRow, endRow: range.endRow, startColumn: range.startColumn, endColumn: range.endColumn } : null;
  }, []);
  const printNothingToast = useCallback(
    () =>
      toast({
        title: pageSetupRef.current.scope === "selection" ? "Select the cells to print first" : "This sheet has nothing to export",
        variant: "destructive",
      }),
    [],
  );
  const handlePrint = useCallback(
    () =>
      withActiveSheet((snapshot, sheetId, title) =>
        printSheet(snapshot, { ...(sheetId ? { sheetId } : {}), title, setup: pageSetupRef.current, selection: activeSelection() }),
      ),
    [withActiveSheet, activeSelection],
  );

  // Find and replace / comments are Univer commands; the File menu is the visible door to them.
  const runUniverCommand = useCallback((id: string) => {
    const api = apiRef.current as unknown as {
      executeCommand?: (id: string) => Promise<unknown> | unknown;
    } | null;
    if (!api?.executeCommand) {
      toast({ title: "This editor action is not ready yet", variant: "destructive" });
      return;
    }
    void Promise.resolve(api.executeCommand(id)).catch((err: unknown) =>
      toast({
        title: "Could not open that",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
    );
  }, []);
  const handleExportPdf = useCallback(
    () =>
      withActiveSheet((snapshot, sheetId, title) => {
        void downloadSheetAsPdf(snapshot, { ...(sheetId ? { sheetId } : {}), title, setup: pageSetupRef.current, selection: activeSelection() }).then((ok) => {
          if (!ok) printNothingToast();
        });
        return true;
      }),
    [withActiveSheet, activeSelection, printNothingToast],
  );
  const createNewWorkbook = async () => {
    try {
      const organizationId = await ensureOrgId(null);
      const res = await createWorkbook({ name: "Untitled workbook", organizationId });
      if (isServiceFailure(res)) throw new Error(res.error);
      router.push(`/workbooks/${res.data.id}`);
    } catch (err) {
      toast({ title: "Could not create workbook", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };
  // File → Import: a spreadsheet file becomes a NEW spreadsheet (the home's one import path).
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const sheetComments = useSheetComments({
    univer: univerInstance,
    api: univerApiInstance,
    workbookId,
    ready: bootState === "ready",
    editable,
    wrapperRef: canvasWrapperRef,
  });
  useSheetSeatLock({ univer: univerInstance, workbookId, ready: bootState === "ready", editable });
  const importFile = async (file: File) => {
    const reason = unsupportedFileReason(file);
    if (reason) {
      toast({ title: "Can't import that file", description: reason, variant: "destructive" });
      return;
    }
    try {
      const imported = await importWorkbookFile(file, null);
      toast({
        title: "Imported as a new spreadsheet",
        description: imported.notCarried.length ? `${imported.name}. Not carried: ${imported.notCarried.join("; ")}` : imported.name,
        variant: "success",
      });
      router.push(`/workbooks/${imported.id}`);
    } catch (err) {
      toast({ title: "Could not import", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };
  // Settings, macros, filter views, connectors, suggestion prefs and the View → Show modes.
  const sheetExtras = useSheetExtras({
    apiRef,
    injector: () => (univerRef.current as unknown as { __getInjector?: () => { get<T>(token: unknown): T } } | null)?.__getInjector?.() ?? null,
    workbookId,
    editable,
    ready: bootState === "ready",
    bumpChrome,
  });
  // Google's File rows this editor owns (the rest are the shared file menu's).
  const fileExtras: EditorMenuEntry[] = [
    { kind: "separator" },
    { kind: "action", id: "file.new", label: "New spreadsheet", icon: FilePlus2, run: () => void createNewWorkbook() },
    { kind: "action", id: "file.open", label: "Open", icon: FolderOpen, shortcut: { key: "o", mod: true, bind: true }, run: () => router.push("/workbooks") },
    { kind: "action", id: "file.import", label: "Import", icon: Upload, keywords: ["xlsx", "csv", "upload"], run: () => importInputRef.current?.click() },
    { kind: "action", id: "file.history", label: "Version history", icon: History, shortcut: { key: "h", mod: true, alt: true, shift: true, bind: true }, run: snapshotHistory.toggle },
    { kind: "action", id: "file.print", label: "Print", icon: Printer, shortcut: { key: "p", mod: true, bind: true }, run: handlePrint },
    sheetPageSetupRow(() => setPageSetupOpen(true)),
    { kind: "action", id: "file.settings", label: "Settings", icon: Settings, keywords: ["locale", "time zone", "calculation"], run: () => sheetExtras.openSettings() },
    { kind: "action", id: "file.details", label: "Details", icon: Info, keywords: ["info", "created", "modified"], run: () => setDetailsOpen(true) },
  ];
  const liveGoogle = useLiveGoogleAdapter("workbook", workbookId);
  const fileMenu = useFileRecordMenu(WORKBOOK_ADAPTER, record, {
    listHref: "/workbooks",
    ...(liveGoogle ? { google: { adapter: liveGoogle, editable } } : {}),
    ...(onProjectMoved ? { onProjectMoved } : {}),
    // The editor offers its LIVE content (unsaved edits included), not the last saved snapshot.
    downloads: [
      { label: "Excel (.xlsx)", run: handleExportXlsx },
      { label: "CSV (current sheet)", run: async () => handleExportCsv() },
      { label: "PDF (current sheet)", run: async () => handleExportPdf() },
    ],
    // Google Sheets' File menu: Download in Google's order (csv, tsv, html and pdf are the current sheet).
    editorFile: {
      product: "sheets",
      rows: fileExtras,
      templatesHref: "/workbooks/templates",
      downloads: [
        { label: "Microsoft Excel (.xlsx)", run: handleExportXlsx },
        { label: "OpenDocument (.ods)", run: handleExportOds },
        { label: "PDF (.pdf)", run: async () => handleExportPdf() },
        { label: "Web Page (.html)", run: async () => handleExportHtml() },
        { label: "Comma Separated Values (.csv)", run: async () => handleExportCsv() },
        { label: "Tab Separated Values (.tsv)", run: async () => handleExportTsv() },
      ],
    },
    menubar: menuBar.fileMenuProps(),
    ...(chrome.onRename ? { onRename: chrome.onRename } : {}),
  });

  // Surface bridge — publish the live editor state (sheets, snapshot, save
  // status, collab presence) for the `matrx-user/workbooks` emitter on the
  // page above us. Read-on-demand at agent-launch time, never pushed up as
  // state (that would re-render the editor on every keystroke). Returns null
  // until Univer has booted, so the emitter omits the values rather than
  // faking them. See `../workbook-scope-source.ts`.
  useEffect(() => {
    return registerWorkbookScopeSource({
      workbookId,
      read: () => {
        const api = apiRef.current;
        const workbook = api?.getActiveWorkbook?.();
        if (!workbook) return null;
        let snapshot: Record<string, unknown> | null = null;
        try {
          snapshot = workbook.save() as unknown as Record<string, unknown>;
        } catch {
          snapshot = null;
        }
        const order = Array.isArray(snapshot?.sheetOrder)
          ? (snapshot.sheetOrder as string[])
          : [];
        const sheetMap = (snapshot?.sheets ?? {}) as Record<
          string,
          { id?: string; name?: string }
        >;
        const sheets = order.map((sheetId, index) => ({
          id: sheetId,
          name: sheetMap[sheetId]?.name ?? sheetId,
          index,
        }));
        const activeSheet = (
          workbook as unknown as {
            getActiveSheet?: () => {
              getSheetId?: () => string;
              getSheetName?: () => string;
            } | null;
          }
        ).getActiveSheet?.();
        return {
          sheets,
          activeSheetId: activeSheet?.getSheetId?.() ?? null,
          activeSheetName: activeSheet?.getSheetName?.() ?? null,
          snapshot,
          bootState,
          loadError,
          saveStatus,
          collab: {
            enabled: collab,
            is_host: collabIsHost,
            self_uid: collabSelfUid,
            remote_peers: remoteAwareness.size,
          },
        };
      },
    });
  }, [
    workbookId,
    bootState,
    loadError,
    saveStatus,
    collab,
    collabIsHost,
    collabSelfUid,
    remoteAwareness,
  ]);

  // Write half of the `matrx-user/workbooks` surface, EDITOR-STATE side. The
  // page above registers the two `udt_workbooks` entity targets; the sheets
  // live in the Univer instance one level down here, so this component
  // registers `workbook_sheet_names` by name instead (the deep-child seam).
  // Renaming goes through `FWorksheet.setName()` — the SAME Univer command the
  // user's own sheet-tab rename fires — so it flows into the onCommandExecuted
  // listener above, marks the workbook dirty and rides the normal 2.5s
  // debounced autosave. Never a snapshot write of our own.
  //
  // Everything is validated BEFORE the first setName call: a rename map that
  // half-applies and then fails would leave the workbook in a state neither
  // the user nor the agent asked for.
  useSurfaceWriteHandlers("matrx-user/workbooks", {
    workbook_sheet_names: (value: unknown) => {
      if (!editableRef.current)
        throw new Error(
          "This workbook is open in viewer-only mode — the user does not have edit permission, so its sheets cannot be renamed.",
        );
      const workbook = apiRef.current?.getActiveWorkbook?.();
      if (!workbook)
        throw new Error(
          "The workbook editor has not finished booting — there are no sheets to rename yet.",
        );
      if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new Error(
          'workbook_sheet_names expects an object keyed by sheet id, e.g. { "sheet-01": "Q3 Revenue" }.',
        );
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0)
        throw new Error(
          "workbook_sheet_names expects at least one { sheetId: newName } entry.",
        );

      const nameBySheetId = new Map(
        workbook.getSheets().map((sheet) => [sheet.getSheetId(), sheet.getSheetName()]),
      );

      for (const [sheetId, name] of entries) {
        if (!nameBySheetId.has(sheetId))
          throw new Error(
            `workbook_sheet_names: "${sheetId}" is not a sheet id in this workbook. Read workbook_sheets for the ids — this workbook has ${[...nameBySheetId.keys()].map((sheetKey) => `"${sheetKey}"`).join(", ")}.`,
          );
        if (typeof name !== "string" || name.trim().length === 0)
          throw new Error(
            `workbook_sheet_names: the new name for "${sheetId}" must be a non-empty string.`,
          );
        if (name.trim().length > 31)
          throw new Error(
            `workbook_sheet_names: "${name.trim()}" is ${name.trim().length} characters — sheet names are limited to 31.`,
          );
        if (SHEET_NAME_FORBIDDEN_CHARS.test(name))
          throw new Error(
            `workbook_sheet_names: "${name}" contains a character sheet names cannot use (: \\ / ? * [ ]).`,
          );
      }

      // Uniqueness is checked against the RESULT of applying the whole map,
      // not the current state — so swapping two sheets' names is legal, while
      // colliding with a sheet the map leaves alone is not.
      const resultingNames = new Map(nameBySheetId);
      for (const [sheetId, name] of entries)
        resultingNames.set(sheetId, (name as string).trim());
      const seen = new Set<string>();
      for (const name of resultingNames.values()) {
        const key = name.toLowerCase();
        if (seen.has(key))
          throw new Error(
            `workbook_sheet_names: applying these renames would leave two sheets named "${name}". Sheet names must be unique.`,
          );
        seen.add(key);
      }

      for (const [sheetId, name] of entries)
        workbook.getSheetBySheetId(sheetId)?.setName((name as string).trim());
    },
  });

  // ─── Google Sheets chrome: menus, toolbar, bound shortcuts ───
  const openFeedback = useOpenFeedbackWindow();
  const chromeHost: SheetChromeHost | null =
    bootState === "ready" && univerApiInstance
      ? {
          api: univerApiInstance as unknown as SheetsApiLike,
          editable,
          print: handlePrint,
          formulaBarVisible: () => !formulaBarHidden,
          toggleFormulaBar: () => setFormulaBarHidden((v) => !v),
          fullScreen: () => fullScreen,
          toggleFullScreen: () => setFullScreen((v) => !v),
          notify: (message) => toast({ title: message }),
          sendFeedback: () => openFeedback(),
          ...sheetExtras.host,
        }
      : null;
  const menus = chromeHost ? buildSheetMenus(chromeHost) : [];
  const toolbarItems = chromeHost ? buildSheetToolbar(chromeHost) : [];

  // Shortcuts Google has and Univer does not bind (number formats, align,
  // Print, Open, Version history) run the same rows the menus run.
  const boundRef = useRef<ReturnType<typeof boundActions>>([]);
  boundRef.current = boundActions([...menus, { id: "file", label: "File", items: fileExtras }]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = containerRef.current?.closest("[data-editor-document-header]");
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

  const saveState = saveStatus === "idle" ? "saved" : saveStatus;

  // Extensions (Google keeps its own in the menu bar): the Google link, the table link and the
  // sheet reference are rows of ONE menu, with small marks by the title once a link exists.
  const ready = bootState === "ready";
  const firstPaint = useFirstPaint(ready);
  const googleLink = useWorkbookGoogleLink(apiRef, workbookId, workbookName, editable, ready);
  const tableLink = useWorkbookTableLink({ apiRef, workbookId, workbookName, editable, enabled: ready });
  const extensionRows = ready ? (
    <>
      {googleLink.items}
      {tableLink.items}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        data-editor-command="extensions.sheet-reference"
        onSelect={() => void copyActiveSheetReference(apiRef, workbookId, workbookName)}
      >
        <Bookmark className="mr-2 size-4" />
        Copy sheet reference
      </DropdownMenuItem>
    </>
  ) : null;

  return (
    // Univer owns its own light/dark theming via the Facade API
    // (useUniverDarkModeSync); we do NOT pin a colorScheme here — that fought
    // Univer's portals and broke dark mode.
    <EditorDocumentHeader
      record={{ token: "workbook", id: workbookId }}
      embedded={embedded}
      backHref={chrome.backHref}
      backLabel="Back to workbooks"
      productTone="sheets"
      productIcon={<Sheet />}
      title={chrome.title}
      titleMarks={
        <>
          {chrome.titleMarks}
          {ready ? googleLink.mark : null}
          {ready ? tableLink.mark : null}
          {bootState === "ready" ? (
            <EditorSaveStatus state={saveState} offline={collabOffline} {...(editable ? { onSaveNow: handleSaveNow } : {})} />
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
          state={menuBar}
          fileMenu={bootState === "ready" ? fileMenu : null}
          extensions={extensionRows}
        />
      }
      actions={
        <>
          {collab && bootState === "ready" && (
            <span className="hidden md:flex">
              <RemoteCursorsLayer states={remoteAwareness} selfUid={collabSelfUid} />
            </span>
          )}
          <Button
            variant="quiet"
            icon={<History />}
            aria-label="Version history"
            title="Version history"
            pressed={snapshotHistory.isVisible}
            className="hidden sm:inline-flex"
            onClick={snapshotHistory.toggle}
          />
          <Button
            variant="quiet"
            icon={<MessageSquare />}
            aria-label="Comments"
            title="Comments"
            className="hidden sm:inline-flex"
            disabled={bootState !== "ready"}
            pressed={sheetComments.open}
            onClick={sheetComments.toggle}
          />
          {chrome.actions}
        </>
      }
      toolbar={
        <EditorToolbar items={toolbarItems} menus={menus} className={bootState === "ready" ? undefined : "invisible"} />
      }
      ribbon={
        <EditorRibbon
          tabs={SHEET_RIBBON}
          menus={[...menus, { id: "file", label: "File", items: fileExtras }]}
          toolbar={toolbarItems}
          fileMenu={bootState === "ready" ? fileMenu : null}
          extensions={extensionRows}
          end={<OfficeLookSwitch />}
        />
      }
    >
      {googleLink.dialog}
      {tableLink.dialog}
      {/* ui-exception: the native file picker behind File → Import (no accept filter: Drive pickers gray everything out). */}
      <input
        ref={importInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importFile(f);
        }}
      />
      <SheetToolPanels
        {...sheetExtras.panelProps}
        api={univerApiInstance as unknown as PanelApi | null}
        linkedTableId={tableLink.linkedTableId}
        makeTable={tableLink.makeTable}
      />
      <SheetPageSetupDialog open={pageSetupOpen} onOpenChange={setPageSetupOpen} initial={pageSetup} onApply={(values) => void savePageSetup(values)} />
      <EditorDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Details"
        rows={[
          ["Name", record?.workbook_name ?? workbookName],
          ["Created", formatDetailDate(record?.created_at)],
          ["Last edited", formatDetailDate(record?.updated_at)],
          ["Source", record ? workbookSourceLabel(record.source) : null],
          ["Sheets", ready ? String(univerApiInstance?.getActiveWorkbook()?.getSheets().length ?? "") : null],
        ]}
      />
      <div
        className="matrx-univer-shell relative flex min-h-0 flex-1 flex-col bg-card"
        data-formula-bar={formulaBarHidden ? "hidden" : "shown"}
      >
        {bootState === "load_error" && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
            Load failed: {loadError ?? "unknown"}
            <ErrorAlchemyMenu error={loadError} />
          </div>
        )}
        {/* Relative wrapper so the absolute cursor overlay layers inside it
            (not over the whole viewport) and the Univer canvas keeps its own
            flex sizing. */}
        <div className="flex min-h-0 flex-1">
        <div ref={canvasWrapperRef} className="relative min-h-0 min-w-0 flex-1">
          <div ref={containerRef} className="absolute inset-0" />
          {bootState === "load_error" || firstPaint ? null : <EditorBootCover label="Loading workbook" />}
          {collab && bootState === "ready" && (
            <WorkbookCursorOverlay
              univerAPI={univerApiInstance}
              univer={univerInstance}
              containerRef={containerRef}
              states={remoteAwareness}
              selfUid={collabSelfUid}
            />
          )}
          {sheetComments.layer}
        </div>
        {sheetComments.rail}
        </div>
      </div>
    </EditorDocumentHeader>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultEmptyWorkbook(): Partial<IWorkbookData> {
  // Univer's IWorkbookData with one default sheet. The shape is intentionally
  // minimal — Univer fills in defaults when fields are absent.
  return {
    id: cryptoRandomId(),
    sheetOrder: ["sheet-1"],
    name: "Untitled workbook",
    appVersion: "1",
    locale: LocaleType.EN_US,
    styles: {},
    sheets: {
      "sheet-1": {
        id: "sheet-1",
        name: "Sheet1",
        cellData: {},
        rowCount: 100,
        columnCount: 26,
      },
    },
  };
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

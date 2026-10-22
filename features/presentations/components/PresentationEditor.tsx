"use client";

/**
 * `/presentations/[id]` — one presentation, Google Slides' editor:
 *
 *   [▣] Title ☆ ⇢ ☁                               [history] [Slideshow] [Share]
 *       File Edit View Insert Slide Help
 *   ( Menus | + ▾ ↶ ↷ | image | layout ▾ theme ▾ | notes )
 *   [ rail ] [        the slide, edited in place        ] [history]
 *            [ speaker notes                            ]
 *
 * The header is the shared `EditorDocumentHeader` (the same top as the workbook and document
 * editors); File is the ONE shared file menu (share, copy, move, star, download PowerPoint/PDF/web
 * page, trash, template). The slide is the existing renderer (SlideView) with its texts made
 * editable in place (`SlideEditContext`). Every change is a step of the pure deck reducer
 * (`deck-model` + `deck-history`, tested); the deck autosaves, each save a platform version.
 */

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FolderOpen, History, Info, Loader2, MonitorPlay, Presentation, Printer } from "lucide-react";
import { EditorDetailsDialog, formatDetailDate } from "@/components/editor-chrome/EditorDetailsDialog";

import { Button } from "@ai-matrx/design-system/controls";
import { TextInputDialog } from "@ai-matrx/design-system";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { EditorDocumentHeader } from "@/features/shell/components/header/templates/EditorDocumentHeader";
import { EditorMenuBar, useMenuBarState } from "@/components/editor-chrome/EditorMenuBar";
import { useOpenFeedbackWindow } from "@/features/overlays/definitions/feedbackDialog.overlay";
import { EditorToolbar } from "@/components/editor-chrome/EditorToolbar";
import { EditorRibbon } from "@/components/editor-chrome/EditorRibbon";
import { OfficeLookSwitch } from "@/features/file-actions/skin/OfficeLookSwitch";
import { DECK_RIBBON } from "@/features/presentations/deck-ribbon";
import { EditorSaveStatus, EditorTitleField, type EditorSaveState } from "@/components/editor-chrome/EditorTitleField";
import {
  boundActions,
  flattenMenus,
  formatShortcut,
  matchesShortcut,
  type EditorMenuEntry,
} from "@ai-matrx/office/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea, type ProTextareaElement } from "@/components/official/ProTextarea";
import { SlideEditContext, type SlideEditPort } from "@/components/mardown-display/blocks/presentations/slide-edit";
import { PRESET_LIST } from "@/components/mardown-display/blocks/presentations/presets";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { canActOn } from "@/features/access-gate/service/canActOn";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { FileTitleMarks } from "@/features/file-actions/FileTitleMarks";
import { useFileRecordMenu } from "@/features/file-actions/useFileRecordMenu";
import { useLiveFileName } from "@/features/file-actions/useLiveFileName";
import { PRESENTATION_ADAPTER } from "@/features/file-actions/adapters";
import { presentationGoogleAdapter } from "@/features/google-workspace/linked/EditorGoogleLinks";
import { mediaClient } from "@/features/files/media-client/client";
import { isServiceFailure } from "@/features/data-tables/types";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { cn } from "@/lib/utils";

import { blankDeck, getPath, type DeckAction } from "../deck-model";
import { historyReducer, initialHistory } from "../deck-history";
import { buildDeckMenus, buildDeckToolbar, deckPageSetupRow, type DeckChromeHost, type DeckPanel } from "../deck-commands";
import { isSkipped, slideTextStyleOf } from "../deck-slide-ops";
import { getDeckA11y, setDeckA11y, useDeckA11y } from "../deck-a11y";
import { pastePlainText } from "../paste-plain";
import { createDeckSaver, listenToDeckPage, type DeckSaver } from "../deck-autosave";
import { ShimmerText } from "@ai-matrx/design-system";
import { AccessibilityDialog, BackgroundDialog, CommentsDialog, FindReplaceDialog, ImportSlidesDialog, MotionDialog, SpecialCharsDialog, ThemeBuilderDialog } from "./DeckPanels";
import { DeckGridView } from "./DeckGridView";
import { deckDownloads, downloadDeckAsOdp, downloadDeckAsText, downloadSlideAsImage, printDeck } from "../deck-export";
import {
  createPresentation,
  getPresentation,
  PRESENTATION_NAME_MAX_LENGTH,
  renamePresentation,
  savePresentationDeck,
  type PresentationRow,
} from "../presentation-service";
import { PaperSlide } from "../slide-paper";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { AGENT_DECK_ACTIONS, PRESENTATION_SURFACE_NAME, createPresentationScope } from "@/features/surfaces/manifests/presentation.manifest";
import { slideSizeOf } from "@/components/mardown-display/blocks/presentations/slide-size";
import { SlideSizeDialog } from "./SlideSizeDialog";
import { SlideRail } from "./SlideRail";
import { DeckPresenter } from "./DeckPresenter";
import { DeckHistoryPanel } from "./DeckHistoryPanel";

// LOAD MARKER (heavy: must never load before the person engages) — read by the page-load trace; no import, no build edge.
if (typeof window !== "undefined") performance.mark("load:heavy:Slides editor", { detail: { home: ["/presentations"] } });

const AUTOSAVE_MS = 900;
const PRESETS = PRESET_LIST.map((p) => ({ key: p.key, name: p.name }));

function layoutOf(layout: unknown, type: unknown): string {
  const raw = String(layout || type || "").toLowerCase();
  if (raw === "intro" || raw === "cover") return "title";
  if (raw === "content" || raw === "") return "bullets";
  return raw;
}

interface OpenPresentation {
  row: PresentationRow;
  mayEdit: boolean;
}

export function PresentationEditor({ presentationId, embedded = false, onName }: { presentationId: string; /** The presentation's current name once read (renamed here, by an agent or by a collaborator). */ onName?: (name: string) => void; /** Inside a board tile: the shell is left alone and the header's product mark is not a link. */ embedded?: boolean }) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const isPhone = useIsMobile();
  const [row, setRow] = useState<PresentationRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const openFeedback = useOpenFeedbackWindow();
  const [mayEdit, setMayEdit] = useState(false);
  // Nothing is editable (or saved) until the stored deck has loaded: the blank deck shown while
  // loading must never take an edit, and never be written over the real one.
  const canEdit = mayEdit && row !== null;
  const [hist, dispatchHist] = useReducer(historyReducer, initialHistory(blankDeck()));
  const [saveState, setSaveState] = useState<EditorSaveState>("saved");
  const [notesShown, setNotesShown] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [presentingFrom, setPresentingFrom] = useState<number | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [panel, setPanel] = useState<DeckPanel | null>(null);
  const [gridShown, setGridShown] = useState(false);
  const a11y = useDeckA11y();
  const notesRef = useRef<ProTextareaElement | null>(null);
  /** The last slide text or notes box the caret was in: Insert → Special characters and Paste as text land there. */
  const lastEditable = useRef<HTMLElement | null>(null);
  const presentationIdRef = useRef(presentationId);
  const uploadRef = useRef<HTMLInputElement>(null);
  const menuBar = useMenuBarState();

  const { deck, current } = hist.present;
  const loadedName = row?.name ?? null;
  useEffect(() => {
    if (loadedName) onName?.(loadedName);
  }, [loadedName, onName]);
  const slide = deck.slides[current];

  const deckRef = useRef(deck);
  const currentRef = useRef(current);
  const revisionRef = useRef(hist.revision);
  const canEditRef = useRef(canEdit);
  // Built on first use (from an effect or a handler, never during render).
  const saverRef = useRef<DeckSaver | null>(null);
  const saverFor = (): DeckSaver =>
    (saverRef.current ??= createDeckSaver({
      current: () => ({ revision: revisionRef.current, deck: deckRef.current }),
      write: async (d) => {
        if (!canEditRef.current) return false;
        const res = await savePresentationDeck(presentationIdRef.current, d);
        if (isServiceFailure(res)) {
          toast.error("Could not save the presentation", { description: res.error });
          return false;
        }
        openRef.current.setData((prev) => (prev ? { ...prev, row: { ...prev.row, deck: d } } : (prev as unknown as OpenPresentation)));
        return true;
      },
      onState: setSaveState,
    }));
  // The stored deck, its row and whether this person may edit: read ONCE per presentation per tab and
  // kept (a tile waking from sleep or remounting renders the kept answer and reads nothing; a failed
  // read is not kept). Every save and rename writes through to the kept row, so a remount seeds the
  // deck that was last saved, never an older one.
  const open = useStoreRead<OpenPresentation>(`presentation.open:${presentationId}`, async () => {
    const res = await getPresentation(presentationId);
    if (isServiceFailure(res)) throw new Error(res.error);
    return { row: res.data, mayEdit: await canActOn("presentation", presentationId, "editor") };
  });
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  /** A local change to the row, in this view and in the kept answer. */
  const setRowKept = (update: (r: PresentationRow | null) => PresentationRow | null) => {
    setRow(update);
    open.setData((prev) => (prev ? { ...prev, row: update(prev.row) ?? prev.row } : (prev as unknown as OpenPresentation)));
  };
  // Seed the editor from the kept answer: once per mount, and again after `load()` (a restored version).
  const seeded = useRef(false);
  const seedKey = useRef(presentationId);
  useEffect(() => {
    if (seedKey.current !== presentationId) {
      seedKey.current = presentationId;
      seeded.current = false;
    }
    if (!open.data || seeded.current) return;
    seeded.current = true;
    setRow(open.data.row);
    setMayEdit(open.data.mayEdit);
    saverFor().markSaved(0);
    dispatchHist({ type: "reset", deck: open.data.row.deck });
    setSaveState("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeded by the kept answer, not by every render
  }, [open.data, presentationId]);
  const loadError = open.error;
  /** Read the stored deck again now (after a version is restored) and show it. */
  const load = async () => {
    seeded.current = false;
    await open.refresh();
  };

  // Autosave: every content change (revision) is saved after a short pause; each save is one version.
  // Saves run one at a time (an older whole-deck write can never land last) and leaving the page
  // flushes and asks while anything is unwritten (deck-autosave).
  useEffect(() => {
    deckRef.current = deck;
    currentRef.current = current;
    revisionRef.current = hist.revision;
    canEditRef.current = canEdit;
    presentationIdRef.current = presentationId;
  }, [deck, current, hist.revision, canEdit, presentationId]);
  const saveNow = () => saverFor().save();
  useEffect(() => {
    const saver = saverFor();
    if (!saver.hasUnsaved() || !canEdit) return undefined;
    setSaveState("dirty");
    const t = setTimeout(() => void saver.save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [hist.revision, canEdit]);
  // Leaving the page (or the editor) never drops the last edits.
  useEffect(() => {
    const saver = saverFor();
    const stop = listenToDeckPage(saver);
    return () => {
      stop();
      if (canEditRef.current && saver.hasUnsaved()) void saver.save();
    };
  }, []);

  // A collaborator's (or an agent's) rename shows here live.
  useLiveFileName({ table: "presentation", column: "name", id: presentationId }, (name) => {
    setRowKept((r) => (r && r.name !== name ? { ...r, name } : r));
  });

  const dispatch = (a: DeckAction) => {
    if (!canEdit) return;
    dispatchHist(a);
  };
  const applyRename = async (name: string) => {
    const res = await renamePresentation(presentationId, name);
    if (isServiceFailure(res)) {
      toast.error("Could not rename", { description: res.error });
      return;
    }
    setRowKept((r) => (r ? { ...r, name: res.data.name } : r));
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    const index = current;
    try {
      const { fileId } = await mediaClient.upload(file, {
        fileName: file.name,
        mimeType: file.type,
        shownTo: "everyone",
        metadata: { purpose: "presentation_image", presentation_id: presentationId },
      });
      dispatch({ type: "setImage", index, image: fileId });
    } catch (err) {
      toast.error("Could not upload the image", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t instanceof HTMLTextAreaElement) && t.closest("[data-presentation-editor]")) lastEditable.current = t;
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  // Tools → Spelling and grammar: the browser's own checker on every slide text and the notes.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-presentation-editor] [contenteditable], [data-presentation-editor] textarea").forEach((el) => {
      el.spellcheck = a11y.spellcheck;
    });
  });
  const insertAtCaret = (text: string) => {
    const el = lastEditable.current;
    if (!el || !el.isConnected) {
      toast.error("Click into a slide's text or the notes first");
      return;
    }
    el.focus();
    document.execCommand("insertText", false, text);
  };
  const pastePlain = async () => {
    await pastePlainText({ readText: async () => (await import("@ai-matrx/kit/clipboard")).readText(), insert: insertAtCaret, error: (t, o) => toast.error(t, o) });
  };

  const host: DeckChromeHost = {
    canEdit,
    slideCount: deck.slides.length,
    current,
    currentLayout: slide ? layoutOf(slide.layout, slide.type) : "",
    presetKey: deck.theme?.preset ? String(deck.theme.preset).toLowerCase() : null,
    presets: PRESETS,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    notesShown,
    currentSlide: slide ?? null,
    dispatch,
    undo: () => canEdit && dispatchHist({ type: "undo" }),
    redo: () => canEdit && dispatchHist({ type: "redo" }),
    present: (fromStart) => deck.slides.length > 0 && setPresentingFrom(fromStart ? 0 : current),
    toggleNotes: () => setNotesShown((v) => !v),
    uploadImage: () => uploadRef.current?.click(),
    searchImage: () => setImageSearchOpen(true),
    removeImage: () => dispatch({ type: "setImage", index: current, image: null }),
    hasImage: Boolean(slide && (slide.image_url || slide.imageUrl || getPath(slide, "extra.image") || getPath(slide, "extra.imagePrompt"))),
    showShortcuts: () => setShortcutsOpen(true),
    sendFeedback: () => openFeedback(),
    skipped: isSkipped(slide),
    slideNumbers: Boolean(deck.showSlideNumbers),
    gridShown,
    spellcheck: a11y.spellcheck,
    // the notes box's real recorder state, read when the menu row is drawn (the box exposes no change event)
    get voiceTyping() {
      return Boolean(notesRef.current?.isDictating?.());
    },
    slideTextStyle: slideTextStyleOf(slide),
    openPanel: (p) => setPanel(p),
    pastePlain: () => void pastePlain(),
    toggleGrid: () => setGridShown((v) => !v),
    toggleSpellcheck: () => setDeckA11y({ ...getDeckA11y(), spellcheck: !getDeckA11y().spellcheck }),
    toggleVoiceTyping: () => {
      if (notesRef.current?.isDictating?.()) {
        notesRef.current.stopDictation?.();
        return;
      }
      setNotesShown(true);
      setTimeout(() => void notesRef.current?.startDictation?.(), 50);
    },
  };
  const createNew = async () => {
    try {
      const organizationId = await ensureOrgId(null);
      const res = await createPresentation({ organizationId });
      if (isServiceFailure(res)) throw new Error(res.error);
      router.push(`/presentations/${res.data.id}`);
    } catch (err) {
      toast.error("Could not create the presentation", { description: err instanceof Error ? err.message : String(err) });
    }
  };
  // Google Slides' File rows this page owns (the rest are the shared file menu's).
  const pageFileExtras: EditorMenuEntry[] = [
    { kind: "separator" },
    { kind: "action", id: "file.new", label: "New presentation", icon: FilePlus2, run: () => void createNew() },
    { kind: "action", id: "file.open", label: "Open", icon: FolderOpen, shortcut: { key: "o", mod: true, bind: true }, run: () => router.push("/presentations") },
    {
      kind: "action",
      id: "file.history",
      label: "Version history",
      icon: History,
      shortcut: { key: "h", mod: true, alt: true, shift: true, bind: true },
      run: () => setHistoryOpen((v) => !v),
    },
    {
      kind: "action",
      id: "file.print",
      label: "Print",
      icon: Printer,
      shortcut: { key: "p", mod: true, bind: true },
      run: () => printDeck(deckRef.current),
    },
    { kind: "action", id: "file.import-slides", label: "Import slides", icon: FilePlus2, keywords: ["powerpoint", "pptx", "bring in"], run: () => setPanel("import"), disabled: () => !canEdit },
    deckPageSetupRow(() => setSizeOpen(true)),
    { kind: "action", id: "file.details", label: "Details", icon: Info, keywords: ["info", "created", "modified"], run: () => setDetailsOpen(true) },
  ];
  const menus = buildDeckMenus(host);
  const toolbarItems = buildDeckToolbar(host, menus);
  const allMenus = [...menus, { id: "file", label: "File", items: pageFileExtras }];

  const fileMenu = useFileRecordMenu(PRESENTATION_ADAPTER, row, {
    listHref: "/presentations",
    // The editor offers its LIVE deck (unsaved edits included).
    downloads: deckDownloads(() => Promise.resolve(deckRef.current), row?.name ?? "presentation"),
    onProjectMoved: (projectId) => setRowKept((r) => (r ? { ...r, project_id: projectId } : r)),
    menubar: menuBar.fileMenuProps(),
    ...(row && userId !== null && row.user_id === userId ? { google: { adapter: presentationGoogleAdapter(() => deckRef.current, row.id, row.name), editable: canEdit } } : {}),
    ...(canEdit ? { onRename: applyRename } : {}),
    // Google Slides' File menu: Download in Google's order; our web page export follows.
    editorFile: {
      product: "slides",
      rows: pageFileExtras,
      templatesHref: "/presentations/templates",
      downloads: [
        ...deckDownloads(() => Promise.resolve(deckRef.current), row?.name ?? "presentation").map((d) => ({
          ...d,
          label: d.label.startsWith("PowerPoint") ? "Microsoft PowerPoint (.pptx)" : d.label === "PDF" ? "PDF Document (.pdf)" : d.label,
        })),
        { label: "ODP Document (.odp)", run: async () => downloadDeckAsOdp(deckRef.current, row?.name ?? "presentation") },
        { label: "Plain Text (.txt)", run: async () => downloadDeckAsText(deckRef.current, row?.name ?? "presentation") },
        { label: "JPEG image (.jpg, current slide)", run: async () => downloadSlideAsImage(deckRef.current, currentRef.current, row?.name ?? "presentation", "jpeg") },
        { label: "PNG image (.png, current slide)", run: async () => downloadSlideAsImage(deckRef.current, currentRef.current, row?.name ?? "presentation", "png") },
        { label: "Scalable Vector Graphics (.svg, current slide)", run: async () => downloadSlideAsImage(deckRef.current, currentRef.current, row?.name ?? "presentation", "svg") },
      ],
    },
  });

  // The chrome binds its own shortcuts (Google's), everywhere on the page except while presenting.
  const boundRef = useRef<ReturnType<typeof boundActions>>([]);
  useEffect(() => {
    boundRef.current = boundActions(allMenus);
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-deck-presenter]")) return;
      const hit = boundRef.current.find((a) => a.shortcut && matchesShortcut(e, a.shortcut));
      if (!hit || hit.disabled?.()) return;
      e.preventDefault();
      e.stopPropagation();
      void Promise.resolve(hit.run()).catch(() => {});
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (loadError) {
    return (
      <div className={embedded ? "h-full overflow-hidden" : "h-full overflow-hidden pt-[var(--shell-header-h)]"}>
        <AccessGate token="presentation" id={presentationId} fallbackHref="/presentations" fallbackLabel="Back to presentations" />
      </div>
    );
  }

  const isOwner = row !== null && userId !== null && row.user_id === userId;
  const editPort: SlideEditPort = {
    onChange: (path, value) => dispatch({ type: "setField", index: current, path, value }),
    onEnter: (path) => {
      dispatch({ type: "insertItem", index: current, path });
      const m = /^(.*)\.(\d+)$/.exec(path);
      if (m) setFocusPath(`${m[1]}.${Number(m[2]) + 1}`);
    },
    onRemoveEmpty: (path) => {
      dispatch({ type: "removeItem", index: current, path });
      const m = /^(.*)\.(\d+)$/.exec(path);
      if (m && Number(m[2]) > 0) setFocusPath(`${m[1]}.${Number(m[2]) - 1}`);
    },
    focusPath,
    onFocused: () => setFocusPath(null),
  };

  const rail = (
    <SlideRail
      deck={deck}
      current={current}
      canEdit={canEdit}
      horizontal={isPhone}
      onSelect={(index) => dispatchHist({ type: "select", index })}
      dispatch={dispatch}
    />
  );

  const canvas = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40">
      <div className="relative min-h-0 flex-1 p-3 sm:p-6" data-deck-canvas="">
        {row === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : gridShown ? (
          <div className="absolute inset-0 flex">
            <DeckGridView deck={deck} current={current} canEdit={canEdit} dispatch={dispatch} onOpen={(i) => { dispatchHist({ type: "select", index: i }); setGridShown(false); }} />
          </div>
        ) : slide ? (
          <SlideEditContext.Provider value={canEdit ? editPort : null}>
            <PaperSlide deck={deck} slide={slide} slideNumber={current + 1} className="h-full w-full" />
          </SlideEditContext.Provider>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Button variant="primary" disabled={!canEdit} onClick={() => dispatch({ type: "addSlide", after: -1, layout: "title" })}>
              Add a slide
            </Button>
          </div>
        )}
      </div>
      {notesShown && slide ? (
        <div className="shrink-0 border-t border-border bg-card px-3 py-2">
          <ProTextarea
            ref={notesRef}
            aria-label="Speaker notes"
            placeholder="Click to add speaker notes"
            value={slide.notes ?? ""}
            readOnly={!canEdit}
            onChange={(e) => dispatch({ type: "setNotes", index: current, notes: e.target.value })}
            autoGrow
            minHeight={56}
            maxHeight={180}
            className="text-sm"
          />
        </div>
      ) : null}
    </div>
  );

  // The `matrx-user/presentation` agent surface: read at trigger time from the refs the editor keeps, written
  // through the editor's own paths (the header field's rename, the deck reducer's steps).
  const getSurfaceScope = () => {
    const d = deckRef.current;
    const i = currentRef.current;
    const cur = d.slides[i];
    return createPresentationScope({
      presentation_id: presentationId,
      can_edit: canEditRef.current,
      ...(row ? { presentation_name: row.name } : {}),
      slide_count: d.slides.length,
      ...(d.theme ? { deck_theme: d.theme as Record<string, unknown> } : {}),
      slide_outline: d.slides.map((sl, n) => ({ index: n, layout: layoutOf(sl.layout, sl.type), title: sl.title ?? "", skipped: isSkipped(sl) })),
      deck: d as Record<string, unknown>,
      current_slide_index: i,
      ...(cur ? { current_slide: cur as Record<string, unknown> } : {}),
      save_state: saveState,
    });
  };
  const getSurfaceWriteHandlers = () => ({
    presentation_name: async (value: unknown) => {
      if (typeof value !== "string" || !value.trim() || value.trim().length > PRESENTATION_NAME_MAX_LENGTH)
        throw new Error(`presentation_name expects a non-empty string of at most ${PRESENTATION_NAME_MAX_LENGTH} characters.`);
      if (!canEditRef.current) throw new Error("This presentation is not editable yet or is open in view-only mode.");
      const res = await renamePresentation(presentationId, value.trim());
      if (isServiceFailure(res)) throw new Error(res.error);
      setRowKept((r) => (r ? { ...r, name: res.data.name } : r));
    },
    deck_actions: async (value: unknown) => {
      if (!Array.isArray(value) || value.length === 0 || value.length > 40) throw new Error("deck_actions expects an array of 1 to 40 steps.");
      const allowed: readonly string[] = AGENT_DECK_ACTIONS;
      value.forEach((step, n) => {
        const type = (step as { type?: unknown } | null)?.type;
        if (typeof type !== "string" || !allowed.includes(type)) throw new Error(`Step ${n} has no valid type; use one of: ${allowed.join(", ")}.`);
      });
      if (!canEditRef.current) throw new Error("This presentation is not editable yet or is open in view-only mode.");
      for (const step of value) dispatchHist(step as DeckAction);
    },
  });

  return (
    <SurfaceRuntimeProvider surfaceName={PRESENTATION_SURFACE_NAME} isEditable={canEdit} getScope={getSurfaceScope} getWriteHandlers={getSurfaceWriteHandlers}>
    <>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void uploadImage(file);
        }}
      />
      <EditorDocumentHeader
        record={{ token: "presentation", id: presentationId }}
        embedded={embedded}
        backHref="/presentations"
        backLabel="Back to presentations"
        productTone="slides"
        productIcon={<Presentation />}
        title={
          row ? (
            <EditorTitleField
              value={row.name}
              editable={canEdit}
              placeholder="Untitled presentation"
              maxLength={PRESENTATION_NAME_MAX_LENGTH}
              onCommit={applyRename}
            />
          ) : (
            <span className="truncate px-1 text-base text-muted-foreground">Loading…</span>
          )
        }
        titleMarks={
          row ? (
            <>
              <FileTitleMarks
                adapter={PRESENTATION_ADAPTER}
                row={row}
                canManage={isOwner}
                onProjectMoved={(projectId) => setRowKept((r) => (r ? { ...r, project_id: projectId } : r))}
              />
              <EditorSaveStatus state={saveState} {...(canEdit ? { onSaveNow: () => void saveNow() } : {})} />
            </>
          ) : null
        }
        menuBar={<EditorMenuBar menus={menus} state={menuBar} fileMenu={row ? fileMenu : null} />}
        actions={
          <>
            <Button
              variant="quiet"
              icon={<History />}
              aria-label="Version history"
              title="Version history"
              aria-pressed={historyOpen}
              className="hidden aria-pressed:bg-accent sm:inline-flex"
              onClick={() => setHistoryOpen((v) => !v)}
            />
            <Button
              variant="outline"
              icon={<MonitorPlay />}
              title={`Present (${formatShortcut({ key: "Enter", mod: true })})`}
              disabled={deck.slides.length === 0}
              onClick={() => setPresentingFrom(current)}
              className="max-sm:px-2 max-sm:[&>span]:hidden"
            >
              <span>Slideshow</span>
            </Button>
            {row ? (
              <ShareButton
                resourceType="presentation"
                resourceId={row.id}
                resourceName={row.name}
                isOwner={isOwner}
                organizationId={row.organization_id}
                variant="primary"
              />
            ) : null}
          </>
        }
        toolbar={<EditorToolbar items={toolbarItems} menus={allMenus} />}
        ribbon={
          <EditorRibbon
            tabs={DECK_RIBBON}
            menus={allMenus}
            toolbar={toolbarItems}
            fileMenu={row ? fileMenu : null}
            end={<OfficeLookSwitch />}
          />
        }
      >
        <div className={cn("flex min-h-0 flex-1", isPhone ? "flex-col" : "flex-row")} data-presentation-editor={presentationId}>
          {row ? (
            <>
              {!isPhone && rail}
              {canvas}
              {isPhone && rail}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm" data-deck-loading="">
              <ShimmerText text="Opening your presentation…" />
            </div>
          )}
          <SlideSizeDialog open={sizeOpen} onOpenChange={setSizeOpen} initial={slideSizeOf(deck)} onApply={(size) => dispatch({ type: "setSlideSize", size })} />
          <EditorDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            title="Details"
            rows={[
              ["Name", row?.name],
              ["Created", formatDetailDate(row?.created_at)],
              ["Last edited", formatDetailDate(row?.updated_at)],
              ["Slides", String(deck.slides.length)],
            ]}
          />
          {historyOpen && !isPhone ? (
            <DeckHistoryPanel
              presentationId={presentationId}
              canEdit={canEdit}
              onClose={() => setHistoryOpen(false)}
              onRestored={() => {
                setHistoryOpen(false);
                void load();
              }}
            />
          ) : null}
        </div>
      </EditorDocumentHeader>

      {presentingFrom !== null && (
        <DeckPresenter
          deck={deck}
          start={presentingFrom}
          onClose={(at) => {
            setPresentingFrom(null);
            dispatchHist({ type: "select", index: at });
          }}
        />
      )}

      <FindReplaceDialog open={panel === "find"} onOpenChange={(o) => !o && setPanel(null)} deck={deck} dispatch={dispatch} goTo={(i) => dispatchHist({ type: "select", index: i })} />
      <BackgroundDialog open={panel === "background"} onOpenChange={(o) => !o && setPanel(null)} deck={deck} current={current} dispatch={dispatch} presentationId={presentationId} />
      <MotionDialog open={panel === "motion"} onOpenChange={(o) => !o && setPanel(null)} deck={deck} current={current} dispatch={dispatch} />
      <SpecialCharsDialog open={panel === "special"} onOpenChange={(o) => !o && setPanel(null)} onInsert={(c) => setTimeout(() => insertAtCaret(c), 0)} />
      <CommentsDialog open={panel === "comments"} onOpenChange={(o) => !o && setPanel(null)} deck={deck} current={current} dispatch={dispatch} canEdit={canEdit} />
      <ThemeBuilderDialog open={panel === "theme"} onOpenChange={(o) => !o && setPanel(null)} deck={deck} dispatch={dispatch} />
      <ImportSlidesDialog open={panel === "import"} onOpenChange={(o) => !o && setPanel(null)} dispatch={dispatch} presentationId={presentationId} />
      <AccessibilityDialog open={panel === "accessibility"} onOpenChange={(o) => !o && setPanel(null)} />

      <TextInputDialog
        open={imageSearchOpen}
        onOpenChange={setImageSearchOpen}
        title="Search for an image"
        placeholder="e.g. team meeting in a bright office"
        defaultValue={slide?.title ?? ""}
        confirmLabel="Use image"
        validate={(v) => (v.trim() ? null : "Describe the image")}
        onConfirm={(v) => {
          dispatch({ type: "setImage", index: current, image: null, prompt: v.trim() });
          setImageSearchOpen(false);
        }}
      />

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto text-sm">
            {flattenMenus(allMenus)
              .filter((a) => a.shortcut)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{a.label}</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 text-xs">{formatShortcut(a.shortcut!)}</kbd>
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
    </SurfaceRuntimeProvider>
  );
}

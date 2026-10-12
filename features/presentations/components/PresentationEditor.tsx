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
import { FilePlus2, FolderOpen, History, Loader2, MonitorPlay, Presentation } from "lucide-react";

import { Button } from "@ai-matrx/design-system/controls";
import { TextInputDialog } from "@ai-matrx/design-system";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { EditorDocumentHeader } from "@/features/shell/components/header/templates/EditorDocumentHeader";
import { EditorMenuBar, renderMenuEntries, useMenuBarState } from "@/components/editor-chrome/EditorMenuBar";
import { EditorToolbar } from "@/components/editor-chrome/EditorToolbar";
import { EditorSaveStatus, EditorTitleField, type EditorSaveState } from "@/components/editor-chrome/EditorTitleField";
import {
  boundActions,
  flattenMenus,
  formatShortcut,
  matchesShortcut,
  type EditorMenuEntry,
} from "@/components/editor-chrome/editor-menu-model";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { SlideEditContext, type SlideEditPort } from "@/components/mardown-display/blocks/presentations/slide-edit";
import { PRESET_LIST } from "@/components/mardown-display/blocks/presentations/presets";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import { canActOn } from "@/features/access-gate/service/canActOn";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { FileTitleMarks } from "@/features/file-actions/FileTitleMarks";
import { useFileRecordMenu } from "@/features/file-actions/useFileRecordMenu";
import { useLiveFileName } from "@/features/file-actions/useLiveFileName";
import { PRESENTATION_ADAPTER } from "@/features/file-actions/adapters";
import { mediaClient } from "@/features/files/media-client/client";
import { isServiceFailure } from "@/features/data-tables/types";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { cn } from "@/lib/utils";

import { blankDeck, getPath, type DeckAction } from "../deck-model";
import { historyReducer, initialHistory } from "../deck-history";
import { buildDeckMenus, buildDeckToolbar, type DeckChromeHost } from "../deck-commands";
import { deckDownloads } from "../deck-export";
import {
  createPresentation,
  getPresentation,
  PRESENTATION_NAME_MAX_LENGTH,
  renamePresentation,
  savePresentationDeck,
  type PresentationRow,
} from "../presentation-service";
import { PaperSlide } from "../slide-paper";
import { SlideRail } from "./SlideRail";
import { DeckPresenter } from "./DeckPresenter";
import { DeckHistoryPanel } from "./DeckHistoryPanel";

const AUTOSAVE_MS = 900;
const PRESETS = PRESET_LIST.map((p) => ({ key: p.key, name: p.name }));

function layoutOf(layout: unknown, type: unknown): string {
  const raw = String(layout || type || "").toLowerCase();
  if (raw === "intro" || raw === "cover") return "title";
  if (raw === "content" || raw === "") return "bullets";
  return raw;
}

export function PresentationEditor({ presentationId }: { presentationId: string }) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const isPhone = useIsMobile();
  const [row, setRow] = useState<PresentationRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [hist, dispatchHist] = useReducer(historyReducer, initialHistory(blankDeck()));
  const [saveState, setSaveState] = useState<EditorSaveState>("saved");
  const [notesShown, setNotesShown] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [presentingFrom, setPresentingFrom] = useState<number | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const savedRevision = useRef(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const menuBar = useMenuBarState();

  const { deck, current } = hist.present;
  const slide = deck.slides[current];

  const load = async () => {
    const res = await getPresentation(presentationId);
    if (isServiceFailure(res)) {
      setLoadError(res.error);
      return;
    }
    setRow(res.data);
    savedRevision.current = 0;
    dispatchHist({ type: "reset", deck: res.data.deck });
    setSaveState("saved");
  };

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    let live = true;
    void loadRef.current();
    void canActOn("presentation", presentationId, "editor").then((ok) => live && setCanEdit(ok));
    return () => {
      live = false;
    };
  }, [presentationId]);

  // Autosave: every content change (revision) is saved after a short pause; each save is one version.
  const deckRef = useRef(deck);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  const saveNow = async () => {
    const revision = hist.revision;
    if (!canEdit || revision === savedRevision.current) return;
    setSaveState("saving");
    const res = await savePresentationDeck(presentationId, deckRef.current);
    if (isServiceFailure(res)) {
      setSaveState("error");
      toast.error("Could not save the presentation", { description: res.error });
      return;
    }
    savedRevision.current = revision;
    setSaveState(revision === hist.revision ? "saved" : "dirty");
  };
  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  });
  useEffect(() => {
    if (hist.revision === savedRevision.current || !canEdit) return undefined;
    setSaveState("dirty");
    const t = setTimeout(() => void saveNowRef.current(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [hist.revision, canEdit]);
  // Leaving the page (or the editor) never drops the last edits.
  const revisionRef = useRef(hist.revision);
  useEffect(() => {
    revisionRef.current = hist.revision;
  }, [hist.revision]);
  useEffect(() => {
    const flush = () => {
      if (revisionRef.current !== savedRevision.current) void saveNowRef.current();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // A collaborator's (or an agent's) rename shows here live.
  useLiveFileName({ table: "presentation", column: "name", id: presentationId }, (name) => {
    setRow((r) => (r && r.name !== name ? { ...r, name } : r));
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
    setRow((r) => (r ? { ...r, name: res.data.name } : r));
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
  ];
  const menus = buildDeckMenus(host);
  const toolbarItems = buildDeckToolbar(host, menus);
  const allMenus = [...menus, { id: "file", label: "File", items: pageFileExtras }];

  const fileMenu = useFileRecordMenu(PRESENTATION_ADAPTER, row, {
    listHref: "/presentations",
    // The editor offers its LIVE deck (unsaved edits included).
    downloads: deckDownloads(() => Promise.resolve(deckRef.current), row?.name ?? "presentation"),
    onProjectMoved: (projectId) => setRow((r) => (r ? { ...r, project_id: projectId } : r)),
    menubar: menuBar.fileMenuProps(),
    ...(canEdit ? { onRename: applyRename } : {}),
    extra: renderMenuEntries(pageFileExtras),
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
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
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
        ) : slide ? (
          <SlideEditContext.Provider value={canEdit ? editPort : null}>
            <PaperSlide deck={deck} slide={slide} className="h-full w-full" />
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

  return (
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
                onProjectMoved={(projectId) => setRow((r) => (r ? { ...r, project_id: projectId } : r))}
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
                variant="default"
                size="sm"
                className="rounded-full px-4 max-sm:px-2.5 max-sm:[&>span]:hidden"
              />
            ) : null}
          </>
        }
        toolbar={<EditorToolbar items={toolbarItems} menus={allMenus} />}
      >
        <div className={cn("flex min-h-0 flex-1", isPhone ? "flex-col" : "flex-row")} data-presentation-editor={presentationId}>
          {!isPhone && rail}
          {canvas}
          {isPhone && rail}
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
  );
}

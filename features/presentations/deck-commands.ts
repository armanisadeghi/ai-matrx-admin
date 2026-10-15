/**
 * The presentation editor's command model — Google Slides' menu bar (Edit · View · Insert · Slide ·
 * Help; File is the shared file menu) and toolbar, as ONE data tree the menu bar, the "Menus"
 * search and the keyboard read (`components/editor-chrome/editor-menu-model`). Every row runs a
 * real deck command; Google's object tools (Arrange, Format, shapes) have no counterpart in a
 * layout-based deck and are omitted, never faked.
 *
 * PURE: the host is a port, so the mapping is tested with a fake.
 */

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Image as ImageIcon,
  ImagePlus,
  Keyboard,
  LayoutTemplate,
  MonitorPlay,
  Palette,
  Plus,
  Redo2,
  StickyNote,
  Trash2,
  Undo2,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  BarChart3,
  Bold,
  Clipboard,
  Copy as CopyIcon,
  EyeOff,
  Group,
  Hash,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MessageSquarePlus,
  Mic,
  Music,
  Omega,
  PaintBucket,
  RemoveFormatting,
  RotateCw,
  Scissors,
  Search,
  Shapes,
  Slash,
  SpellCheck,
  Table,
  Type as TypeIcon,
  Video,
  Workflow,
  FileCog,
} from "lucide-react";

import { AlignCenter, AlignJustify, AlignRight, Italic, Underline, ZoomIn, ZoomOut } from "lucide-react";

import type { EditorMenu, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import { googleExtensionsMenu, googleHelpHead, soon } from "@/components/editor-chrome/google-parity";
import type { EditorToolbarItem } from "@/components/editor-chrome/EditorToolbar";
import { EDITOR_LAYOUTS, type DeckAction, type DeckSlide, type EditorLayout } from "./deck-model";
import type { TextStyle } from "./deck-slide-ops";
import { toast } from "@/lib/toast";

export type DeckPreset = { key: string; name: string };

export interface DeckChromeHost {
  canEdit: boolean;
  slideCount: number;
  current: number;
  /** The current slide's layout key (for the check marks). */
  currentLayout: string;
  presetKey: string | null;
  presets: DeckPreset[];
  canUndo: boolean;
  canRedo: boolean;
  notesShown: boolean;
  /** The current slide (Edit → Copy / Cut hold a copy of it). */
  currentSlide?: DeckSlide | null;
  dispatch: (a: DeckAction) => void;
  undo: () => void;
  redo: () => void;
  present: (fromStart: boolean) => void;
  toggleNotes: () => void;
  uploadImage: () => void;
  searchImage: () => void;
  removeImage: () => void;
  hasImage: boolean;
  showShortcuts: () => void;
  /** Help → Send feedback (the app's feedback window). */
  sendFeedback?: () => void;
  skipped?: boolean;
  slideNumbers?: boolean;
  gridShown?: boolean;
  spellcheck?: boolean;
  voiceTyping?: boolean;
  /** The current slide's own text style (Format → Text). */
  slideTextStyle?: TextStyle;
  openPanel?: (panel: DeckPanel) => void;
  pastePlain?: () => void;
  toggleGrid?: () => void;
  toggleSpellcheck?: () => void;
  toggleVoiceTyping?: () => void;
}

/** The dialogs and panels the menu rows open. */
export type DeckPanel = "find" | "background" | "motion" | "special" | "comments" | "theme" | "import" | "accessibility";

const TEXT_COLORS = [
  ["Black", "#000000"],
  ["Dark grey", "#4B5563"],
  ["White", "#FFFFFF"],
  ["Red", "#DC2626"],
  ["Orange", "#EA580C"],
  ["Green", "#16A34A"],
  ["Blue", "#2563EB"],
  ["Indigo", "#4F46E5"],
  ["Purple", "#9333EA"],
] as const;

/** Format → Text styles the current slide's layout text (title, body, bullets). */
function formatItems(h: DeckChromeHost): EditorMenuEntry[] {
  const locked = () => !h.canEdit || h.slideCount === 0;
  const st = () => h.slideTextStyle ?? {};
  const apply = (style: Partial<TextStyle>) => h.dispatch({ type: "setSlideTextStyle", index: h.current, style });
  const toggle = (key: "bold" | "italic" | "underline") => () => apply({ [key]: !st()[key] });
  const scale = (dir: 1 | -1) => () => apply({ scale: Math.round(Math.max(0.5, Math.min(2, (st().scale ?? 1) + dir * 0.1)) * 10) / 10 });
  return [
    {
      kind: "submenu",
      id: "format.text",
      label: "Text",
      icon: Bold,
      items: [
        { kind: "action", id: "format.bold", label: "Bold", icon: Bold, shortcut: { key: "b", mod: true }, run: toggle("bold"), checked: () => Boolean(st().bold), disabled: locked },
        { kind: "action", id: "format.italic", label: "Italic", icon: Italic, shortcut: { key: "i", mod: true }, run: toggle("italic"), checked: () => Boolean(st().italic), disabled: locked },
        { kind: "action", id: "format.underline", label: "Underline", icon: Underline, shortcut: { key: "u", mod: true }, run: toggle("underline"), checked: () => Boolean(st().underline), disabled: locked },
        sep,
        { kind: "action", id: "format.size-up", label: "Increase font size", icon: ZoomIn, run: scale(1), disabled: locked },
        { kind: "action", id: "format.size-down", label: "Decrease font size", icon: ZoomOut, run: scale(-1), disabled: locked },
        sep,
        {
          kind: "submenu",
          id: "format.color",
          label: "Text colour",
          icon: PaintBucket,
          items: TEXT_COLORS.map(([name, hex]) => ({
            kind: "action" as const,
            id: `format.color.${hex.slice(1).toLowerCase()}`,
            label: name,
            keywords: ["color", "colour"],
            checked: () => (st().color ?? "").toLowerCase() === hex.toLowerCase(),
            run: () => apply({ color: hex }),
            disabled: locked,
          })),
        },
      ],
    },
    {
      kind: "submenu",
      id: "format.align",
      label: "Align",
      icon: AlignLeft,
      items: (
        [
          ["left", "Left", AlignLeft],
          ["center", "Center", AlignCenter],
          ["right", "Right", AlignRight],
          ["justify", "Justify", AlignJustify],
        ] as const
      ).map(
        ([key, label, icon]): EditorMenuEntry => ({ kind: "action", id: `format.align.${key}`, label, icon, checked: () => st().align === key, run: () => apply({ align: key }), disabled: locked }),
      ),
    },
    {
      kind: "submenu",
      id: "format.spacing",
      label: "Line spacing",
      items: [1, 1.15, 1.5, 2].map(
        (n): EditorMenuEntry => ({ kind: "action", id: `format.spacing.${String(n).replace(".", "-")}`, label: n === 1 ? "Single" : String(n), checked: () => st().lineHeight === n, run: () => apply({ lineHeight: n }), disabled: locked }),
      ),
    },
    soon("format.lists", "Bullets and numbering", "presentations.format-text", { icon: List }),
    sep,
    soon("format.options", "Format options", "presentations.format-options"),
    sep,
    {
      kind: "action",
      id: "format.clear",
      label: "Clear formatting",
      icon: RemoveFormatting,
      shortcut: { key: "\\", mod: true },
      run: () => h.dispatch({ type: "setSlideTextStyle", index: h.current, style: null }),
      disabled: locked,
    },
  ];
}

const sep: EditorMenuEntry = { kind: "separator" };

function layoutItems(h: DeckChromeHost, run: (layout: EditorLayout) => void, idPrefix: string, checks: boolean): EditorMenuEntry[] {
  return EDITOR_LAYOUTS.map((l) => ({
    kind: "action" as const,
    id: `${idPrefix}.${l.key}`,
    label: l.label,
    keywords: ["layout", l.key],
    run: () => run(l.key),
    ...(checks ? { checked: () => h.currentLayout === l.key } : {}),
    disabled: () => !h.canEdit,
  }));
}

/** Edit → Copy / Cut hold a slide here until Paste; it outlives a deck, so a slide can move between decks. */
let slideClipboard: DeckSlide | null = null;

/** Edit → Select all: every text on the slide stage selected, so the browser's own copy takes it. */
function selectAllOnSlide() {
  const stage = document.querySelector("[data-deck-canvas]");
  const sel = window.getSelection();
  if (!stage || !sel) return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    active.select();
    return;
  }
  if (active instanceof HTMLElement && active.isContentEditable) {
    sel.selectAllChildren(active);
    return;
  }
  sel.selectAllChildren(stage);
}

/** File → Page setup / Slide size (the editor owns the File menu; the ribbon's Design tab places this same row). */
export const deckPageSetupRow = (run: () => void): EditorMenuEntry => ({
  kind: "action",
  id: "file.page-setup",
  label: "Page setup",
  icon: FileCog,
  keywords: ["slide size", "widescreen", "4:3", "16:9"],
  run,
});

export function buildDeckMenus(h: DeckChromeHost): EditorMenu[] {
  const locked = () => !h.canEdit;
  const noSlide = () => !h.canEdit || h.slideCount === 0;
  const i = h.current;
  return [
    {
      id: "edit",
      label: "Edit",
      items: [
        { kind: "action", id: "edit.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true, bind: true }, run: h.undo, disabled: () => !h.canEdit || !h.canUndo },
        { kind: "action", id: "edit.redo", label: "Redo", icon: Redo2, shortcut: { key: "z", mod: true, shift: true, bind: true }, keywords: ["again"], run: h.redo, disabled: () => !h.canEdit || !h.canRedo },
        sep,
        {
          kind: "action",
          id: "edit.cut",
          label: "Cut slide",
          icon: Scissors,
          keywords: ["cut"],
          run: () => {
            if (!h.currentSlide) return;
            slideClipboard = structuredClone(h.currentSlide);
            h.dispatch({ type: "deleteSlide", index: i });
            toast.success("Slide cut");
          },
          disabled: noSlide,
        },
        {
          kind: "action",
          id: "edit.copy",
          label: "Copy slide",
          icon: CopyIcon,
          keywords: ["copy"],
          run: () => {
            if (!h.currentSlide) return;
            slideClipboard = structuredClone(h.currentSlide);
            toast.success("Slide copied");
          },
          disabled: () => h.slideCount === 0,
        },
        {
          kind: "action",
          id: "edit.paste",
          label: "Paste slide",
          icon: Clipboard,
          keywords: ["paste"],
          run: () => {
            if (!slideClipboard) {
              toast.error("Copy or cut a slide first");
              return;
            }
            h.dispatch({ type: "pasteSlide", after: i, slide: slideClipboard });
          },
          disabled: locked,
        },
        { kind: "action", id: "edit.paste-plain", label: "Paste without formatting", keywords: ["plain text", "clipboard"], shortcut: { key: "v", mod: true, shift: true, bind: true }, run: () => h.pastePlain?.(), disabled: locked },
        sep,
        { kind: "action", id: "edit.select-all", label: "Select all", run: selectAllOnSlide, disabled: () => h.slideCount === 0 },
        { kind: "action", id: "edit.delete", label: "Delete slide", icon: Trash2, keywords: ["remove"], run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
        sep,
        { kind: "action", id: "edit.duplicate", label: "Duplicate slide", icon: Copy, shortcut: { key: "d", mod: true, bind: true }, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        sep,
        { kind: "action", id: "edit.find-replace", label: "Find and replace", icon: Search, keywords: ["search", "replace"], shortcut: { key: "h", mod: true, bind: true }, run: () => h.openPanel?.("find"), disabled: () => h.slideCount === 0 },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { kind: "action", id: "view.present", label: "Present", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, bind: true }, keywords: ["slideshow", "full screen"], run: () => h.present(false) },
        { kind: "action", id: "view.present-start", label: "Present from beginning", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, shift: true, bind: true }, keywords: ["slideshow"], run: () => h.present(true) },
        { kind: "action", id: "view.motion", label: "Motion", keywords: ["transition"], run: () => h.openPanel?.("motion"), disabled: noSlide },
        { kind: "action", id: "view.theme-builder", label: "Theme builder", keywords: ["master"], run: () => h.openPanel?.("theme"), disabled: locked },
        { kind: "action", id: "view.grid", label: "Grid view", icon: LayoutGrid, keywords: ["sorter", "thumbnails"], shortcut: { key: "1", mod: true, alt: true, bind: true }, run: () => h.toggleGrid?.(), checked: () => Boolean(h.gridShown), disabled: () => h.slideCount === 0 },
        sep,
        { kind: "action", id: "view.notes", label: "Show speaker notes", icon: StickyNote, keywords: ["notes"], run: h.toggleNotes, checked: () => h.notesShown },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      items: [
        {
          kind: "submenu",
          id: "insert.image",
          label: "Image",
          icon: ImageIcon,
          items: [
            { kind: "action", id: "insert.image.upload", label: "Upload from computer", icon: ImagePlus, keywords: ["picture", "photo"], run: h.uploadImage, disabled: noSlide },
            { kind: "action", id: "insert.image.search", label: "Search the web", icon: ImageIcon, keywords: ["picture", "photo", "unsplash"], run: h.searchImage, disabled: noSlide },
            ...(h.hasImage
              ? [{ kind: "action" as const, id: "insert.image.remove", label: "Remove image", icon: Trash2, run: h.removeImage, disabled: noSlide }]
              : []),
          ],
        },
        soon("insert.text-box", "Text box", "presentations.insert-objects", { icon: TypeIcon }),
        soon("insert.audio", "Audio", "presentations.insert-media", { icon: Music }),
        soon("insert.video", "Video", "presentations.insert-media", { icon: Video }),
        soon("insert.shape", "Shape", "presentations.insert-objects", { icon: Shapes }),
        soon("insert.table", "Table", "presentations.insert-table", { icon: Table }),
        soon("insert.chart", "Chart", "editor.insert.chart", { icon: BarChart3 }),
        soon("insert.diagram", "Diagram", "presentations.insert-diagram", { icon: Workflow }),
        soon("insert.word-art", "Word art", "presentations.insert-objects"),
        soon("insert.line", "Line", "presentations.insert-objects", { icon: Slash }),
        sep,
        { kind: "action", id: "insert.special-characters", label: "Special characters", icon: Omega, keywords: ["symbol", "arrow", "emoji"], run: () => h.openPanel?.("special"), disabled: noSlide },
        soon("insert.animation", "Animation", "presentations.motion"),
        sep,
        soon("insert.link", "Link", "presentations.insert-link", { icon: LinkIcon, shortcut: { key: "k", mod: true } }),
        { kind: "action", id: "insert.comment", label: "Comment", icon: MessageSquarePlus, shortcut: { key: "m", mod: true, alt: true, bind: true }, run: () => h.openPanel?.("comments"), disabled: noSlide },
        sep,
        { kind: "submenu", id: "insert.slide", label: "New slide", icon: Plus, items: layoutItems(h, (layout) => h.dispatch({ type: "addSlide", after: i, layout }), "insert.slide", false) },
        { kind: "action", id: "insert.slide-numbers", label: "Slide numbers", icon: Hash, checked: () => Boolean(h.slideNumbers), run: () => h.dispatch({ type: "setSlideNumbers", show: !h.slideNumbers }), disabled: locked },
      ],
    },
    {
      id: "format",
      label: "Format",
      items: formatItems(h),
    },
    {
      id: "slide",
      label: "Slide",
      items: [
        { kind: "action", id: "slide.new", label: "New slide", icon: Plus, shortcut: { key: "m", mod: true, bind: true }, run: () => h.dispatch({ type: "addSlide", after: i }), disabled: locked },
        { kind: "action", id: "slide.duplicate", label: "Duplicate slide", icon: Copy, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        { kind: "action", id: "slide.delete", label: "Delete slide", icon: Trash2, run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
        { kind: "action", id: "slide.skip", label: "Skip slide", icon: EyeOff, keywords: ["hide"], checked: () => Boolean(h.skipped), run: () => h.dispatch({ type: "setSkipped", index: i, skipped: !h.skipped }), disabled: noSlide },
        sep,
        {
          kind: "submenu",
          id: "slide.move",
          label: "Move slide",
          items: [
            { kind: "action", id: "slide.move.up", label: "Move slide up", icon: ArrowUp, shortcut: { key: "ArrowUp", mod: true, bind: true }, run: () => h.dispatch({ type: "moveSlide", from: i, to: i - 1 }), disabled: () => noSlide() || i === 0 },
            { kind: "action", id: "slide.move.down", label: "Move slide down", icon: ArrowDown, shortcut: { key: "ArrowDown", mod: true, bind: true }, run: () => h.dispatch({ type: "moveSlide", from: i, to: i + 1 }), disabled: () => noSlide() || i >= h.slideCount - 1 },
            { kind: "action", id: "slide.move.start", label: "Move slide to beginning", icon: ArrowUpToLine, shortcut: { key: "ArrowUp", mod: true, shift: true, bind: true }, run: () => h.dispatch({ type: "moveSlide", from: i, to: 0 }), disabled: () => noSlide() || i === 0 },
            { kind: "action", id: "slide.move.end", label: "Move slide to end", icon: ArrowDownToLine, shortcut: { key: "ArrowDown", mod: true, shift: true, bind: true }, run: () => h.dispatch({ type: "moveSlide", from: i, to: h.slideCount - 1 }), disabled: () => noSlide() || i >= h.slideCount - 1 },
          ],
        },
        sep,
        { kind: "action", id: "slide.background", label: "Change background", icon: PaintBucket, run: () => h.openPanel?.("background"), disabled: noSlide },
        { kind: "submenu", id: "slide.layout", label: "Apply layout", icon: LayoutTemplate, items: layoutItems(h, (layout) => h.dispatch({ type: "setLayout", index: i, layout }), "slide.layout", true) },
        { kind: "action", id: "slide.transition", label: "Transition", run: () => h.openPanel?.("motion"), disabled: noSlide },
        sep,
        { kind: "action", id: "slide.edit-theme", label: "Edit theme", run: () => h.openPanel?.("theme"), disabled: locked },
        {
          kind: "submenu",
          id: "slide.theme",
          label: "Change theme",
          icon: Palette,
          keywords: ["template", "colors", "design"],
          items: h.presets.map((p) => ({
            kind: "action" as const,
            id: `slide.theme.${p.key}`,
            label: p.name,
            keywords: ["theme"],
            checked: () => h.presetKey === p.key,
            run: () => h.dispatch({ type: "setPreset", preset: p.key }),
            disabled: locked,
          })),
        },
      ],
    },
    {
      id: "arrange",
      label: "Arrange",
      items: [
        soon("arrange.order", "Order", "presentations.arrange", { icon: Layers }),
        soon("arrange.align", "Align", "presentations.arrange", { icon: AlignHorizontalJustifyCenter }),
        soon("arrange.distribute", "Distribute", "presentations.arrange"),
        soon("arrange.center", "Center on page", "presentations.arrange"),
        soon("arrange.rotate", "Rotate", "presentations.arrange", { icon: RotateCw }),
        sep,
        soon("arrange.group", "Group", "presentations.arrange", { icon: Group, shortcut: { key: "g", mod: true, alt: true } }),
        soon("arrange.ungroup", "Ungroup", "presentations.arrange", { shortcut: { key: "g", mod: true, alt: true, shift: true } }),
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        { kind: "action", id: "tools.spelling", label: "Spelling and grammar", icon: SpellCheck, keywords: ["spellcheck", "proofread"], checked: () => Boolean(h.spellcheck), run: () => h.toggleSpellcheck?.() },
        soon("tools.linked-objects", "Linked objects", "editor.tools.linked-objects"),
        soon("tools.dictionary", "Dictionary", "editor.tools.dictionary"),
        sep,
        soon("tools.qa", "Q&A history", "presentations.qa-history"),
        sep,
        { kind: "action", id: "tools.voice-typing", label: "Voice type speaker notes", icon: Mic, keywords: ["dictate", "microphone"], checked: () => Boolean(h.voiceTyping), run: () => h.toggleVoiceTyping?.(), disabled: noSlide },
        sep,
        soon("tools.notifications", "Notification settings", "editor.tools.notifications"),
        soon("tools.preferences", "Preferences", "editor.tools.preferences"),
        { kind: "action", id: "tools.accessibility", label: "Accessibility", run: () => h.openPanel?.("accessibility") },
      ],
    },
    googleExtensionsMenu("slides"),
    {
      id: "help",
      label: "Help",
      items: [...googleHelpHead(h.sendFeedback ? { sendFeedback: h.sendFeedback } : {}), { kind: "action", id: "help.shortcuts", label: "Keyboard shortcuts", icon: Keyboard, shortcut: { key: "/", mod: true, bind: true }, run: h.showShortcuts }],
    },
  ];
}

export function buildDeckToolbar(h: DeckChromeHost, menus: EditorMenu[]): EditorToolbarItem[] {
  const slideMenu = menus.find((m) => m.id === "slide");
  const layout = slideMenu?.items.find((e) => e.kind === "submenu" && e.id === "slide.layout");
  const theme = slideMenu?.items.find((e) => e.kind === "submenu" && e.id === "slide.theme");
  const newSlide = menus.find((m) => m.id === "insert")?.items.find((e) => e.kind === "submenu" && e.id === "insert.slide");
  const image = menus.find((m) => m.id === "insert")?.items.find((e) => e.kind === "submenu" && e.id === "insert.image");
  const layoutLabel = EDITOR_LAYOUTS.find((l) => l.key === h.currentLayout)?.label ?? "Layout";
  const presetLabel = h.presets.find((p) => p.key === h.presetKey)?.name ?? "Theme";
  return [
    { kind: "button", id: "tb.new", label: "New slide", icon: Plus, shortcut: { key: "m", mod: true }, run: () => h.dispatch({ type: "addSlide", after: h.current }), disabled: !h.canEdit },
    ...(newSlide && newSlide.kind === "submenu"
      ? [{ kind: "menu" as const, id: "tb.new-layout", label: "New slide with layout", icon: LayoutTemplate, items: newSlide.items, disabled: !h.canEdit }]
      : []),
    { kind: "button", id: "tb.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true }, run: h.undo, disabled: !h.canEdit || !h.canUndo },
    { kind: "button", id: "tb.redo", label: "Redo", icon: Redo2, shortcut: { key: "z", mod: true, shift: true }, run: h.redo, disabled: !h.canEdit || !h.canRedo },
    { kind: "separator", id: "tb.s1" },
    ...(image && image.kind === "submenu" ? [{ kind: "menu" as const, id: "tb.image", label: "Insert image", icon: ImageIcon, items: image.items, disabled: !h.canEdit }] : []),
    { kind: "separator", id: "tb.s2" },
    ...(layout && layout.kind === "submenu"
      ? [{ kind: "menu" as const, id: "tb.layout", label: "Layout", text: layoutLabel, widthClass: "w-36", items: layout.items, disabled: !h.canEdit }]
      : []),
    ...(theme && theme.kind === "submenu"
      ? [{ kind: "menu" as const, id: "tb.theme", label: "Theme", text: presetLabel, widthClass: "w-28", items: theme.items, disabled: !h.canEdit }]
      : []),
    { kind: "separator", id: "tb.s3" },
    { kind: "button", id: "tb.notes", label: "Speaker notes", icon: StickyNote, run: h.toggleNotes, active: h.notesShown },
  ];
}

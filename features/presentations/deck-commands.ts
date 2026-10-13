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
} from "lucide-react";

import type { EditorMenu, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import { googleExtensionsMenu, googleHelpHead, soon } from "@/components/editor-chrome/google-parity";
import type { EditorToolbarItem } from "@/components/editor-chrome/EditorToolbar";
import { EDITOR_LAYOUTS, type DeckAction, type EditorLayout } from "./deck-model";

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
        soon("edit.cut", "Cut", "presentations.clipboard", { icon: Scissors, shortcut: { key: "x", mod: true } }),
        soon("edit.copy", "Copy", "presentations.clipboard", { icon: CopyIcon, shortcut: { key: "c", mod: true } }),
        soon("edit.paste", "Paste", "presentations.clipboard", { icon: Clipboard, shortcut: { key: "v", mod: true } }),
        soon("edit.paste-plain", "Paste without formatting", "editor.edit.paste-plain", { shortcut: { key: "v", mod: true, shift: true } }),
        sep,
        soon("edit.select-all", "Select all", "presentations.select-all", { shortcut: { key: "a", mod: true } }),
        { kind: "action", id: "edit.delete", label: "Delete slide", icon: Trash2, keywords: ["remove"], run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
        sep,
        { kind: "action", id: "edit.duplicate", label: "Duplicate slide", icon: Copy, shortcut: { key: "d", mod: true, bind: true }, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        sep,
        soon("edit.find-replace", "Find and replace", "presentations.find-replace", { icon: Search, shortcut: { key: "h", mod: true } }),
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { kind: "action", id: "view.present", label: "Present", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, bind: true }, keywords: ["slideshow", "full screen"], run: () => h.present(false) },
        { kind: "action", id: "view.present-start", label: "Present from beginning", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, shift: true, bind: true }, keywords: ["slideshow"], run: () => h.present(true) },
        soon("view.motion", "Motion", "presentations.motion", { keywords: ["transition", "animation"] }),
        soon("view.theme-builder", "Theme builder", "presentations.master", { keywords: ["master"] }),
        soon("view.grid", "Grid view", "presentations.grid-view", { icon: LayoutGrid, shortcut: { key: "1", mod: true, alt: true } }),
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
        soon("insert.special-characters", "Special characters", "editor.insert.special-characters", { icon: Omega }),
        soon("insert.animation", "Animation", "presentations.motion"),
        sep,
        soon("insert.link", "Link", "presentations.insert-link", { icon: LinkIcon, shortcut: { key: "k", mod: true } }),
        soon("insert.comment", "Comment", "presentations.comment", { icon: MessageSquarePlus, shortcut: { key: "m", mod: true, alt: true } }),
        sep,
        { kind: "submenu", id: "insert.slide", label: "New slide", icon: Plus, items: layoutItems(h, (layout) => h.dispatch({ type: "addSlide", after: i, layout }), "insert.slide", false) },
        soon("insert.slide-numbers", "Slide numbers", "presentations.slide-numbers", { icon: Hash }),
      ],
    },
    {
      id: "format",
      label: "Format",
      items: [
        soon("format.text", "Text", "presentations.format-text", { icon: Bold }),
        soon("format.align", "Align and indent", "presentations.format-text", { icon: AlignLeft }),
        soon("format.spacing", "Line and paragraph spacing", "presentations.format-text"),
        soon("format.lists", "Bullets and numbering", "presentations.format-text", { icon: List }),
        sep,
        soon("format.options", "Format options", "presentations.format-options"),
        sep,
        soon("format.clear", "Clear formatting", "presentations.format-text", { icon: RemoveFormatting, shortcut: { key: "\\", mod: true } }),
      ],
    },
    {
      id: "slide",
      label: "Slide",
      items: [
        { kind: "action", id: "slide.new", label: "New slide", icon: Plus, shortcut: { key: "m", mod: true, bind: true }, run: () => h.dispatch({ type: "addSlide", after: i }), disabled: locked },
        { kind: "action", id: "slide.duplicate", label: "Duplicate slide", icon: Copy, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        { kind: "action", id: "slide.delete", label: "Delete slide", icon: Trash2, run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
        soon("slide.skip", "Skip slide", "presentations.skip-slide", { icon: EyeOff }),
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
        soon("slide.background", "Change background", "presentations.background", { icon: PaintBucket }),
        { kind: "submenu", id: "slide.layout", label: "Apply layout", icon: LayoutTemplate, items: layoutItems(h, (layout) => h.dispatch({ type: "setLayout", index: i, layout }), "slide.layout", true) },
        soon("slide.transition", "Transition", "presentations.motion"),
        sep,
        soon("slide.edit-theme", "Edit theme", "presentations.master"),
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
        soon("tools.spelling", "Spelling", "editor.tools.spelling", { icon: SpellCheck }),
        soon("tools.linked-objects", "Linked objects", "editor.tools.linked-objects"),
        soon("tools.dictionary", "Dictionary", "editor.tools.dictionary"),
        sep,
        soon("tools.qa", "Q&A history", "presentations.qa-history"),
        sep,
        soon("tools.voice-typing", "Voice type speaker notes", "editor.tools.voice-typing", { icon: Mic }),
        sep,
        soon("tools.notifications", "Notification settings", "editor.tools.notifications"),
        soon("tools.preferences", "Preferences", "editor.tools.preferences"),
        soon("tools.accessibility", "Accessibility", "editor.tools.accessibility"),
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

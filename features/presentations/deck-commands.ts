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
} from "lucide-react";

import type { EditorMenu, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
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
        { kind: "action", id: "edit.duplicate", label: "Duplicate slide", icon: Copy, shortcut: { key: "d", mod: true, bind: true }, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        { kind: "action", id: "edit.delete", label: "Delete slide", icon: Trash2, keywords: ["remove"], run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { kind: "action", id: "view.present", label: "Present", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, bind: true }, keywords: ["slideshow", "full screen"], run: () => h.present(false) },
        { kind: "action", id: "view.present-start", label: "Present from beginning", icon: MonitorPlay, shortcut: { key: "Enter", mod: true, shift: true, bind: true }, keywords: ["slideshow"], run: () => h.present(true) },
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
        { kind: "submenu", id: "insert.slide", label: "New slide", icon: Plus, items: layoutItems(h, (layout) => h.dispatch({ type: "addSlide", after: i, layout }), "insert.slide", false) },
      ],
    },
    {
      id: "slide",
      label: "Slide",
      items: [
        { kind: "action", id: "slide.new", label: "New slide", icon: Plus, shortcut: { key: "m", mod: true, bind: true }, run: () => h.dispatch({ type: "addSlide", after: i }), disabled: locked },
        { kind: "action", id: "slide.duplicate", label: "Duplicate slide", icon: Copy, run: () => h.dispatch({ type: "duplicateSlide", index: i }), disabled: noSlide },
        { kind: "action", id: "slide.delete", label: "Delete slide", icon: Trash2, run: () => h.dispatch({ type: "deleteSlide", index: i }), disabled: noSlide },
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
        { kind: "submenu", id: "slide.layout", label: "Apply layout", icon: LayoutTemplate, items: layoutItems(h, (layout) => h.dispatch({ type: "setLayout", index: i, layout }), "slide.layout", true) },
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
      id: "help",
      label: "Help",
      items: [{ kind: "action", id: "help.shortcuts", label: "Keyboard shortcuts", icon: Keyboard, shortcut: { key: "/", mod: true, bind: true }, run: h.showShortcuts }],
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

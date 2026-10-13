/**
 * The document editor's command map — Google Docs' menus and toolbar, each row
 * a real Univer 1.0.4 docs command (by id, through `univerAPI.executeCommand`).
 * Rows the free presets cannot do (line spacing, indent outside lists,
 * spelling) are absent, never disabled forever.
 *
 * Tested with a recording fake (`__tests__/doc-menus-run-real-univer-commands.test.ts`),
 * including a check that every id exists in the installed Univer bundles.
 */

import {
  AlignCenter,
  BarChart3,
  Languages,
  Mic,
  Omega,
  SpellCheck,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Clipboard,
  Copy,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  MessageSquarePlus,
  PaintRoller,
  Printer,
  Redo2,
  RemoveFormatting,
  Scissors,
  Search,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from "lucide-react";

import { googleExtensionsMenu, googleHelpHead, soon } from "@/components/editor-chrome/google-parity";
import type { EditorMenu, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import type { EditorToolbarItem } from "@/components/editor-chrome/EditorToolbar";

export interface DocsApiLike {
  executeCommand(id: string, params?: object): Promise<unknown> | unknown;
}

export interface DocChromeHost {
  api: DocsApiLike;
  editable: boolean;
  /** The open document's unit id (zoom needs it). */
  unitId: () => string | null;
  zoom: () => number;
  print: () => void;
  wordCount: () => void;
  fullScreen: () => boolean;
  toggleFullScreen: () => void;
  /** Help → Send feedback (the app's feedback window). */
  sendFeedback?: () => void;
}

export const DOC_STYLES = [
  { id: "normal", label: "Normal text", command: "doc.command.normal-text-heading" },
  { id: "title", label: "Title", command: "doc.command.title" },
  { id: "subtitle", label: "Subtitle", command: "doc.command.subtitle-heading" },
  { id: "h1", label: "Heading 1", command: "doc.command.h1-heading" },
  { id: "h2", label: "Heading 2", command: "doc.command.h2-heading" },
  { id: "h3", label: "Heading 3", command: "doc.command.h3-heading" },
  { id: "h4", label: "Heading 4", command: "doc.command.h4-heading" },
  { id: "h5", label: "Heading 5", command: "doc.command.h5-heading" },
] as const;
const DOC_FONTS = ["Arial", "Calibri", "Cambria", "Courier New", "Georgia", "Helvetica", "Times New Roman", "Verdana"] as const;
const DOC_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48] as const;
const DOC_ZOOMS = [50, 75, 90, 100, 125, 150, 200] as const;
const DOC_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Gray", value: "#666666" },
  { label: "Red", value: "#cc0000" },
  { label: "Orange", value: "#e69138" },
  { label: "Yellow", value: "#f1c232" },
  { label: "Green", value: "#6aa84f" },
  { label: "Blue", value: "#3c78d8" },
  { label: "Purple", value: "#674ea7" },
] as const;
const HIGHLIGHTS = [
  { label: "Yellow", value: "#ffff00" },
  { label: "Green", value: "#b6d7a8" },
  { label: "Blue", value: "#9fc5e8" },
  { label: "Pink", value: "#ead1dc" },
  { label: "Orange", value: "#f9cb9c" },
] as const;

const run = (h: DocChromeHost, id: string, params?: object) => () =>
  params ? h.api.executeCommand(id, params) : h.api.executeCommand(id);

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const zoomEntries = (h: DocChromeHost): EditorMenuEntry[] =>
  DOC_ZOOMS.map((z) => ({
    kind: "action" as const,
    id: `view.zoom.${z}`,
    label: `${z}%`,
    keywords: ["zoom"],
    checked: () => Math.round(h.zoom() * 100) === z,
    run: () => {
      const documentId = h.unitId();
      return h.api.executeCommand("doc.command.set-zoom-ratio", { zoomRatio: z / 100, ...(documentId ? { documentId } : {}) });
    },
  }));

const styleEntries = (h: DocChromeHost): EditorMenuEntry[] =>
  DOC_STYLES.map((s) => ({
    kind: "action" as const,
    id: `format.style.${s.id}`,
    label: s.label,
    keywords: ["paragraph style", "heading"],
    run: run(h, s.command),
  }));

const fontEntries = (h: DocChromeHost): EditorMenuEntry[] =>
  DOC_FONTS.map((f) => ({
    kind: "action" as const,
    id: `format.font.${slug(f)}`,
    label: f,
    keywords: ["font"],
    run: run(h, "doc.command.set-inline-format-font-family", { value: f }),
  }));

const sizeEntries = (h: DocChromeHost): EditorMenuEntry[] =>
  DOC_SIZES.map((s) => ({
    kind: "action" as const,
    id: `format.font-size.${s}`,
    label: String(s),
    keywords: ["font size"],
    run: run(h, "doc.command.set-inline-format-fontsize", { value: s }),
  }));

const colorEntries = (h: DocChromeHost, kind: "text" | "highlight"): EditorMenuEntry[] => [
  {
    kind: "action",
    id: `format.${kind}-color.reset`,
    label: kind === "text" ? "Reset" : "None",
    run: run(h, kind === "text" ? "doc.command.reset-inline-format-text-color" : "doc.command.reset-inline-format-text-background-color"),
  },
  { kind: "separator" },
  ...(kind === "text" ? DOC_COLORS : HIGHLIGHTS).map(
    (c): EditorMenuEntry => ({
      kind: "action",
      id: `format.${kind}-color.${slug(c.label)}`,
      label: c.label,
      keywords: [kind === "text" ? "text color" : "highlight color", "colour"],
      run: run(h, kind === "text" ? "doc.command.set-inline-format-text-color" : "doc.command.set-inline-format-text-background-color", { value: c.value }),
    }),
  ),
];

const alignEntries = (h: DocChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.align.left", label: "Left", icon: AlignLeft, keywords: ["align"], shortcut: { key: "l", mod: true, shift: true }, run: run(h, "doc.command.align-left") },
  { kind: "action", id: "format.align.center", label: "Center", icon: AlignCenter, keywords: ["align"], shortcut: { key: "e", mod: true, shift: true }, run: run(h, "doc.command.align-center") },
  { kind: "action", id: "format.align.right", label: "Right", icon: AlignRight, keywords: ["align"], shortcut: { key: "r", mod: true, shift: true }, run: run(h, "doc.command.align-right") },
  { kind: "action", id: "format.align.justify", label: "Justified", icon: AlignJustify, keywords: ["align"], shortcut: { key: "j", mod: true, shift: true }, run: run(h, "doc.command.align-justify") },
];

const listEntries = (h: DocChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.list.checklist", label: "Checklist", icon: ListChecks, keywords: ["to do", "tasks"], run: run(h, "doc.command.check-list") },
  { kind: "action", id: "format.list.bulleted", label: "Bulleted list", icon: List, shortcut: { key: "8", mod: true, shift: true }, run: run(h, "doc.command.bullet-list") },
  { kind: "action", id: "format.list.numbered", label: "Numbered list", icon: ListOrdered, shortcut: { key: "7", mod: true, shift: true }, run: run(h, "doc.command.order-list") },
];

export function buildDocMenus(h: DocChromeHost): EditorMenu[] {
  return [
    {
      id: "edit",
      label: "Edit",
      items: [
        { kind: "action", id: "edit.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true }, run: run(h, "univer.command.undo") },
        { kind: "action", id: "edit.redo", label: "Redo", icon: Redo2, shortcut: { key: "y", mod: true }, run: run(h, "univer.command.redo") },
        { kind: "separator" },
        { kind: "action", id: "edit.cut", label: "Cut", icon: Scissors, shortcut: { key: "x", mod: true }, run: run(h, "univer.command.cut") },
        { kind: "action", id: "edit.copy", label: "Copy", icon: Copy, shortcut: { key: "c", mod: true }, run: run(h, "univer.command.copy") },
        { kind: "action", id: "edit.paste", label: "Paste", icon: Clipboard, shortcut: { key: "v", mod: true }, run: run(h, "univer.command.paste") },
        soon("edit.paste-plain", "Paste without formatting", "editor.edit.paste-plain", { shortcut: { key: "v", mod: true, shift: true } }),
        { kind: "separator" },
        { kind: "action", id: "edit.select-all", label: "Select all", shortcut: { key: "a", mod: true }, run: run(h, "doc.command.select-all") },
        { kind: "separator" },
        { kind: "action", id: "edit.find", label: "Find", icon: Search, shortcut: { key: "f", mod: true }, run: run(h, "ui.operation.open-find-dialog") },
        { kind: "action", id: "edit.find-replace", label: "Find and replace", shortcut: { key: "h", mod: true }, run: run(h, "ui.operation.open-replace-dialog") },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        soon("view.mode", "Mode", "documents.mode", { keywords: ["editing", "suggesting", "viewing"] }),
        { kind: "separator" },
        {
          kind: "submenu",
          id: "view.show",
          label: "Show",
          items: [
            soon("view.show.print-layout", "Show print layout", "documents.show-layout"),
            soon("view.show.ruler", "Show ruler", "documents.show-layout"),
            soon("view.show.outline", "Show outline", "documents.show-layout", { shortcut: { key: "h", mod: true, alt: true } }),
            soon("view.show.non-printing", "Show non-printing characters", "documents.show-layout"),
          ],
        },
        { kind: "separator" },
        { kind: "submenu", id: "view.zoom", label: "Zoom", items: zoomEntries(h) },
        { kind: "action", id: "view.comments", label: "Comments", keywords: ["comment panel"], run: run(h, "docs.operation.toggle-comment-panel") },
        { kind: "action", id: "view.full-screen", label: "Full screen", checked: () => h.fullScreen(), run: () => h.toggleFullScreen() },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      items: [
        { kind: "action", id: "insert.image", label: "Image", icon: Image, keywords: ["picture", "photo"], run: run(h, "doc.command.insert-float-image") },
        { kind: "action", id: "insert.table", label: "Table", icon: Table, run: run(h, "doc.operation.create-table") },
        soon("insert.building-blocks", "Building blocks", "documents.building-blocks"),
        soon("insert.smart-chips", "Smart chips", "editor.insert.smart-chips"),
        { kind: "action", id: "insert.link", label: "Link", icon: Link, shortcut: { key: "k", mod: true }, run: run(h, "doc.operation.show-hyper-link-edit-popup") },
        soon("insert.drawing", "Drawing", "editor.insert.drawing"),
        soon("insert.chart", "Chart", "editor.insert.chart", { icon: BarChart3 }),
        soon("insert.symbols", "Special characters", "editor.insert.special-characters", { icon: Omega }),
        soon("insert.tabs", "Tabs", "documents.tabs"),
        { kind: "separator" },
        { kind: "action", id: "insert.horizontal-line", label: "Horizontal line", run: run(h, "doc.command.horizontal-line") },
        soon("insert.emoji", "Emoji", "editor.insert.emoji"),
        soon("insert.footnote", "Footnote", "documents.footnote", { shortcut: { key: "f", mod: true, alt: true } }),
        {
          kind: "submenu",
          id: "insert.break",
          label: "Break",
          items: [
            { kind: "action", id: "insert.break.section", label: "Section break", keywords: ["page break"], run: run(h, "docs.operation.insert-section-break") },
            { kind: "action", id: "insert.break.column", label: "Column break", run: run(h, "docs.operation.insert-column-break") },
          ],
        },
        soon("insert.page-numbers", "Page numbers", "documents.page-numbers"),
        soon("insert.headers-footers", "Headers and footers", "documents.headers-footers"),
        soon("insert.bookmark", "Bookmark", "documents.bookmark"),
        soon("insert.toc", "Table of contents", "documents.table-of-contents"),
        { kind: "separator" },
        { kind: "action", id: "insert.comment", label: "Comment", icon: MessageSquarePlus, run: run(h, "docs.operation.start-add-comment") },
      ],
    },
    {
      id: "format",
      label: "Format",
      items: [
        {
          kind: "submenu",
          id: "format.text",
          label: "Text",
          icon: Bold,
          items: [
            { kind: "action", id: "format.text.bold", label: "Bold", icon: Bold, shortcut: { key: "b", mod: true }, run: run(h, "doc.command.set-inline-format-bold") },
            { kind: "action", id: "format.text.italic", label: "Italic", icon: Italic, shortcut: { key: "i", mod: true }, run: run(h, "doc.command.set-inline-format-italic") },
            { kind: "action", id: "format.text.underline", label: "Underline", icon: Underline, shortcut: { key: "u", mod: true }, run: run(h, "doc.command.set-inline-format-underline") },
            { kind: "action", id: "format.text.strikethrough", label: "Strikethrough", icon: Strikethrough, shortcut: { key: "x", mod: true, shift: true }, run: run(h, "doc.command.set-inline-format-strikethrough") },
            { kind: "action", id: "format.text.superscript", label: "Superscript", shortcut: { key: ".", mod: true }, run: run(h, "doc.command.set-inline-format-superscript") },
            { kind: "action", id: "format.text.subscript", label: "Subscript", shortcut: { key: ",", mod: true }, run: run(h, "doc.command.set-inline-format-subscript") },
          ],
        },
        { kind: "submenu", id: "format.styles", label: "Paragraph styles", items: styleEntries(h) },
        { kind: "submenu", id: "format.align", label: "Align", icon: AlignLeft, items: alignEntries(h) },
        soon("format.line-spacing", "Line and paragraph spacing", "documents.line-spacing"),
        soon("format.columns", "Columns", "documents.columns"),
        { kind: "submenu", id: "format.lists", label: "Bullets and numbering", icon: List, items: listEntries(h) },
        { kind: "submenu", id: "format.font-size", label: "Font size", items: sizeEntries(h) },
        { kind: "separator" },
        soon("format.headers-footers", "Headers and footers", "documents.headers-footers"),
        soon("format.page-numbers", "Page numbers", "documents.page-numbers"),
        { kind: "action", id: "format.page-setup", label: "Page setup", keywords: ["margins", "orientation", "paper size"], run: run(h, "docs.operation.open-page-setting") },
        soon("format.pageless", "Switch to Pageless format", "documents.pageless"),
        { kind: "separator" },
        soon("format.table", "Table", "documents.table-properties"),
        soon("format.image", "Image", "documents.image-options"),
        soon("format.borders", "Borders and lines", "documents.borders-lines"),
        { kind: "separator" },
        { kind: "action", id: "format.clear", label: "Clear formatting", icon: RemoveFormatting, run: run(h, "ui.command.clear-formatting") },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        soon("tools.spelling", "Spelling and grammar", "editor.tools.spelling", { icon: SpellCheck }),
        { kind: "action", id: "tools.word-count", label: "Word count", shortcut: { key: "c", mod: true, shift: true, bind: true }, run: () => h.wordCount() },
        soon("tools.review-suggestions", "Review suggested edits", "documents.review-suggestions"),
        soon("tools.compare", "Compare documents", "documents.compare"),
        soon("tools.citations", "Citations", "documents.citations"),
        soon("tools.linked-objects", "Linked objects", "editor.tools.linked-objects"),
        soon("tools.dictionary", "Dictionary", "editor.tools.dictionary", { shortcut: { key: "y", mod: true, shift: true } }),
        { kind: "separator" },
        soon("tools.translate", "Translate document", "documents.translate", { icon: Languages }),
        soon("tools.voice-typing", "Voice typing", "editor.tools.voice-typing", { icon: Mic, shortcut: { key: "s", mod: true, shift: true } }),
        { kind: "separator" },
        soon("tools.notifications", "Notification settings", "editor.tools.notifications"),
        soon("tools.preferences", "Preferences", "editor.tools.preferences"),
        soon("tools.accessibility", "Accessibility", "editor.tools.accessibility"),
        { kind: "separator" },
        { kind: "action", id: "tools.comments", label: "Comments panel", run: run(h, "docs.operation.toggle-comment-panel") },
      ],
    },
    googleExtensionsMenu("docs"),
    {
      id: "help",
      label: "Help",
      items: [...googleHelpHead(h.sendFeedback ? { sendFeedback: h.sendFeedback } : {}), { kind: "action", id: "help.shortcuts", label: "Keyboard shortcuts", shortcut: { key: "\\", mod: true }, run: run(h, "base-ui.operation.toggle-shortcut-panel") }],
    },
  ];
}

export function buildDocToolbar(h: DocChromeHost): EditorToolbarItem[] {
  const ro = !h.editable;
  return [
    { kind: "button", id: "tb.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true }, run: run(h, "univer.command.undo"), disabled: ro },
    { kind: "button", id: "tb.redo", label: "Redo", icon: Redo2, shortcut: { key: "y", mod: true }, run: run(h, "univer.command.redo"), disabled: ro },
    { kind: "button", id: "tb.print", label: "Print", icon: Printer, run: () => h.print() },
    { kind: "button", id: "tb.paint-format", label: "Paint format", icon: PaintRoller, run: run(h, "ui.operation.activate-format-painter"), disabled: ro },
    { kind: "menu", id: "tb.zoom", label: "Zoom", text: `${Math.round(h.zoom() * 100)}%`, widthClass: "w-[4.25rem]", items: zoomEntries(h) },
    { kind: "separator", id: "tb.s1" },
    { kind: "menu", id: "tb.style", label: "Styles", text: "Styles", widthClass: "w-[6.5rem]", items: styleEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s2" },
    { kind: "menu", id: "tb.font", label: "Font", text: "Font", widthClass: "w-[5.5rem]", items: fontEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s3" },
    { kind: "menu", id: "tb.size", label: "Font size", text: "Size", widthClass: "w-[3.5rem]", items: sizeEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s4" },
    { kind: "button", id: "tb.bold", label: "Bold", icon: Bold, shortcut: { key: "b", mod: true }, run: run(h, "doc.command.set-inline-format-bold"), disabled: ro },
    { kind: "button", id: "tb.italic", label: "Italic", icon: Italic, shortcut: { key: "i", mod: true }, run: run(h, "doc.command.set-inline-format-italic"), disabled: ro },
    { kind: "button", id: "tb.underline", label: "Underline", icon: Underline, shortcut: { key: "u", mod: true }, run: run(h, "doc.command.set-inline-format-underline"), disabled: ro },
    { kind: "menu", id: "tb.text-color", label: "Text color", icon: Baseline, items: colorEntries(h, "text"), disabled: ro },
    { kind: "menu", id: "tb.highlight", label: "Highlight color", icon: Highlighter, items: colorEntries(h, "highlight"), disabled: ro },
    { kind: "separator", id: "tb.s5" },
    { kind: "button", id: "tb.link", label: "Insert link", icon: Link, shortcut: { key: "k", mod: true }, run: run(h, "doc.operation.show-hyper-link-edit-popup"), disabled: ro },
    { kind: "button", id: "tb.comment", label: "Add comment", icon: MessageSquarePlus, run: run(h, "docs.operation.start-add-comment") },
    { kind: "button", id: "tb.image", label: "Insert image", icon: Image, run: run(h, "doc.command.insert-float-image"), disabled: ro },
    { kind: "separator", id: "tb.s6" },
    { kind: "menu", id: "tb.align", label: "Align", icon: AlignLeft, items: alignEntries(h), disabled: ro },
    { kind: "button", id: "tb.checklist", label: "Checklist", icon: ListChecks, run: run(h, "doc.command.check-list"), disabled: ro },
    { kind: "button", id: "tb.bulleted", label: "Bulleted list", icon: List, shortcut: { key: "8", mod: true, shift: true }, run: run(h, "doc.command.bullet-list"), disabled: ro },
    { kind: "button", id: "tb.numbered", label: "Numbered list", icon: ListOrdered, shortcut: { key: "7", mod: true, shift: true }, run: run(h, "doc.command.order-list"), disabled: ro },
    { kind: "separator", id: "tb.s7" },
    { kind: "button", id: "tb.clear", label: "Clear formatting", icon: RemoveFormatting, run: run(h, "ui.command.clear-formatting"), disabled: ro },
  ];
}

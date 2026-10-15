/**
 * The document's Microsoft 365 ribbon (Word on the web's tabs and groups) over the SAME command
 * map as the Google menu bar and toolbar (`buildDocMenus` / `buildDocToolbar`). Ids only — the
 * ribbon runs nothing of its own. Word's References tab is absent: nothing in the editor maps to
 * it (no footnotes or contents yet). Coverage is proven by the ribbon forcing test.
 */

import {
  Clipboard,
  FileCog,
  Image,
  Keyboard,
  Link,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Minus,
  SeparatorHorizontal,
  Table,
  Type,
  ZoomIn,
  Hash,
  Accessibility,
  AtSign,
  BarChart3,
  Bell,
  Blocks,
  BookA,
  Bookmark,
  Columns2,
  FileCheck,
  GitCompare,
  Languages,
  ListCollapse,
  ListTree,
  Mic,
  Omega,
  PanelTop,
  PencilLine,
  PenTool,
  Quote,
  Ruler,
  Settings2,
  Smile,
  SpellCheck,
  Square,
  Superscript,
  Ellipsis,
  AlignJustify,
} from "lucide-react";
import type { GoogleOnlyRows, RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";
import { AUTOMATE_TAB, HELP_HEAD_CONTROLS } from "@/components/editor-chrome/ribbon-parity";

/** Menu rows the Microsoft look deliberately does not place (id -> reason). Empty: every row is placed. */
export const DOC_GOOGLE_ONLY: GoogleOnlyRows = {};

export const DOC_RIBBON: RibbonTabSpec[] = [
  {
    id: "home",
    label: "Home",
    groups: [
      { id: "undo", label: "Undo", controls: [{ ref: "edit.undo", size: "icon" }, { ref: "edit.redo", size: "icon" }], perRow: 1 },
      {
        id: "clipboard",
        label: "Clipboard",
        controls: [
          { ref: "edit.paste", size: "large", icon: Clipboard },
          "edit.cut",
          "edit.copy",
          { ref: "tb.paint-format", label: "Format Painter" },
        ],
      },
      {
        id: "font",
        label: "Font",
        perRow: 5,
        controls: [
          { ref: "tb.font", size: "icon" },
          { ref: "tb.size", size: "icon" },
          { ref: "format.clear", size: "icon" },
          { ref: "tb.bold", size: "icon" },
          { ref: "tb.italic", size: "icon" },
          { ref: "tb.underline", size: "icon" },
          { ref: "format.text", size: "icon", label: "More", icon: Ellipsis },
          { ref: "tb.highlight", size: "icon" },
          { ref: "tb.text-color", size: "icon" },
        ],
      },
      {
        id: "paragraph",
        label: "Paragraph",
        perRow: 4,
        controls: [
          { ref: "tb.bulleted", size: "icon" },
          { ref: "tb.numbered", size: "icon" },
          { ref: "tb.checklist", size: "icon" },
          { ref: "format.lists", size: "icon", label: "Lists", icon: ListTree },
          { ref: "tb.align", size: "icon" },
        ],
      },
      {
        id: "styles",
        label: "Styles",
        controls: [
          { ref: "tb.style", size: "large", label: "Styles", icon: Type },
        ],
      },
      {
        id: "editing",
        label: "Editing",
        controls: [
          { ref: "edit.find", label: "Find" },
          { ref: "edit.find-replace", label: "Replace" },
          { ref: "edit.select-all", label: "Select all" },
          { ref: "edit.paste-plain", label: "Paste as text" },
        ],
      },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      { id: "pages-blocks", label: "Pages", controls: [{ ref: "insert.building-blocks", size: "large", label: "Building blocks", icon: Blocks }, { ref: "insert.tabs", label: "Tabs", icon: PanelTop }] },
      { id: "tables", label: "Tables", controls: [{ ref: "insert.table", size: "large", icon: Table }] },
      {
        id: "illustrations",
        label: "Illustrations",
        controls: [
          { ref: "insert.image", size: "large", label: "Picture", icon: Image },
          { ref: "tb.image", label: "Image" },
          { ref: "insert.drawing", label: "Drawing", icon: PenTool },
          { ref: "insert.chart", label: "Chart", icon: BarChart3 },
          { ref: "insert.smart-chips", label: "Smart chips", icon: AtSign },
        ],
      },
      {
        id: "links",
        label: "Links",
        controls: [
          { ref: "insert.link", size: "large", icon: Link },
          { ref: "tb.link", label: "Insert link" },
        ],
      },
      {
        id: "comments",
        label: "Comments",
        controls: [
          { ref: "insert.comment", size: "large", icon: MessageSquarePlus },
          { ref: "tb.comment", label: "Add comment" },
        ],
      },
      {
        id: "pages",
        label: "Pages",
        controls: [
          { ref: "insert.break", size: "large", label: "Break", icon: SeparatorHorizontal },
          { ref: "insert.horizontal-line", label: "Horizontal line", icon: Minus },
        ],
      },
      {
        id: "header-footer",
        label: "Header & Footer",
        controls: [
          { ref: "insert.headers-footers", size: "large", label: "Header & Footer", icon: PanelTop },
          { ref: "insert.page-numbers", label: "Page Number", icon: Hash },
        ],
      },
      {
        id: "references",
        label: "References",
        controls: [
          { ref: "insert.toc", label: "Table of Contents", icon: ListTree },
          { ref: "insert.footnote", label: "Footnote", icon: Superscript },
          { ref: "insert.bookmark", label: "Bookmark", icon: Bookmark },
        ],
      },
      {
        id: "symbols",
        label: "Symbols",
        controls: [
          { ref: "insert.symbols", label: "Symbol", icon: Omega },
          { ref: "insert.emoji", label: "Emoji", icon: Smile },
        ],
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    groups: [
      { id: "page-setup", label: "Page Setup", controls: [{ ref: "format.page-setup", size: "large", label: "Page Setup", icon: FileCog }, { ref: "format.pageless", label: "Pageless", icon: FileCog }, { ref: "format.columns", label: "Columns", icon: Columns2 }] },
      {
        id: "paragraph",
        label: "Paragraph",
        controls: [
          { ref: "format.line-spacing", label: "Spacing", icon: ListCollapse },
          { ref: "format.borders", label: "Borders", icon: Square },
          { ref: "format.headers-footers", label: "Header & Footer", icon: PanelTop },
          { ref: "format.page-numbers", label: "Page Number", icon: Hash },
        ],
      },
      {
        id: "arrange",
        label: "Arrange",
        controls: [
          { ref: "format.table", label: "Table properties", icon: Table },
          { ref: "format.image", label: "Image options", icon: Image },
        ],
      },
      { id: "breaks", label: "Breaks", controls: [{ ref: "insert.break.section", label: "Section break" }, { ref: "insert.break.column", label: "Column break" }] },
      { id: "print", label: "Print", controls: [{ ref: "tb.print", size: "large", label: "Print" }] },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [
      {
        id: "proofing",
        label: "Proofing",
        controls: [
          { ref: "tools.spelling", size: "large", label: "Spelling & Grammar", icon: SpellCheck },
          { ref: "tools.word-count", size: "large", label: "Word Count", icon: Hash },
          { ref: "tools.dictionary", label: "Dictionary", icon: BookA },
        ],
      },
      {
        id: "language",
        label: "Language",
        controls: [
          { ref: "tools.translate", size: "large", label: "Translate", icon: Languages },
          { ref: "tools.voice-typing", label: "Dictate", icon: Mic },
        ],
      },
      {
        id: "tracking",
        label: "Tracking",
        controls: [
          { ref: "view.mode", label: "Editing mode", icon: PencilLine },
          { ref: "tools.review-suggestions", label: "Review changes", icon: FileCheck },
          { ref: "tools.compare", label: "Compare", icon: GitCompare },
        ],
      },
      {
        id: "research",
        label: "Research",
        controls: [
          { ref: "tools.citations", label: "Citations", icon: Quote },
          { ref: "tools.linked-objects", label: "Linked objects", icon: Link },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        controls: [
          { ref: "tools.accessibility", label: "Accessibility", icon: Accessibility },
          { ref: "tools.notifications", label: "Notifications", icon: Bell },
          { ref: "tools.preferences", label: "Preferences", icon: Settings2 },
        ],
      },
      {
        id: "comments",
        label: "Comments",
        controls: [
          { ref: "insert.comment", size: "large", label: "New Comment", icon: MessageSquarePlus },
          { ref: "view.comments", label: "Show Comments", icon: MessageSquare },
          { ref: "tools.comments", label: "Comments panel" },
        ],
      },
    ],
  },
  {
    id: "view",
    label: "View",
    groups: [
      {
        id: "zoom",
        label: "Zoom",
        controls: [
          { ref: "tb.zoom", size: "large", icon: ZoomIn },
        ],
      },
      {
        id: "show",
        label: "Show",
        controls: [{ ref: "view.show", size: "large", label: "Show", icon: Ruler }],
      },
      { id: "full-screen", label: "Full Screen", controls: [{ ref: "view.full-screen", size: "large", icon: Maximize2 }] },
    ],
  },
  AUTOMATE_TAB,
  {
    id: "help",
    label: "Help",
    groups: [{ id: "help", label: "Help", controls: [...HELP_HEAD_CONTROLS, { ref: "help.shortcuts", size: "large", icon: Keyboard }] }],
  },
];

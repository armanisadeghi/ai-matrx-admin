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
} from "lucide-react";
import type { GoogleOnlyRows, RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";

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
          { ref: "tb.clear", size: "icon" },
          { ref: "tb.bold", size: "icon" },
          { ref: "tb.italic", size: "icon" },
          { ref: "tb.underline", size: "icon" },
          { ref: "format.text", size: "icon", label: "More" },
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
          { ref: "format.lists", size: "icon", label: "Lists" },
          { ref: "tb.align", size: "icon" },
          { ref: "format.align", size: "icon", label: "Align" },
        ],
      },
      {
        id: "styles",
        label: "Styles",
        controls: [
          { ref: "tb.style", size: "large", label: "Styles", icon: Type },
          { ref: "format.styles", label: "Paragraph styles" },
        ],
      },
      {
        id: "editing",
        label: "Editing",
        controls: [
          { ref: "edit.find", label: "Find" },
          { ref: "edit.find-replace", label: "Replace" },
          { ref: "edit.select-all", label: "Select all" },
          { ref: "format.clear", label: "Clear formatting" },
        ],
      },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      { id: "tables", label: "Tables", controls: [{ ref: "insert.table", size: "large", icon: Table }] },
      {
        id: "illustrations",
        label: "Illustrations",
        controls: [
          { ref: "insert.image", size: "large", label: "Picture", icon: Image },
          { ref: "tb.image", label: "Image" },
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
    ],
  },
  {
    id: "layout",
    label: "Layout",
    groups: [
      { id: "page-setup", label: "Page Setup", controls: [{ ref: "format.page-setup", size: "large", label: "Page Setup", icon: FileCog }] },
      { id: "breaks", label: "Breaks", controls: [{ ref: "insert.break.section", label: "Section break" }, { ref: "insert.break.column", label: "Column break" }] },
      { id: "print", label: "Print", controls: [{ ref: "tb.print", size: "large", label: "Print" }] },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [
      { id: "proofing", label: "Proofing", controls: [{ ref: "tools.word-count", size: "large", label: "Word Count", icon: Hash }] },
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
          { ref: "view.zoom", size: "large", icon: ZoomIn },
          { ref: "tb.zoom", size: "icon" },
        ],
      },
      { id: "full-screen", label: "Full Screen", controls: [{ ref: "view.full-screen", size: "large", icon: Maximize2 }] },
    ],
  },
  {
    id: "help",
    label: "Help",
    groups: [{ id: "help", label: "Help", controls: [{ ref: "help.shortcuts", size: "large", icon: Keyboard }] }],
  },
];

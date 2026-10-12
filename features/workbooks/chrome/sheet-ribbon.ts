/**
 * The workbook's Microsoft 365 ribbon (Excel on the web's tabs and groups) over the SAME command
 * map as the Google menu bar and toolbar (`buildSheetMenus` / `buildSheetToolbar`). Ids only — the
 * ribbon runs nothing of its own. Coverage is proven by the ribbon forcing test.
 */

import {
  ArrowDownAZ,
  ArrowDownZA,
  CheckSquare,
  Clipboard,
  Columns3,
  Eraser,
  Filter,
  Grid2x2Check,
  Image,
  Link,
  ListChecks,
  ListFilter,
  Lock,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  PanelTopClose,
  Paintbrush,
  Rows3,
  Sheet,
  Sigma,
  SquareFunction,
  StickyNote,
  Table,
  TableCellsSplit,
  Trash2,
  ZoomIn,
  Keyboard,
} from "lucide-react";
import type { RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";

export const SHEET_RIBBON: RibbonTabSpec[] = [
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
          { ref: "edit.paste-special", label: "Paste Special" },
        ],
      },
      {
        id: "font",
        label: "Font",
        perRow: 6,
        controls: [
          { ref: "tb.font", size: "icon" },
          { ref: "tb.size", size: "icon" },
          { ref: "tb.size-up", size: "icon" },
          { ref: "tb.size-down", size: "icon" },
          { ref: "tb.bold", size: "icon" },
          { ref: "tb.italic", size: "icon" },
          { ref: "format.text.underline", size: "icon" },
          { ref: "tb.strike", size: "icon" },
          { ref: "tb.borders", size: "icon" },
          { ref: "tb.fill", size: "icon" },
          { ref: "tb.text-color", size: "icon" },
          { ref: "format.font-size", size: "icon", label: "Size" },
        ],
      },
      {
        id: "alignment",
        label: "Alignment",
        perRow: 3,
        controls: [
          { ref: "tb.valign", size: "icon" },
          { ref: "tb.halign", size: "icon" },
          { ref: "tb.rotate", size: "icon" },
          { ref: "tb.wrap", size: "icon" },
          { ref: "tb.merge", size: "icon" },
          { ref: "format.alignment", size: "icon" },
        ],
      },
      {
        id: "number",
        label: "Number",
        perRow: 4,
        controls: [
          { ref: "tb.more-formats", size: "icon" },
          { ref: "tb.currency", size: "icon" },
          { ref: "tb.percent", size: "icon" },
          { ref: "tb.decimal-less", size: "icon" },
          { ref: "tb.decimal-more", size: "icon" },
          { ref: "format.number", size: "icon", label: "Number format" },
        ],
      },
      {
        id: "styles",
        label: "Styles",
        controls: [
          { ref: "format.conditional", size: "large", label: "Conditional Formatting", icon: Grid2x2Check },
          { ref: "format.convert-table", label: "Format as Table", icon: Table },
          { ref: "format.alternating", label: "Alternating colors" },
          { ref: "format.text", label: "Text style" },
        ],
      },
      {
        id: "cells",
        label: "Cells",
        controls: [
          { ref: "insert.rows", label: "Insert rows", icon: Rows3 },
          { ref: "insert.columns", label: "Insert columns", icon: Columns3 },
          { ref: "edit.delete", label: "Delete", icon: Trash2 },
        ],
      },
      {
        id: "editing",
        label: "Editing",
        controls: [
          { ref: "tb.functions", size: "large", label: "AutoSum", icon: Sigma },
          { ref: "data.sort-range", label: "Sort", icon: ListFilter },
          { ref: "edit.find", label: "Find" },
          { ref: "edit.find-replace", label: "Replace" },
          { ref: "format.clear", label: "Clear", icon: Eraser },
        ],
      },
      { id: "more", label: "More", controls: [{ ref: "menu:edit", label: "Edit" }, { ref: "menu:format", label: "Format" }] },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      { id: "tables", label: "Tables", controls: [{ ref: "insert.table", size: "large", icon: Table }] },
      { id: "illustrations", label: "Illustrations", controls: [{ ref: "insert.image", size: "large", label: "Picture", icon: Image }] },
      {
        id: "controls",
        label: "Controls",
        controls: [
          { ref: "insert.checkbox", icon: CheckSquare },
          { ref: "insert.dropdown", icon: ListChecks },
        ],
      },
      { id: "links", label: "Links", controls: [{ ref: "insert.link", size: "large", icon: Link }] },
      {
        id: "comments",
        label: "Comments",
        controls: [
          { ref: "insert.comment", size: "large", icon: MessageSquarePlus },
          { ref: "insert.note", icon: StickyNote },
        ],
      },
      {
        id: "cells",
        label: "Cells",
        controls: [
          { ref: "insert.cells", label: "Cells" },
          { ref: "insert.sheet", label: "Sheet", icon: Sheet },
        ],
      },
      { id: "more", label: "More", controls: [{ ref: "menu:insert", label: "Insert" }] },
    ],
  },
  {
    id: "page-layout",
    label: "Page Layout",
    groups: [
      { id: "print", label: "Print", controls: [{ ref: "tb.print", size: "large", label: "Print" }] },
      { id: "sheet-options", label: "Sheet Options", controls: [{ ref: "view.show", size: "large", label: "Gridlines", icon: TableCellsSplit }] },
    ],
  },
  {
    id: "formulas",
    label: "Formulas",
    groups: [
      {
        id: "library",
        label: "Function Library",
        controls: [
          { ref: "insert.function", size: "large", label: "Insert Function", icon: SquareFunction },
          { ref: "tb.functions", label: "AutoSum", icon: Sigma },
          { ref: "tools.functions", label: "Function list" },
        ],
      },
      { id: "more", label: "More", controls: [{ ref: "menu:tools", label: "Tools" }] },
    ],
  },
  {
    id: "data",
    label: "Data",
    groups: [
      {
        id: "sort-filter",
        label: "Sort & Filter",
        controls: [
          { ref: "data.sort-sheet-asc", label: "Sort A to Z", icon: ArrowDownAZ },
          { ref: "data.sort-sheet-desc", label: "Sort Z to A", icon: ArrowDownZA },
          { ref: "data.sort-range", label: "Sort range", icon: ListFilter },
          { ref: "data.filter", size: "large", label: "Filter", icon: Filter },
        ],
      },
      {
        id: "tools",
        label: "Data Tools",
        controls: [
          { ref: "data.split", label: "Text to Columns", icon: Columns3 },
          { ref: "data.cleanup", label: "Data cleanup", icon: Paintbrush },
          { ref: "data.validation", label: "Data Validation", icon: ListChecks },
        ],
      },
      { id: "protect", label: "Protect", controls: [{ ref: "data.protect", size: "large", label: "Protect", icon: Lock }] },
      { id: "more", label: "More", controls: [{ ref: "menu:data", label: "Data" }] },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [
      {
        id: "comments",
        label: "Comments",
        controls: [
          { ref: "insert.comment", size: "large", label: "New Comment", icon: MessageSquarePlus },
          { ref: "view.comments", label: "Show Comments", icon: MessageSquare },
          { ref: "tools.comments", label: "Comments panel" },
        ],
      },
      { id: "protect", label: "Protect", controls: [{ ref: "tools.protect", size: "large", label: "Protect Sheet", icon: Lock }] },
    ],
  },
  {
    id: "view",
    label: "View",
    groups: [
      {
        id: "show",
        label: "Show",
        controls: [{ ref: "view.show", size: "large", label: "Show", icon: TableCellsSplit }],
      },
      {
        id: "window",
        label: "Window",
        controls: [{ ref: "view.freeze", size: "large", label: "Freeze Panes", icon: PanelTopClose }],
      },
      {
        id: "zoom",
        label: "Zoom",
        controls: [
          { ref: "view.zoom", size: "large", icon: ZoomIn },
          { ref: "tb.zoom", size: "icon" },
        ],
      },
      {
        id: "full-screen",
        label: "Full Screen",
        controls: [{ ref: "view.full-screen", size: "large", icon: Maximize2 }],
      },
      { id: "more", label: "More", controls: [{ ref: "menu:view", label: "View" }] },
    ],
  },
  {
    id: "help",
    label: "Help",
    groups: [
      {
        id: "help",
        label: "Help",
        controls: [
          { ref: "help.shortcuts", size: "large", icon: Keyboard },
          { ref: "help.functions", label: "Function list" },
          { ref: "menu:help", label: "More" },
        ],
      },
    ],
  },
];

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
  Accessibility,
  Activity,
  AtSign,
  BarChart3,
  Bell,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  Code2,
  Database,
  EyeOff,
  FileText,
  GraduationCap,
  Group,
  Lightbulb,
  Megaphone,
  MessageSquareWarning,
  MoveVertical,
  Palette,
  PenTool,
  Puzzle,
  Repeat2,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Smile,
  SpellCheck,
  TableProperties,
  Tag,
  AlignJustify,
  Hash,
} from "lucide-react";
import type { GoogleOnlyRows, RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";

/**
 * Menu rows (id or whole submenu id -> reason) the Microsoft look deliberately does not place.
 * Empty on purpose: every row is placed. A new menu row fails the ribbon forcing test until it is
 * either placed in a named group above or listed here WITH a reason.
 */
export const SHEET_GOOGLE_ONLY: GoogleOnlyRows = {};

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
          { ref: "format.alignment", size: "icon", icon: AlignJustify },
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
          { ref: "format.number", size: "icon", label: "Number format", icon: Hash },
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
          { ref: "edit.move", label: "Move", icon: MoveVertical },
          { ref: "view.rows", label: "Hide / unhide rows", icon: Rows3 },
          { ref: "view.columns", label: "Hide / unhide columns", icon: Columns3 },
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
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      {
        id: "tables",
        label: "Tables",
        controls: [
          { ref: "insert.pivot", size: "large", label: "PivotTable", icon: TableProperties },
          { ref: "insert.table", size: "large", icon: Table },
        ],
      },
      {
        id: "illustrations",
        label: "Illustrations",
        controls: [
          { ref: "insert.image", size: "large", label: "Picture", icon: Image },
          { ref: "insert.drawing", label: "Drawing", icon: PenTool },
        ],
      },
      { id: "charts", label: "Charts", controls: [{ ref: "insert.chart", size: "large", label: "Chart", icon: BarChart3 }] },
      {
        id: "filters",
        label: "Filters",
        controls: [
          { ref: "data.slicer", label: "Slicer", icon: SlidersHorizontal },
          { ref: "insert.timeline", label: "Timeline", icon: CalendarRange },
        ],
      },
      { id: "forms", label: "Forms", controls: [{ ref: "tools.form", size: "large", label: "Forms", icon: ClipboardList }] },
      {
        id: "controls",
        label: "Controls",
        controls: [
          { ref: "insert.checkbox", icon: CheckSquare },
          { ref: "insert.dropdown", icon: ListChecks },
          { ref: "insert.smart-chips", label: "Smart chips", icon: AtSign },
        ],
      },
      { id: "links", label: "Links", controls: [{ ref: "insert.link", size: "large", icon: Link }] },
      { id: "symbols", label: "Symbols", controls: [{ ref: "insert.emoji", label: "Emoji", icon: Smile }] },
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
    ],
  },
  {
    id: "page-layout",
    label: "Page Layout",
    groups: [
      { id: "themes", label: "Themes", controls: [{ ref: "format.theme", size: "large", label: "Themes", icon: Palette }] },
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
      {
        id: "names",
        label: "Defined Names",
        controls: [
          { ref: "data.named-ranges", label: "Name Manager", icon: Tag },
          { ref: "data.named-functions", label: "Named functions", icon: SquareFunction },
        ],
      },
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
          { ref: "data.filter-views", label: "Filter views", icon: ListFilter },
        ],
      },
      {
        id: "tools",
        label: "Data Tools",
        controls: [
          { ref: "data.split", label: "Text to Columns", icon: Columns3 },
          { ref: "data.cleanup", label: "Data cleanup", icon: Paintbrush },
          { ref: "data.validation", label: "Data Validation", icon: ListChecks },
          { ref: "data.randomize", label: "Randomize range", icon: Shuffle },
          { ref: "data.column-stats", label: "Column stats", icon: BarChart3 },
          { ref: "data.extraction", label: "Data extraction", icon: Columns3 },
        ],
      },
      { id: "outline", label: "Outline", controls: [{ ref: "view.group", size: "large", label: "Group", icon: Group }] },
      { id: "connections", label: "Queries & Connections", controls: [{ ref: "data.connectors", size: "large", label: "Data connectors", icon: Database }] },
      { id: "protect", label: "Protect", controls: [{ ref: "data.protect", size: "large", label: "Protect", icon: Lock }] },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [
      { id: "proofing", label: "Proofing", controls: [{ ref: "tools.spelling", size: "large", label: "Spelling", icon: SpellCheck }] },
      { id: "accessibility", label: "Accessibility", controls: [{ ref: "tools.accessibility", size: "large", label: "Accessibility", icon: Accessibility }] },
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
      {
        id: "activity",
        label: "Activity",
        controls: [
          { ref: "tools.activity", label: "Activity dashboard", icon: Activity },
          { ref: "tools.notifications", label: "Notification settings", icon: Bell },
          { ref: "tools.suggestions", label: "Suggestion controls", icon: Lightbulb },
          { ref: "tools.autocomplete", label: "Autocomplete", icon: Lightbulb },
        ],
      },
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
        controls: [
          { ref: "view.freeze", size: "large", label: "Freeze Panes", icon: PanelTopClose },
          { ref: "view.hidden-sheets", label: "Unhide sheets", icon: EyeOff },
        ],
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
      { id: "macros", label: "Macros", controls: [{ ref: "extensions.macros", size: "large", label: "Macros", icon: Repeat2 }] },
    ],
  },
  {
    id: "automate",
    label: "Automate",
    groups: [
      { id: "add-ins", label: "Add-ins", controls: [{ ref: "extensions.add-ons", size: "large", label: "Add-ins", icon: Puzzle }] },
      { id: "scripts", label: "Scripts", controls: [{ ref: "extensions.scripts", size: "large", label: "Scripts", icon: Code2 }] },
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
          { ref: "help.search", size: "large", icon: CircleHelp },
          { ref: "help.training", label: "Training", icon: GraduationCap },
          { ref: "help.updates", label: "Updates", icon: Megaphone },
          { ref: "help.feedback", label: "Feedback", icon: MessageSquareWarning },
          { ref: "help.privacy", label: "Privacy Policy", icon: ShieldCheck },
          { ref: "help.terms", label: "Terms of Service", icon: FileText },
          { ref: "help.shortcuts", size: "large", icon: Keyboard },
          { ref: "help.functions", label: "Function list" },
        ],
      },
    ],
  },
];

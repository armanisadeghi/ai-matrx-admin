/**
 * The presentation's Microsoft 365 ribbon (PowerPoint on the web's tabs and groups) over the SAME
 * command map as the Google menu bar and toolbar (`buildDeckMenus` / `buildDeckToolbar`). Ids only —
 * the ribbon runs nothing of its own. Coverage is proven by the ribbon forcing test.
 */

import {
  AlignHorizontalJustifyCenter,
  AlignLeft,
  ArrowUpDown,
  BarChart3,
  Bold,
  Clipboard,
  Copy,
  EyeOff,
  Group,
  Hash,
  Image,
  Keyboard,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Link as LinkIcon,
  List,
  MessageSquarePlus,
  Mic,
  MonitorPlay,
  Music,
  Omega,
  PaintBucket,
  Palette,
  Play,
  Plus,
  RemoveFormatting,
  RotateCw,
  Scissors,
  Search,
  Shapes,
  Slash,
  Sparkle,
  SpellCheck,
  StickyNote,
  Table,
  Trash2,
  Type as TypeIcon,
  Video,
  Wand,
  Workflow,
} from "lucide-react";
import type { GoogleOnlyRows, RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";
import { AUTOMATE_TAB, HELP_HEAD_CONTROLS } from "@/components/editor-chrome/ribbon-parity";

/** Menu rows the Microsoft look deliberately does not place (id -> reason). Empty: every row is placed. */
export const DECK_GOOGLE_ONLY: GoogleOnlyRows = {};

export const DECK_RIBBON: RibbonTabSpec[] = [
  {
    id: "home",
    label: "Home",
    groups: [
      { id: "undo", label: "Undo", controls: [{ ref: "edit.undo", size: "icon" }, { ref: "edit.redo", size: "icon" }], perRow: 1 },
      {
        id: "clipboard",
        label: "Clipboard",
        controls: [
          { ref: "edit.paste", size: "large", label: "Paste", icon: Clipboard },
          { ref: "edit.cut", label: "Cut", icon: Scissors },
          { ref: "edit.copy", label: "Copy", icon: Copy },
          { ref: "edit.paste-plain", label: "Paste as text" },
        ],
      },
      {
        id: "slides",
        label: "Slides",
        controls: [
          { ref: "tb.new", size: "large", label: "New Slide", icon: Plus },
          { ref: "tb.new-layout", label: "With layout" },
          { ref: "tb.layout", label: "Layout", icon: LayoutTemplate },
          { ref: "edit.duplicate", label: "Duplicate", icon: Copy },
          { ref: "edit.delete", label: "Delete", icon: Trash2 },
        ],
      },
      {
        id: "arrange",
        label: "Arrange",
        controls: [
          { ref: "slide.move", size: "large", label: "Move", icon: ArrowUpDown },
          { ref: "arrange.order", label: "Order", icon: Layers },
          { ref: "arrange.align", label: "Align", icon: AlignHorizontalJustifyCenter },
          { ref: "arrange.distribute", label: "Distribute" },
          { ref: "arrange.center", label: "Center on page" },
          { ref: "arrange.rotate", label: "Rotate", icon: RotateCw },
          { ref: "arrange.group", label: "Group", icon: Group },
          { ref: "arrange.ungroup", label: "Ungroup" },
        ],
      },
      {
        id: "font",
        label: "Font",
        controls: [
          { ref: "format.text", label: "Text", icon: Bold },
          { ref: "format.align", label: "Align and indent", icon: AlignLeft },
          { ref: "format.spacing", label: "Spacing" },
          { ref: "format.lists", label: "Bullets", icon: List },
          { ref: "format.options", label: "Format options" },
          { ref: "format.clear", label: "Clear formatting", icon: RemoveFormatting },
        ],
      },
      {
        id: "editing",
        label: "Editing",
        controls: [
          { ref: "edit.find-replace", label: "Replace", icon: Search },
          { ref: "edit.select-all", label: "Select all" },
        ],
      },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      {
        id: "slides",
        label: "Slides",
        controls: [
          { ref: "insert.slide", size: "large", label: "New Slide", icon: Plus },
          { ref: "slide.new", label: "Blank slide" },
          { ref: "slide.duplicate", label: "Duplicate slide" },
          { ref: "slide.delete", label: "Delete slide" },
        ],
      },
      {
        id: "images",
        label: "Images",
        controls: [
          { ref: "insert.image", size: "large", label: "Pictures", icon: Image },
          { ref: "tb.image", label: "Image" },
        ],
      },
      { id: "tables", label: "Tables", controls: [{ ref: "insert.table", size: "large", label: "Table", icon: Table }] },
      {
        id: "illustrations",
        label: "Illustrations",
        controls: [
          { ref: "insert.shape", label: "Shapes", icon: Shapes },
          { ref: "insert.line", label: "Line", icon: Slash },
          { ref: "insert.diagram", label: "SmartArt", icon: Workflow },
          { ref: "insert.chart", label: "Chart", icon: BarChart3 },
        ],
      },
      {
        id: "text",
        label: "Text",
        controls: [
          { ref: "insert.text-box", size: "large", label: "Text Box", icon: TypeIcon },
          { ref: "insert.word-art", label: "WordArt" },
          { ref: "insert.slide-numbers", label: "Slide Number", icon: Hash },
          { ref: "insert.special-characters", label: "Symbol", icon: Omega },
        ],
      },
      {
        id: "links",
        label: "Links",
        controls: [
          { ref: "insert.link", label: "Link", icon: LinkIcon },
          { ref: "insert.comment", label: "Comment", icon: MessageSquarePlus },
        ],
      },
      {
        id: "media",
        label: "Media",
        controls: [
          { ref: "insert.video", label: "Video", icon: Video },
          { ref: "insert.audio", label: "Audio", icon: Music },
        ],
      },
    ],
  },
  {
    id: "design",
    label: "Design",
    groups: [
      {
        id: "themes",
        label: "Themes",
        controls: [
          { ref: "slide.theme", size: "large", label: "Themes", icon: Palette },
          { ref: "tb.theme", size: "icon" },
        ],
      },
      { id: "layout", label: "Layout", controls: [{ ref: "slide.layout", size: "large", label: "Layout", icon: LayoutTemplate }] },
      {
        id: "customize",
        label: "Customize",
        controls: [
          { ref: "slide.background", size: "large", label: "Format Background", icon: PaintBucket },
          { ref: "slide.edit-theme", label: "Edit theme" },
          { ref: "view.theme-builder", label: "Slide Master" },
        ],
      },
    ],
  },
  {
    id: "transitions",
    label: "Transitions",
    groups: [{ id: "transitions", label: "Transitions", controls: [{ ref: "slide.transition", size: "large", label: "Transition", icon: Sparkle }] }],
  },
  {
    id: "animations",
    label: "Animations",
    groups: [
      {
        id: "animations",
        label: "Animation",
        controls: [
          { ref: "insert.animation", size: "large", label: "Animation", icon: Wand },
          { ref: "view.motion", label: "Motion pane" },
        ],
      },
    ],
  },
  {
    id: "slide-show",
    label: "Slide Show",
    groups: [
      {
        id: "start",
        label: "Start Slide Show",
        controls: [
          { ref: "view.present-start", size: "large", label: "From Beginning", icon: Play },
          { ref: "view.present", size: "large", label: "From Current Slide", icon: MonitorPlay },
        ],
      },
      { id: "set-up", label: "Set Up", controls: [{ ref: "slide.skip", size: "large", label: "Hide Slide", icon: EyeOff }] },
      { id: "qa", label: "Q&A", controls: [{ ref: "tools.qa", label: "Q&A history" }] },
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
          { ref: "tools.spelling", size: "large", label: "Spelling", icon: SpellCheck },
          { ref: "tools.dictionary", label: "Dictionary" },
          { ref: "tools.linked-objects", label: "Linked objects" },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        controls: [
          { ref: "tools.voice-typing", label: "Dictate notes", icon: Mic },
          { ref: "tools.accessibility", label: "Accessibility" },
          { ref: "tools.notifications", label: "Notifications" },
          { ref: "tools.preferences", label: "Preferences" },
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
        controls: [
          { ref: "view.notes", size: "large", label: "Notes", icon: StickyNote },
          { ref: "tb.notes", label: "Speaker notes" },
        ],
      },
      { id: "views", label: "Presentation Views", controls: [{ ref: "view.grid", size: "large", label: "Slide Sorter", icon: LayoutGrid }] },
    ],
  },
  AUTOMATE_TAB,
  {
    id: "help",
    label: "Help",
    groups: [{ id: "help", label: "Help", controls: [...HELP_HEAD_CONTROLS, { ref: "help.shortcuts", size: "large", icon: Keyboard }] }],
  },
];

/**
 * The presentation's Microsoft 365 ribbon (PowerPoint on the web's tabs and groups) over the SAME
 * command map as the Google menu bar and toolbar (`buildDeckMenus` / `buildDeckToolbar`). Ids only —
 * the ribbon runs nothing of its own. Coverage is proven by the ribbon forcing test.
 */

import { ArrowUpDown, Copy, Image, Keyboard, LayoutTemplate, MonitorPlay, Palette, Play, Plus, StickyNote, Trash2 } from "lucide-react";
import type { GoogleOnlyRows, RibbonTabSpec } from "@/components/editor-chrome/ribbon-model";

/** Menu rows the Microsoft look deliberately does not place (id -> reason). Empty: every row is placed. */
export const DECK_GOOGLE_ONLY: GoogleOnlyRows = {};

export const DECK_RIBBON: RibbonTabSpec[] = [
  {
    id: "home",
    label: "Home",
    groups: [
      { id: "undo", label: "Undo", controls: [{ ref: "edit.undo", size: "icon" }, { ref: "edit.redo", size: "icon" }], perRow: 1 },
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
        controls: [{ ref: "slide.move", size: "large", label: "Move", icon: ArrowUpDown }],
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
    ],
  },
  {
    id: "help",
    label: "Help",
    groups: [{ id: "help", label: "Help", controls: [{ ref: "help.shortcuts", size: "large", icon: Keyboard }] }],
  },
];

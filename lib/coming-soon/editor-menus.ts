// lib/coming-soon/editor-menus.ts
//
// Promises the three editors' menus make (workbook, document, presentation): every row Google's
// Sheets / Docs / Slides menus carry that we cannot run yet. Each is a menu row today (the editor
// chrome's `soon(...)` row, which announces this entry) and must be deleted here in the change that
// builds it. Spread into `COMING_SOON` (registry.ts) — one registry, kept in its own file so the
// editor lanes do not collide with every other feature's edits.

import type { ComingSoonEntry } from "./types";

type Row = [id: string, label: string, owner: string, promise: string, surface: string];

const ROWS: Row[] = [
  // ── File (all three editors) ──
  ["editor.file.publish-to-web", "Publish to web", "file-actions", "Publish a live, read-only copy of this file at a public link that updates as you edit.", "Editor File → Share"],
  ["editor.file.approvals", "Approvals", "file-actions", "Ask named people to approve this version, and lock it once they do.", "Editor File → Approvals"],
  ["editor.file.name-version", "Name current version", "file-actions", "Give the current version a name so it is easy to find and restore in version history.", "Editor File → Version history"],
  ["editor.file.offline", "Make available offline", "file-actions", "Keep this file on this device so you can open and edit it without a connection.", "Editor File → Make available offline"],
  ["editor.file.security-limitations", "Security limitations", "file-actions", "See which features this file's sharing and security settings switch off, and why.", "Editor File → Security limitations"],
  ["editor.file.language", "Language", "file-actions", "Set the file's language for spelling, hyphenation and voice typing.", "Editor File → Language"],
  ["workbooks.settings", "Spreadsheet settings", "workbooks", "Set the spreadsheet's locale, time zone and recalculation rules.", "Workbook File → Settings"],
  ["workbooks.download-ods", "Download as OpenDocument (.ods)", "workbooks", "Download the workbook as an OpenDocument spreadsheet.", "Workbook File → Download"],
  ["documents.download-odt", "Download as OpenDocument (.odt)", "documents", "Download the document as an OpenDocument text file.", "Document File → Download"],
  ["documents.download-rtf", "Download as rich text (.rtf)", "documents", "Download the document as rich text.", "Document File → Download"],
  ["documents.download-epub", "Download as EPUB", "documents", "Download the document as an EPUB e-book.", "Document File → Download"],
  ["presentations.download-odp", "Download as OpenDocument (.odp)", "presentations", "Download the deck as an OpenDocument presentation.", "Presentation File → Download"],
  ["presentations.download-image", "Download a slide as an image", "presentations", "Download the current slide as a JPEG, PNG or SVG image.", "Presentation File → Download"],
  ["presentations.import-slides", "Import slides", "presentations", "Bring slides in from another presentation or a PowerPoint file.", "Presentation File → Import slides"],
  // ── Edit / View / Insert / Format (shared) ──
  ["editor.edit.paste-plain", "Paste without formatting", "file-actions", "Paste the clipboard as plain text, taking on the surrounding style.", "Presentation Edit → Paste without formatting"],
  ["editor.insert.drawing", "Drawing", "file-actions", "Draw shapes, lines and text boxes and place the drawing in the file.", "Editor Insert → Drawing"],
  ["editor.insert.chart", "Chart", "file-actions", "Insert a chart that stays linked to its data and updates with it.", "Editor Insert → Chart"],
  ["editor.insert.emoji", "Emoji", "file-actions", "Pick an emoji from a searchable panel and insert it at the cursor.", "Editor Insert → Emoji"],
  ["editor.insert.smart-chips", "Smart chips", "file-actions", "Insert live chips for people, files, dates and places.", "Editor Insert → Smart chips"],
  ["editor.insert.special-characters", "Special characters", "file-actions", "Search and insert symbols, arrows and characters from any script.", "Editor Insert → Special characters"],
  // ── Tools (shared) ──
  ["editor.tools.spelling", "Spelling and grammar", "file-actions", "Check spelling and grammar as you type and step through every suggestion.", "Editor Tools → Spelling"],
  ["editor.tools.notifications", "Notification settings", "file-actions", "Choose when you are told about comments and changes in this file.", "Editor Tools → Notification settings"],
  ["editor.tools.accessibility", "Accessibility", "file-actions", "Turn on screen-reader, braille and magnifier support for the editor.", "Editor Tools → Accessibility"],
  ["editor.tools.activity-dashboard", "Activity dashboard", "file-actions", "See who viewed this file, when, and how its sharing changed.", "Editor Tools → Activity dashboard"],
  ["editor.tools.preferences", "Preferences", "file-actions", "Set substitutions, smart quotes and automatic detection for this editor.", "Editor Tools → Preferences"],
  ["editor.tools.dictionary", "Dictionary", "file-actions", "Look up the selected word without leaving the file.", "Editor Tools → Dictionary"],
  ["editor.tools.linked-objects", "Linked objects", "file-actions", "See and refresh every chart and table linked from another file.", "Editor Tools → Linked objects"],
  ["editor.tools.voice-typing", "Voice typing", "file-actions", "Dictate into the file (or the speaker notes) with your microphone.", "Editor Tools → Voice typing"],
  // ── Extensions + Help (shared) ──
  ["editor.extensions.add-ons", "Add-ons", "file-actions", "Install add-ons that bring new tools into the editor.", "Editor Extensions → Add-ons"],
  ["editor.extensions.macros", "Macros", "workbooks", "Record a series of edits and replay it with one shortcut.", "Workbook Extensions → Macros"],
  ["editor.extensions.scripts", "Scripts", "file-actions", "Write scripts that automate this file and connect it to other services.", "Editor Extensions → Scripts"],
  ["editor.help.search", "Help", "file-actions", "Search help articles for this editor without leaving the file.", "Editor Help → Help"],
  ["editor.help.training", "Training", "file-actions", "Short lessons that teach this editor, from basics to advanced.", "Editor Help → Training"],
  ["editor.help.updates", "Updates", "file-actions", "See what changed in this editor recently.", "Editor Help → Updates"],
  // ── Workbook only ──
  ["workbooks.show-formulas", "Show formulas", "workbooks", "Show every cell's formula in place of its value.", "Workbook View → Show"],
  ["workbooks.show-protected-ranges", "Show protected ranges", "workbooks", "Shade every protected range so you can see what is locked.", "Workbook View → Show"],
  ["workbooks.group", "Group rows and columns", "workbooks", "Group rows or columns so they collapse and expand together.", "Workbook View → Group"],
  ["workbooks.timeline", "Timeline", "workbooks", "Turn rows with dates into a timeline view.", "Workbook Insert → Timeline"],
  ["workbooks.pivot-table", "Pivot table", "workbooks", "Summarise a range with a pivot table on a new sheet.", "Workbook Insert → Pivot table"],
  ["workbooks.filter-views", "Filter views", "workbooks", "Save named filters that only change your view, not anyone else's.", "Workbook Data → Filter views"],
  ["workbooks.slicer", "Slicer", "workbooks", "Add a slicer that filters charts and tables from one control.", "Workbook Data → Add a slicer"],
  ["workbooks.named-functions", "Named functions", "workbooks", "Save a formula as your own reusable function.", "Workbook Data → Named functions"],
  ["workbooks.data-extraction", "Data extraction", "workbooks", "Pull fields out of smart chips into their own columns.", "Workbook Data → Data extraction"],
  ["workbooks.data-connectors", "Data connectors", "workbooks", "Connect the workbook to a database and keep the data refreshed.", "Workbook Data → Data connectors"],
  ["workbooks.create-form", "Create a form", "workbooks", "Create a form whose answers land in a new sheet of this workbook.", "Workbook Tools → Create a new form"],
  ["workbooks.autocomplete", "Autocomplete", "workbooks", "Turn cell autocomplete on or off while you type.", "Workbook Tools → Autocomplete"],
  ["workbooks.suggestion-controls", "Suggestion controls", "workbooks", "Choose which automatic suggestions (autocomplete, formulas) appear.", "Workbook Tools → Suggestion controls"],
  // ── Document only ──
  ["documents.mode", "Editing mode", "documents", "Switch between editing, suggesting and viewing.", "Document View → Mode"],
  ["documents.show-print-layout", "Show print layout", "documents", "Switch between page-by-page print layout and one continuous page.", "Document View → Show"],
  ["documents.show-ruler", "Show ruler", "documents", "Show a ruler above the page for margins and indents.", "Document View → Show"],
  ["documents.show-outline", "Show outline", "documents", "Show the document's headings as an outline beside the page.", "Document View → Show"],
  ["documents.show-nonprinting", "Show non-printing characters", "documents", "Show spaces, tabs and paragraph marks while you write.", "Document View → Show"],
  ["documents.building-blocks", "Building blocks", "documents", "Insert ready-made blocks: meeting notes, project trackers, email drafts.", "Document Insert → Building blocks"],
  ["documents.footnote", "Footnote", "documents", "Add a numbered footnote at the cursor.", "Document Insert → Footnote"],
  ["documents.page-numbers", "Page numbers", "documents", "Number the pages in the header or footer.", "Document Insert/Format → Page numbers"],
  ["documents.headers-footers", "Headers and footers", "documents", "Add a header and footer that repeat on every page.", "Document Insert/Format → Headers and footers"],
  ["documents.bookmark", "Bookmark", "documents", "Bookmark a spot so links can jump straight to it.", "Document Insert → Bookmark"],
  ["documents.table-of-contents", "Table of contents", "documents", "Insert a table of contents built from the headings, kept up to date.", "Document Insert → Table of contents"],
  ["documents.tabs", "Document tabs", "documents", "Split a long document into tabs, each with its own outline.", "Document Insert → Tabs"],
  ["documents.line-spacing", "Line and paragraph spacing", "documents", "Set line spacing and the space before and after paragraphs.", "Document Format → Line and paragraph spacing"],
  ["documents.columns", "Columns", "documents", "Lay the text out in two or more columns.", "Document Format → Columns"],
  ["documents.pageless", "Pageless format", "documents", "Switch between pages and one continuous pageless canvas.", "Document Format → Switch to Pageless format"],
  ["documents.table-properties", "Table properties", "documents", "Set column widths, cell padding, borders and alignment for a table.", "Document Format → Table"],
  ["documents.image-options", "Image options", "documents", "Crop, recolour, wrap text around and resize an image precisely.", "Document Format → Image"],
  ["documents.borders-lines", "Borders and lines", "documents", "Add borders around paragraphs and decorative lines.", "Document Format → Borders and lines"],
  ["documents.review-suggestions", "Review suggested edits", "documents", "Step through every suggested edit and accept or reject each one.", "Document Tools → Review suggested edits"],
  ["documents.compare", "Compare documents", "documents", "Compare this document with another and see every difference marked.", "Document Tools → Compare documents"],
  ["documents.citations", "Citations", "documents", "Add sources and insert citations and a bibliography in your chosen style.", "Document Tools → Citations"],
  ["documents.translate", "Translate document", "documents", "Make a translated copy of this document in another language.", "Document Tools → Translate document"],
  // ── Presentation only ──
  ["presentations.find-replace", "Find and replace", "presentations", "Find text across every slide and replace it.", "Presentation Edit → Find and replace"],
  ["presentations.motion", "Motion", "presentations", "Add transitions between slides and animations to objects.", "Presentation View → Motion / Slide → Transition"],
  ["presentations.master", "Theme builder", "presentations", "Edit the master slide and layouts that every slide inherits.", "Presentation View → Theme builder / Slide → Edit theme"],
  ["presentations.grid-view", "Grid view", "presentations", "See every slide as a grid of thumbnails and reorder them.", "Presentation View → Grid view"],
  ["presentations.insert-objects", "Text box, shape and line", "presentations", "Place text boxes, shapes, lines and word art freely on a slide.", "Presentation Insert"],
  ["presentations.insert-media", "Audio and video", "presentations", "Embed audio and video that play during the presentation.", "Presentation Insert → Audio / Video"],
  ["presentations.insert-table", "Table", "presentations", "Insert a table on the slide.", "Presentation Insert → Table"],
  ["presentations.insert-diagram", "Diagram", "presentations", "Insert a ready-made diagram: timeline, process, hierarchy.", "Presentation Insert → Diagram"],
  ["presentations.insert-link", "Link", "presentations", "Link text or an object to a web page or another slide.", "Presentation Insert → Link"],
  ["presentations.comment", "Comment", "presentations", "Comment on a slide and discuss it with collaborators.", "Presentation Insert → Comment"],
  ["presentations.slide-numbers", "Slide numbers", "presentations", "Show the slide number on every slide.", "Presentation Insert → Slide numbers"],
  ["presentations.skip-slide", "Skip slide", "presentations", "Keep a slide in the deck but leave it out of the presentation.", "Presentation Slide → Skip slide"],
  ["presentations.background", "Change background", "presentations", "Set a colour or image behind one slide or the whole deck.", "Presentation Slide → Change background"],
  ["presentations.format-text", "Text formatting", "presentations", "Bold, italic, size, colour and alignment for text on a slide.", "Presentation Format"],
  ["presentations.format-options", "Format options", "presentations", "Size, rotation, drop shadow and reflection for a selected object.", "Presentation Format → Format options"],
  ["presentations.arrange", "Arrange objects", "presentations", "Order, align, distribute, rotate and group objects on a slide.", "Presentation Arrange"],
  ["presentations.qa-history", "Q&A history", "presentations", "Take audience questions during a presentation and keep the history.", "Presentation Tools → Q&A history"],
];

export const EDITOR_MENU_COMING_SOON: Record<string, ComingSoonEntry> = Object.fromEntries(
  ROWS.map(([id, label, owner, promise, surface]) => [id, { id, label, owner, promise, stage: "planned" as const, surfaces: [surface] }]),
);

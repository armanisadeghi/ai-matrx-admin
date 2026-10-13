"use client";

/**
 * THE ONE IMPLEMENTATION MODULE behind the app's tool-renderer registrations (code-splitting
 * rule 3, THE FRAGMENTATION LAW: one async edge per registry).
 *
 * `registerFeatureToolRenderers.tsx` and `records-tool-display/registerDataToolRenderers.tsx`
 * register STATIC descriptors (labels, subtitles, header extras) synchronously when the shell
 * loads; every component field is a `lazyToolRenderer(name)` pointing here. Nothing imports this
 * module statically: the first tool result that draws loads every app renderer in one chunk
 * (dataset tables, the task editor, the records answer table…), off every page's first paint.
 */

export { SeoInline } from "./renderers/seo/SeoInline";
export { SeoOverlay } from "./renderers/seo/SeoOverlay";
export { PickListInline } from "./renderers/pick-list/PickListInline";
export { PickListOverlay } from "./renderers/pick-list/PickListOverlay";
export { TaskInline } from "./renderers/task/TaskInline";
export { TaskOverlay } from "./renderers/task/TaskOverlay";
export { TaskListInline } from "./renderers/task/TaskListInline";
export { DocumentInline } from "./renderers/document/DocumentInline";
export { DocumentOverlay } from "./renderers/document/DocumentOverlay";
export { DatasetInline } from "./renderers/dataset/DatasetInline";
export { DatasetOverlay } from "./renderers/dataset/DatasetOverlay";
export { KnowledgeSearchInline } from "./renderers/knowledge-search/KnowledgeSearchInline";
export { KnowledgeSearchOverlay } from "./renderers/knowledge-search/KnowledgeSearchOverlay";
export { DocumentSearchInline } from "./renderers/document-search/DocumentSearchInline";
export { KnowledgeBrowseInline } from "./renderers/knowledge-browse/KnowledgeBrowseInline";
export { DocumentContentInline } from "./renderers/document-content/DocumentContentInline";
export { NoteToolInline } from "./renderers/note/NoteToolInline";
export { NoteToolOverlay } from "./renderers/note/NoteToolOverlay";
export { TopicalMapInline } from "./renderers/topical-map/TopicalMapInline";
export { SiteDataInline } from "./renderers/site-data/SiteDataInline";
// The data tools' answer bodies (records / table): rows as the table, a write as a line.
export { RecordsAnswerBody, RefusalLine } from "@/features/records-tool-display/RecordsAnswerView";

/**
 * THE CATALOG — every item type a board supports, in Add-menu order.
 *
 * Imported ONLY inside the board's one lazy edge (the Board page's `*Impl`),
 * so every tile body here compiles as one piece behind one boundary (the
 * code-splitting FRAGMENTATION LAW) — never `dynamic()` a body.
 *
 * Adding a feature to every board = one entry in the matching file:
 *   work-items.tsx     chat · note · file
 *   document-items.tsx document (the /documents rich-text editor)
 *   crm-items.tsx      person or company (a CRM record, /crm/[partyId])
 *   transcript-items.tsx transcript (the processor viewer, /transcripts/processor)
 *   agent-items.tsx    agent (one agent's record page, /agents/[id])
 *   office-items.tsx   workbook (Univer spreadsheet) · presentation (slides)
 *   feature-items.tsx  task · War Room · meeting · workflow run · research…
 *   scope-items.tsx    scope (one scope: its page body and its own surface)
 *   education-items.tsx flashcard deck · study kit (/education)
 *   meeting-items.tsx  meeting notes (one part of a meeting: transcript, decisions…)
 *   data-items.tsx     data table · data record (the record store, /data)
 *   list-items.tsx     pick list (/pick-lists — a Table of choices in the record store)
 *   content-items.tsx  web page · image · write-up · label
 *   cover-items.tsx    cover (a board's opening: rendered hero HTML above rendered prose)
 *   video-clone-items.tsx video clone (the Socials clone studio)
 *   social-items.tsx   social post · social profile · outlier feed · ad · swipe collection
 *   page-items.tsx     any page of the app, framed (until its feature is a native item)
 */

import type { NodeSource } from "../board/document";
import type { BoardItemType } from "./types";
import { WORK_ITEMS } from "./work-items";
import { FEATURE_ITEMS } from "./feature-items";
import { CONTENT_ITEMS } from "./content-items";
import { COVER_ITEMS } from "./cover-items";
import { DATA_ITEMS } from "./data-items";
import { LIST_ITEMS } from "./list-items";
import { EDUCATION_ITEMS } from "./education-items";
import { SCOPE_ITEMS } from "./scope-items";
import { DOCUMENT_ITEMS } from "./document-items";
import { MEETING_ITEMS } from "./meeting-items";
import { OFFICE_ITEMS } from "./office-items";
import { CRM_ITEMS } from "./crm-items";
import { AGENT_ITEMS } from "./agent-items";
import { TRANSCRIPT_ITEMS } from "./transcript-items";
import { PAGE_ITEMS } from "./page-items";
import { SOCIAL_ITEMS } from "./social-items";
import { VIDEO_CLONE_ITEMS } from "./video-clone-items";

export const BOARD_ITEM_TYPES: readonly BoardItemType[] = [...WORK_ITEMS, ...DOCUMENT_ITEMS, ...OFFICE_ITEMS, ...CRM_ITEMS, ...AGENT_ITEMS, ...TRANSCRIPT_ITEMS, ...DATA_ITEMS, ...LIST_ITEMS, ...FEATURE_ITEMS, ...EDUCATION_ITEMS, ...SCOPE_ITEMS, ...MEETING_ITEMS, ...COVER_ITEMS, ...CONTENT_ITEMS, ...SOCIAL_ITEMS, ...VIDEO_CLONE_ITEMS, ...PAGE_ITEMS];

export function itemTypeFor(source: NodeSource): BoardItemType | null {
  return BOARD_ITEM_TYPES.find((t) => t.matches(source)) ?? null;
}

export function itemTypeByKey(key: string): BoardItemType | null {
  return BOARD_ITEM_TYPES.find((t) => t.key === key) ?? null;
}

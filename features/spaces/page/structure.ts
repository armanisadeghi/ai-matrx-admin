"use client";

// features/spaces/page/structure.ts — whether the person may change the page's STRUCTURE here (Notion).
//
// Edit, Comment and View never change structure: a database's views, properties, layout, automations,
// filters saved for everyone and its own sharing, a page's Move to / Trash / Lock. Full access (admin) does
// (ONE-LADDER 2026-10-10). A display filter only — the database enforces the
// level; this keeps the page from offering what would be refused. Outside a page (a published page, a
// preview) the default is true and each surface's own `editable` still decides.

import { createContext, createElement, useContext, type ReactNode } from "react";

const StructureContext = createContext(true);

export function StructureProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return createElement(StructureContext.Provider, { value }, children);
}

/** False when this person holds edit, comment or view on the page (a structure control is not offered). */
export function useStructureEdit(): boolean {
  return useContext(StructureContext);
}

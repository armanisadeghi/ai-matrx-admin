"use client";

// features/scopes/hooks/useNeutralLinksAdapter.ts
//
// The package's default AssociationList adapter, minus the edge LABEL.
//
// Why: a filed (outgoing) entity's picker stores the picked TARGET's title as
// the edge label, and the container side shows the edge label as the SOURCE's
// title — so a research topic linked to the brand "AI Matrx" listed on that
// brand as "AI Matrx" (2026-10-17). One edge is read from both ends, so a
// label can never name "the other side" for both. This adapter writes no
// label and shows none; every row's title comes from the record itself (the
// shared title resolver). Package fix pending in @ai-matrx/associations
// (`useContainerLinks.attach` label for outgoing containers).

import {
  useContainerLinksAdapter,
  type ContainerResourcesAdapter,
  type PrimaryEntity,
} from "@ai-matrx/associations/react";
import type { EntityTypeToken } from "@ai-matrx/associations";

export function useNeutralLinksAdapter(
  container: PrimaryEntity,
  tokens: readonly EntityTypeToken[],
): ContainerResourcesAdapter {
  const base = useContainerLinksAdapter(container, tokens);
  return {
    ...base,
    rows: base.rows.map((row) => ({ ...row, label: null })),
    attach: (token, id) => base.attach(token, id),
  };
}

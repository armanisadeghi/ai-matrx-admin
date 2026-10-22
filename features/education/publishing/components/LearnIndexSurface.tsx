"use client";

// The agent surface + right-click menu for the PUBLIC study-guide index
// (/education/learn). The page and its grid stay server-rendered (ISR, SEO);
// this wraps them so the top Agents menu and the page's agents see the guides
// the visitor is looking at. Rows arrive already loaded — nothing is fetched.

import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import {
  EDUCATION_LEARN_SURFACE_NAME,
  type LearnGuideLibraryRow,
} from "@/features/surfaces/manifests/education-learn.manifest";
import { buildLearnIndexScope } from "../learnIndexSurfaceScope";

export function LearnIndexSurface({
  guides,
  children,
}: {
  guides: LearnGuideLibraryRow[];
  children: ReactNode;
}) {
  const getScope = () => buildLearnIndexScope(guides);
  return (
    <SurfaceRuntimeProvider surfaceName={EDUCATION_LEARN_SURFACE_NAME} getScope={getScope}>
      <NonEditableContextMenu
        sourceFeature="education-flashcards"
        surfaceName={EDUCATION_LEARN_SURFACE_NAME}
        menuVersion={1}
        getApplicationScope={getScope}
        contentSource={{ type: "raw" }}
      >
        {children}
      </NonEditableContextMenu>
    </SurfaceRuntimeProvider>
  );
}

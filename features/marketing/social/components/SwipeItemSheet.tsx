"use client";

/**
 * SwipeItemSheet — lazy door to the swipe item sheet (the real code is in SwipeItemSheetImpl.tsx).
 *
 * WHY: the sheet statically imports `WindowPanel`; a static import here put WindowPanel in the
 * Swipe file route's boot graph ("[WINDOW-PANELS BUNDLE LEAK]", features/window-panels/FEATURE.md
 * "Bundle invariant"). The implementation loads on the first opened item and stays mounted.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { SwipeItemSheetProps } from "./SwipeItemSheetImpl";

export type { SwipeItemSheetProps };

const Impl = dynamic(() => import("./SwipeItemSheetImpl").then((m) => m.SwipeItemSheet), { ssr: false });

export function SwipeItemSheet(props: SwipeItemSheetProps) {
  const [requested, setRequested] = useState(false);
  if (props.item && !requested) setRequested(true);
  return requested ? <Impl {...props} /> : null;
}

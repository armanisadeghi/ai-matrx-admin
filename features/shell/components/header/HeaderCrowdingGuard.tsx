"use client";

import { useEffect, useRef } from "react";

import { PrepaintScript } from "@/components/ssr/PrepaintScript";

import { HEADER_CROWDING_PREPAINT, installHeaderCrowdingGuard } from "./header-crowding";

/**
 * Mounts the header crowding guard on the shell header that contains it.
 * Renders an empty, unfocusable marker and, in the server's HTML, the script
 * that installs the guard before the first paint — so it must be the header's
 * LAST child (the script needs the center and the right set already parsed).
 * Why the guard exists: `header-crowding.ts`.
 */
export function HeaderCrowdingGuard() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = marker.current?.closest<HTMLElement>(".shell-header");
    if (!header) return;
    return installHeaderCrowdingGuard(header);
  }, []);

  return (
    <>
      <span ref={marker} hidden aria-hidden="true" />
      <PrepaintScript html={HEADER_CROWDING_PREPAINT} />
    </>
  );
}

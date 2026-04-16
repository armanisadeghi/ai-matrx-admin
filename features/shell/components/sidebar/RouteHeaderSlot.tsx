"use client";

// RouteHeaderSlot — Client island that lives inside .shell-sidebar-brand.
//
// When a Large Route has a headerImportFn, this replaces the default brand
// content with the route's header (back button, agent selector, new-run, etc.).
// When no match → renders null, default brand content shows through.
//
// The header component stays in place across collapse/expand because it's
// in the brand section, not the nav section.

import { useEffect, useRef, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { useSidebarExpanded } from "../../hooks/useSidebarExpanded";
import {
  routeMenuRegistry,
  type RouteMenuEntry,
} from "../../constants/route-menu-registry";

function findMatch(pathname: string): RouteMenuEntry | null {
  for (const entry of routeMenuRegistry) {
    if (entry.pathPattern.test(pathname) && entry.headerImportFn) return entry;
  }
  return null;
}

export default function RouteHeaderSlot() {
  const pathname = usePathname();
  const expanded = useSidebarExpanded();
  const [Header, setHeader] = useState<ComponentType<{
    expanded: boolean;
  }> | null>(null);
  const matchRef = useRef<string | null>(null);

  const match = findMatch(pathname);
  const matchKey = match?.pathPattern.source ?? null;

  useEffect(() => {
    if (!match || !match.headerImportFn) {
      if (matchRef.current) {
        matchRef.current = null;
        setHeader(null);
      }
      return;
    }

    if (matchRef.current === match.pathPattern.source) return;
    matchRef.current = match.pathPattern.source;
    setHeader(null);

    match.headerImportFn().then((mod) => {
      setHeader(() => mod.default);
    });
  }, [matchKey]);

  if (!Header) return null;

  return <Header expanded={expanded} />;
}

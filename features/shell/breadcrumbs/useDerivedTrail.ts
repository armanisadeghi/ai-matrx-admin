"use client";

// features/shell/breadcrumbs/useDerivedTrail.ts — the hook behind every derived breadcrumb.
//
// Reads the address, the menu and the page's declared record, and answers the trail. A record page
// declares its record once (token + id, or a name) — `useDeclareCurrentRecord` / `RecordPageHeader` /
// `<DeclareAgentRecord>` already do — and the crumb resolves, in this order:
//   key or slug in the address → the declared name → the entity's name column
//   (`public.entity_titles` → `platform.entity_types.title_column`) → the id via <RecordId>.

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useEntityTitles } from "@ai-matrx/associations/react";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { adminNavItems, primaryNavItems } from "@/features/shell/constants/nav-data";
import { useCurrentRecord } from "@/features/shell/current-record/currentRecord";
import type { Crumb } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { deriveTrail, type TrailRecord } from "./derive-trail";
import { routeSiblings } from "./route-siblings";
import { recordSiblingsLoader } from "./record-siblings";

const NAV = [...primaryNavItems, ...adminNavItems];

export interface UseDerivedTrailOptions {
  /** Address to derive from. Default: the current pathname. */
  pathname?: string;
  /**
   * Records this page knows beyond the one it declared — keyed by the address of the level
   * (`/organizations/<org>/scopes/<type>`). A layout over several levels (Scopes) supplies each
   * level's name and sibling list; it never supplies the trail itself.
   */
  records?: Readonly<Record<string, TrailRecord | undefined>>;
  /** Name for the page's own record when no one declared it (the one-off known name). */
  recordName?: string | null;
}

export function useDerivedTrail(options: UseDerivedTrailOptions = {}): Crumb[] {
  const livePathname = usePathname() ?? "/";
  const pathname = options.pathname ?? livePathname;
  const current = useCurrentRecord();

  // The declared record sits at the level whose segment equals its id.
  const declaredHref = useMemo(() => {
    if (!current?.id) return null;
    const segs = pathname.split("/").filter(Boolean);
    const at = segs.indexOf(current.id);
    return at === -1 ? null : `/${segs.slice(0, at + 1).join("/")}`;
  }, [current?.id, pathname]);

  // Name column, only when a uuid level has a token but no name yet.
  const needsTitle =
    current?.token && current.id && !current.label && isUuidShape(current.id)
      ? [{ token: current.token, id: current.id }]
      : [];
  const { titleFor, isUnresolved } = useEntityTitles(needsTitle);
  const resolvedTitle =
    needsTitle[0] && !isUnresolved(needsTitle[0]) ? titleFor(needsTitle[0]) : null;

  const records = useMemo(() => {
    const merged: Record<string, TrailRecord | undefined> = { ...options.records };
    if (declaredHref && current) {
      merged[declaredHref] = {
        ...merged[declaredHref],
        token: current.token,
        label: merged[declaredHref]?.label ?? current.label ?? resolvedTitle,
        // A record crumb opens every other record of its type (record-siblings.ts).
        loadOptions: merged[declaredHref]?.loadOptions ?? recordSiblingsLoader(current.token, current.id, pathname),
      };
    }
    // A page that only knows the record's name names the LAST level (the record itself).
    if (options.recordName) {
      const segs = pathname.split("/").filter(Boolean);
      const lastHref = `/${segs.join("/")}`;
      merged[lastHref] = { ...merged[lastHref], label: merged[lastHref]?.label ?? options.recordName };
    }
    return merged;
  }, [options.records, options.recordName, declaredHref, current, resolvedTitle, pathname]);

  return useMemo(
    () =>
      deriveTrail({
        pathname,
        nav: NAV,
        records,
        loadSiblings: routeSiblings,
      }),
    [pathname, records],
  );
}

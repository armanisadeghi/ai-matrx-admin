// hooks/useBuilderFeed.ts
//
// THE publish door of the Builder panel — the admin window that shows every value a page
// has (inputs, findings, workflow runs and their node outputs, AI runs, provision
// snapshots, mandates). The sibling of `useDebugContext` (same slice, same admin gate):
// that hook writes flat "Namespace:Key" debug lines; this one writes keyed, grouped,
// typed entries with history. Contract + panel: features/builder-panel/FEATURE.md.
//
//   const feed = useBuilderFeed("marketing.brands.smart_add");
//   useEffect(() => {
//     feed.publish({ key: "input.website", label: "Website", group: "inputs", data: websiteText, source: "typed" });
//   }, [feed, websiteText]);
//
// Non-admins: `publish` is a no-op — no clone, no dispatch, no render. The panel itself is a
// lazy overlay chunk that only an admin can open, so nothing of it downloads for anyone else.

"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { builderPublish } from "@/lib/redux/preferences/adminDebugSlice";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import type { BuilderPublishInput } from "@/features/builder-panel/types";

/** A plain-JSON copy: the store never holds (or freezes) the page's own objects. */
function plain(value: unknown): { json: string; data: unknown } | null {
  try {
    const json = JSON.stringify(value === undefined ? null : value);
    return { json, data: JSON.parse(json) as unknown };
  } catch {
    return null;
  }
}

export interface BuilderFeedHandle {
  /**
   * Publish one entry or many. The same key replaces in place; unchanged values are skipped.
   * `prune`: these key prefixes are a SET — keys under them that this call did not publish are
   * removed (a finding that is gone leaves the panel too).
   */
  publish: (input: BuilderPublishInput | BuilderPublishInput[], options?: { prune?: string[] }) => void;
  /** True for an admin — gate any expensive value building on it. */
  isActive: boolean;
}

export function useBuilderFeed(surfaceKey: string): BuilderFeedHandle {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(selectIsAdminDebugger) ?? false;
  const pathname = usePathname();
  // key → last published JSON (+ meta), so a re-render that publishes the same value costs nothing.
  const last = useRef(new Map<string, string>());

  const lastKeep = useRef("");

  const publish = (input: BuilderPublishInput | BuilderPublishInput[], options?: { prune?: string[] }) => {
    if (!isActive) return;
    const list = Array.isArray(input) ? input : [input];
    const prefixes = options?.prune ?? [];
    const keep = prefixes.length ? list.map((i) => i.key).filter((k) => prefixes.some((p) => k.startsWith(p))) : [];
    const keepSig = prefixes.length ? `${prefixes.join(",")}|${keep.join(",")}` : "";
    const pruneChanged = prefixes.length > 0 && keepSig !== lastKeep.current;
    if (pruneChanged) {
      lastKeep.current = keepSig;
      for (const k of [...last.current.keys()]) {
        if (prefixes.some((p) => k.startsWith(p)) && !keep.includes(k)) last.current.delete(k);
      }
    }
    const changed: BuilderPublishInput[] = [];
    for (const item of list) {
      const copy = plain(item.data);
      if (!copy) continue;
      const signature = `${copy.json}|${item.label}|${item.group}|${item.kind ?? ""}|${item.source ?? ""}|${item.certainty ?? ""}|${JSON.stringify(item.ref ?? null)}`;
      if (last.current.get(item.key) === signature) continue;
      last.current.set(item.key, signature);
      changed.push({ ...item, data: copy.data, ref: item.ref ? { ...item.ref } : null, at: item.at ?? Date.now() });
    }
    if (changed.length || pruneChanged) {
      dispatch(
        builderPublish({
          surfaceKey,
          route: pathname ?? null,
          entries: changed,
          prune: pruneChanged ? { prefixes, keep } : null,
        }),
      );
    }
  };

  return { publish, isActive };
}

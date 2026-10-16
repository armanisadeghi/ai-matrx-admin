"use client";

/**
 * The ONE loader of a file home's rows (Documents, Workbooks, Presentations).
 *
 * `loading` is true only while the list a person is LOOKING at has no answer yet (`loadActive` / `loadTrashed` must be stable functions): the first load and
 * a change of scope (Trash holds different rows). A `reload` after a row action (rename, move,
 * copy, trash) refreshes in place — the current rows stay on screen, nothing flashes to skeletons,
 * nothing shifts. A refresh that fails keeps the rows and surfaces the error.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isServiceFailure, type ServiceResult } from "@/features/data-tables/types";
import type { FileScope } from "../FileScopeBar";

export function useHomeRows<Row>(
  scope: FileScope,
  loadActive: () => Promise<ServiceResult<Row[]>>,
  loadTrashed: () => Promise<ServiceResult<Row[]>>,
) {
  const [rows, setRows] = useState<Row[]>([]);
  // The scope the rows on screen belong to: another scope is another list, so until its answer lands
  // the list is loading; a refresh of the same scope never is.
  const [loadedScope, setLoadedScope] = useState<FileScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A late answer for a scope the person already left must not land on the current one.
  const latest = useRef(0);

  const reload = useCallback(() => {
    const ticket = ++latest.current;
    return (scope === "trash" ? loadTrashed() : loadActive()).then((res) => {
      if (ticket !== latest.current) return;
      if (isServiceFailure(res)) {
        setError(res.error);
      } else {
        setRows(res.data);
        setError(null);
      }
      setLoadedScope(scope);
    }).catch((err: unknown) => {
      if (ticket !== latest.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setLoadedScope(scope);
    });
  }, [scope, loadActive, loadTrashed]);

  useEffect(() => {
    // The answer lands in a promise callback, never synchronously in the effect.
    void reload();
  }, [reload]);

  return { rows, loading: loadedScope !== scope, error, reload };
}

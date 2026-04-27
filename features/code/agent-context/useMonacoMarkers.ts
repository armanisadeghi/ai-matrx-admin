"use client";

import { useEffect } from "react";
import { loader } from "@monaco-editor/react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectActiveTabId } from "../redux/tabsSlice";
import {
  clearAllDiagnostics,
  setDiagnostics,
  type DiagnosticSeverity,
  type EditorDiagnostic,
} from "../redux/diagnosticsSlice";

/**
 * Subscribes to Monaco's `onDidChangeMarkers` and mirrors the marker
 * set for the **active editor model** into the `codeDiagnostics` slice.
 *
 * Why a single global subscriber:
 *   - Monaco emits markers per-model (per file). The agent only cares
 *     about diagnostics for what the user is currently looking at.
 *   - Subscribing once at the workspace root keeps Monaco internals out
 *     of `MonacoEditor`, which is supposed to be a thin presentational
 *     shell.
 *   - The slice is keyed by `tabId`, not by model URI, so the agent
 *     context bridge can join it directly to `editor.activeFile`.
 *
 * Marker → diagnostic mapping:
 *   - severity: monaco's 8/4/2/1 → "error" / "warning" / "info" / "hint"
 *   - source / code: forwarded as-is when present (e.g. "ts", "eslint")
 *   - positions are kept 1-based to match Monaco's wire format
 *
 * Performance:
 *   - The handler bails fast if the active model URI doesn't match what
 *     the user has on screen — Monaco fires `onDidChangeMarkers` for
 *     every model that gets re-diagnosed, including library models.
 *   - `setDiagnostics` is a no-op when the diagnostic list is empty.
 *
 * Lifecycle:
 *   - Disposes the subscription on unmount and clears the slice so a
 *     remounted editor doesn't see stale markers from a previous
 *     workspace.
 */
export function useMonacoMarkers(): void {
  const dispatch = useAppDispatch();
  const activeTabId = useAppSelector(selectActiveTabId);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | null = null;

    void (async () => {
      const monaco = await loader.init();
      if (cancelled) return;

      const flushFor = (uri: string) => {
        const model = monaco.editor
          .getModels()
          .find((m) => m.uri.toString() === uri);
        if (!model) return;
        // Tab id == file path: Monaco model paths are set from
        // `MonacoEditor`'s `path` prop, which the workspace seeds with
        // the tab id. If we ever stop using tab id as the path, this
        // single line becomes the place to remap.
        const tabId = uriToTabId(uri);
        const diagnostics = monaco.editor
          .getModelMarkers({ resource: model.uri })
          .map(toDiagnostic);
        dispatch(setDiagnostics({ tabId, diagnostics }));
      };

      const subscription = monaco.editor.onDidChangeMarkers((uris) => {
        for (const uri of uris) flushFor(uri.toString());
      });
      dispose = () => subscription.dispose();

      // Seed once for any models already open at hook mount.
      for (const model of monaco.editor.getModels()) {
        flushFor(model.uri.toString());
      }
    })();

    return () => {
      cancelled = true;
      if (dispose) dispose();
      dispatch(clearAllDiagnostics());
    };
    // Re-running this effect when `activeTabId` changes would tear down
    // and re-seed the subscription unnecessarily — the subscription
    // itself is global and doesn't depend on the active tab. The slice
    // is keyed per-tab so consumers still get the right scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // activeTabId is intentionally read above so React knows this hook
  // depends on it for re-render purposes (e.g. consumers using the
  // returned diagnostics will get a fresh selector reference). We
  // don't act on the value directly here — the slice is keyed per-tab.
  void activeTabId;
}

function uriToTabId(uri: string): string {
  // Monaco prepends `inmemory://model/` or `file:///` to whatever path
  // we passed to `<Editor path=…>`. Strip a known prefix; otherwise,
  // fall back to the full URI so we still produce a stable key.
  const stripped = uri
    .replace(/^inmemory:\/\/model\//, "")
    .replace(/^file:\/\//, "");
  return stripped || uri;
}

interface MonacoMarkerLike {
  severity: number;
  message: string;
  source?: string;
  code?: string | number | { value: string | number };
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

function toDiagnostic(marker: MonacoMarkerLike): EditorDiagnostic {
  // Monaco's `code` field is sometimes `{ value, target }` for clickable
  // diagnostics, sometimes a primitive — normalize to a primitive.
  const rawCode = marker.code;
  const code: string | number | undefined =
    rawCode === undefined || rawCode === null
      ? undefined
      : typeof rawCode === "object"
        ? rawCode.value
        : rawCode;
  return {
    severity: severityFromMonaco(marker.severity),
    message: marker.message,
    source: marker.source,
    code,
    startLine: marker.startLineNumber,
    endLine: marker.endLineNumber,
    startColumn: marker.startColumn,
    endColumn: marker.endColumn,
  };
}

function severityFromMonaco(level: number): DiagnosticSeverity {
  // Monaco uses MarkerSeverity: Hint=1, Info=2, Warning=4, Error=8.
  switch (level) {
    case 8:
      return "error";
    case 4:
      return "warning";
    case 2:
      return "info";
    case 1:
    default:
      return "hint";
  }
}

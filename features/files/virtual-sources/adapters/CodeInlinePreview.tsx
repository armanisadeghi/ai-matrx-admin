/**
 * features/files/virtual-sources/adapters/CodeInlinePreview.tsx
 *
 * Inline preview for every code-shaped virtual source (Agent Apps, Prompt
 * Apps, Tool UIs, Code Snippets). Wraps the new `MonacoEditor` from the
 * `features/code` workspace — the same component the `/code` route uses
 * inside its editor tabs — and wires its `onChange` callback to the
 * source's adapter `write()` via the source-aware `writeAny` thunk
 * (debounced).
 *
 * The component is keyed on `(adapterId, id, fieldId?)` so multiple sources
 * can mount different bindings without colliding. Adapters re-export it as
 * their `inlinePreview` slot; PageShell and PreviewPane don't need to know
 * which source they're rendering.
 */

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { readAny, writeAny } from "@/features/files/redux/virtual-thunks";
import { makeSyntheticId } from "@/features/files/virtual-sources/path";
import type { InlinePreviewProps } from "@/features/files/virtual-sources/types";

const MonacoEditor = dynamic(
  () =>
    import("@/features/code/editor/MonacoEditor").then((m) => m.MonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const SAVE_DEBOUNCE_MS = 800;

interface Props extends InlinePreviewProps {
  /** Adapter source id — needed to build the synthetic id we pass to writeAny. */
  adapterId: string;
}

/**
 * Internal component. Adapters re-export a `makeCodeInlinePreview(adapterId)`
 * factory below that closes over their own source id, so consumers don't
 * have to pass it.
 */
function CodeInlinePreview({ adapterId, id, fieldId, name }: Props) {
  const dispatch = useAppDispatch();
  const [content, setContent] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syntheticId = makeSyntheticId(adapterId, id, fieldId);

  // Load on mount / target change. Routes through the source-aware `readAny`
  // thunk, which dispatches to the correct adapter under the hood.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await dispatch(readAny({ id: syntheticId })).unwrap();
        if (cancelled) return;
        setContent(result.content);
        setLanguage(result.language || "plaintext");
        lastSavedRef.current = result.content;
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load file.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dispatch, syntheticId]);

  const flushSave = useCallback(
    async (next: string) => {
      if (next === lastSavedRef.current) return;
      setSaving(true);
      try {
        await dispatch(
          writeAny({ id: syntheticId, content: next }),
        ).unwrap();
        lastSavedRef.current = next;
      } catch {
        // swallow — typing again will re-trigger the save
      } finally {
        setSaving(false);
      }
    },
    [dispatch, syntheticId],
  );

  const handleChange = useCallback(
    (next: string) => {
      setContent(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void flushSave(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  // Cmd/Ctrl+S inside Monaco fires this — flush immediately, don't wait for
  // the debounce. The save chip in the header shows the pending state.
  const handleSaveShortcut = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void flushSave(content);
  }, [content, flushSave]);

  // Best-effort flush on unmount — if the user closes the preview pane
  // mid-debounce we still try to land the save. Fire-and-forget; unmount
  // can't await.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (content !== lastSavedRef.current && !error) {
        void dispatch(
          writeAny({ id: syntheticId, content }),
        )
          .unwrap()
          .catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syntheticId]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">{name}</span>
        {saving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          value={content}
          language={language}
          path={`vfs:${adapterId}/${id}${fieldId ? `:${fieldId}` : ""}`}
          onChange={handleChange}
          onSave={handleSaveShortcut}
        />
      </div>
    </div>
  );
}

/**
 * Build the adapter-specific `inlinePreview` component. Each adapter calls
 * this with its own `sourceId` and assigns the result to its
 * `inlinePreview` field. Closes over the source id so the inner component
 * doesn't have to be told which source it's previewing.
 */
export function makeCodeInlinePreview(adapterId: string) {
  function CodeInlinePreviewBound(props: InlinePreviewProps) {
    return <CodeInlinePreview adapterId={adapterId} {...props} />;
  }
  CodeInlinePreviewBound.displayName = `CodeInlinePreview(${adapterId})`;
  return CodeInlinePreviewBound;
}

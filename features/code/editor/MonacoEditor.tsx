"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
// Monaco's editor type is pulled directly from @monaco-editor/react re-exports
// where possible; the handful of shapes we need are narrowed locally.
import { configureMonaco } from "./monaco-config";
import { useMonacoTheme } from "./useMonacoTheme";

/** Minimal shape of the Monaco editor instance we need. Keeping this loose
 *  avoids a hard type dep on the monaco-editor package itself. */
type StandaloneCodeEditor = {
  updateOptions: (opts: Record<string, unknown>) => void;
  getValue: () => string;
  layout: () => void;
  focus: () => void;
  onDidChangeCursorPosition: (cb: (e: unknown) => void) => {
    dispose: () => void;
  };
};

export interface MonacoEditorProps {
  /** Current buffer content. */
  value: string;
  /** Monaco language id, e.g. "typescript". */
  language: string;
  /** Optional Monaco path / uri — used for per-file model state. */
  path?: string;
  readOnly?: boolean;
  onChange?: (next: string) => void;
  /** Called when the editor is mounted. Gives the host access to imperative
   *  APIs (e.g. focus, format, scroll). */
  onEditorMount?: (editor: StandaloneCodeEditor) => void;
  /** Tailwind class to size/position the editor. */
  className?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  path,
  readOnly = false,
  onChange,
  onEditorMount,
  className,
}) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const isDark = useMonacoTheme();
  const editorRef = useRef<StandaloneCodeEditor | null>(null);

  // Fire Monaco configuration exactly once per app session.
  useEffect(() => {
    let cancelled = false;
    configureMonaco().then(() => {
      if (!cancelled) setIsConfigured(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor as unknown as StandaloneCodeEditor;
      onEditorMount?.(editorRef.current);
    },
    [onEditorMount],
  );

  const handleChange: OnChange = useCallback(
    (next) => {
      onChange?.(next ?? "");
    },
    [onChange],
  );

  const theme = isDark ? "vs-dark" : "vs";

  if (!isConfigured) {
    return (
      <div
        className={
          "flex h-full w-full items-center justify-center text-xs text-neutral-500 " +
          (className ?? "")
        }
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div className={"h-full w-full " + (className ?? "")}>
      <Editor
        value={value}
        language={language}
        path={path}
        theme={theme}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          readOnly,
          automaticLayout: true,
          minimap: { enabled: true, renderCharacters: false },
          fontSize: 13,
          fontLigatures: true,
          fontFamily:
            'Menlo, Monaco, "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
          scrollBeyondLastLine: false,
          renderWhitespace: "selection",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "off",
          padding: { top: 12, bottom: 12 },
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: "active",
            indentation: true,
            highlightActiveIndentation: true,
          },
          scrollbar: {
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          contextmenu: true,
          // Rely on @monaco-editor/react to render Monaco's native context menu.
        }}
      />
    </div>
  );
};

export default MonacoEditor;

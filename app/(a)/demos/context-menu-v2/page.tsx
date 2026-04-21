"use client";

import { useRef, useState } from "react";
import { UnifiedAgentContextMenu } from "@/features/context-menu-v2";

export default function ContextMenuV2DemoPage() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [textareaValue, setTextareaValue] = useState(
    "Right-click anywhere in this textarea to open the agent context menu. Select some text first to enable text-action shortcuts.",
  );
  const [readonlyValue, setReadonlyValue] = useState(
    "This is a read-only paragraph. Select some text and right-click to verify the non-editable code path.",
  );
  const [history, setHistory] = useState<string[]>([textareaValue]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (next: string) => {
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(next);
    setHistory(trimmed);
    setHistoryIndex(trimmed.length - 1);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(e.target.value);
    pushHistory(e.target.value);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setTextareaValue(history[next]);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setTextareaValue(history[next]);
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
      <div className="border-b border-border px-4 py-2">
        <h1 className="text-lg font-semibold">UnifiedAgentContextMenu — Demo</h1>
        <p className="text-xs text-muted-foreground">
          Phase 3 smoke test. Right-click in either pane to open the menu.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Editable textarea
          </h2>
          <UnifiedAgentContextMenu
            getTextarea={() => textareaRef.current}
            onTextReplace={(v) => {
              setTextareaValue(v);
              pushHistory(v);
            }}
            onTextInsertBefore={(t) => {
              const next = t + textareaValue;
              setTextareaValue(next);
              pushHistory(next);
            }}
            onTextInsertAfter={(t) => {
              const next = textareaValue + t;
              setTextareaValue(next);
              pushHistory(next);
            }}
            onContentInserted={() => {
              if (textareaRef.current) {
                pushHistory(textareaRef.current.value);
              }
            }}
            isEditable
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            undoHint="⌘Z"
            redoHint="⇧⌘Z"
            contextData={{
              content: textareaValue,
              context: "demo-textarea",
              contextFilter: "code-editor",
            }}
            scope="user"
          >
            <textarea
              ref={textareaRef}
              value={textareaValue}
              onChange={handleTextareaChange}
              className="flex-1 min-h-[280px] w-full rounded-md border border-border bg-card p-3 text-[16px] font-mono outline-none focus:ring-2 focus:ring-primary"
            />
          </UnifiedAgentContextMenu>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Read-only paragraph
          </h2>
          <UnifiedAgentContextMenu
            isEditable={false}
            contextData={{
              content: readonlyValue,
              context: "demo-readonly",
            }}
            scope="user"
          >
            <div className="flex-1 min-h-[280px] w-full rounded-md border border-border bg-card p-3 text-base leading-relaxed">
              {readonlyValue}
            </div>
          </UnifiedAgentContextMenu>
          <button
            type="button"
            className="text-xs text-muted-foreground underline self-start"
            onClick={() =>
              setReadonlyValue(
                readonlyValue +
                  " (extra appended at " +
                  new Date().toLocaleTimeString() +
                  ")",
              )
            }
          >
            Append timestamp (mutate the read-only block)
          </button>
        </section>
      </div>
    </div>
  );
}

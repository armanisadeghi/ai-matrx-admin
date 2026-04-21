"use client";

import { useRef, useState } from "react";
import { UnifiedAgentContextMenu } from "@/features/context-menu-v2";

// Five-panel smoke test for the context-menu-v2 surface.
// Each panel exercises a different combination of:
//   - addedContexts / excludedContexts
//   - placementMode ("show" | "hide" | "disable" per placement)
//   - isEditable vs read-only
//   - contextData shape (content, context, custom keys)
//
// Use this page to verify:
//   1. Correct shortcuts show up given a context filter configuration
//   2. Hidden placements really disappear, disabled ones are greyed out
//   3. A launched shortcut receives the expected applicationScope
//      (selection, text_before, text_after, content, context, custom keys)
//
// Open the dev-tools console — fetchUnifiedMenu logs a placement summary
// when the menu first mounts.

export default function ContextMenuV2DemoPage() {
  // ── Panel 1: Editable code editor — code-editor + general contexts ─────────
  const codeRef = useRef<HTMLTextAreaElement | null>(null);
  const [codeValue, setCodeValue] = useState(
    `// Panel 1 — editable code editor\n// Right-click to see code-editor + general shortcuts.\n// Select any text first to enable selection-based shortcuts.\nfunction greet(name) {\n  return "Hello, " + name;\n}\n`,
  );
  const [codeHistory, setCodeHistory] = useState<string[]>([codeValue]);
  const [codeHistoryIndex, setCodeHistoryIndex] = useState(0);
  const pushCodeHistory = (next: string) => {
    const trimmed = codeHistory.slice(0, codeHistoryIndex + 1);
    trimmed.push(next);
    setCodeHistory(trimmed);
    setCodeHistoryIndex(trimmed.length - 1);
  };

  // ── Panel 2: Editable content editor — content-editor + general ───────────
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [contentValue, setContentValue] = useState(
    `Panel 2 — editable content editor.\nThis panel exposes content-editor + general shortcuts.\nNotice Content Blocks remain visible because we're editable.`,
  );

  // ── Panel 3: Read-only block — hides content-block + quick-action ─────────
  const [readonlyValue] = useState(
    `Panel 3 — read-only block.\nContent Blocks and Quick Actions are HIDDEN here.\nOnly the AI-action submenus for general + content-editor remain.`,
  );

  // ── Panel 4: Restrictive filter — code-editor ONLY (no general) ──────────
  const [restrictiveRef, setRestrictiveRef] =
    useState<HTMLTextAreaElement | null>(null);
  const [restrictiveValue, setRestrictiveValue] = useState(
    `Panel 4 — code-editor ONLY (general excluded).\nExpect shortcuts tagged with code-editor but NOT the generic 'Translate to Spanish' etc.`,
  );

  // ── Panel 5: Showcase of "disable" mode ─────────────────────────────────
  const [showcaseValue, setShowcaseValue] = useState(
    `Panel 5 — disable showcase.\nContent Blocks are DISABLED (greyed, unclickable).\nOrganization Tools are also DISABLED.\nAI Actions remain fully enabled.`,
  );
  const showcaseRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
      <div className="border-b border-border px-4 py-2">
        <h1 className="text-lg font-semibold">
          UnifiedAgentContextMenu — 5-Panel Smoke Test
        </h1>
        <p className="text-xs text-muted-foreground">
          Right-click in any panel. Each exercises a different combination of
          contexts and placement modes. Check the dev console for fetch logs.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* ── 1 ── Editable code editor */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">1. Code editor (editable)</h2>
            <p className="text-[11px] text-muted-foreground">
              addedContexts: <code>['code-editor']</code>
              <br />
              excludedContexts: none
              <br />
              placements: all show
            </p>
          </header>
          <UnifiedAgentContextMenu
            getTextarea={() => codeRef.current}
            onTextReplace={(v) => {
              setCodeValue(v);
              pushCodeHistory(v);
            }}
            onTextInsertBefore={(t) => {
              const next = t + codeValue;
              setCodeValue(next);
              pushCodeHistory(next);
            }}
            onTextInsertAfter={(t) => {
              const next = codeValue + t;
              setCodeValue(next);
              pushCodeHistory(next);
            }}
            onContentInserted={() => {
              if (codeRef.current) pushCodeHistory(codeRef.current.value);
            }}
            isEditable
            onUndo={() => {
              if (codeHistoryIndex <= 0) return;
              const i = codeHistoryIndex - 1;
              setCodeHistoryIndex(i);
              setCodeValue(codeHistory[i]);
            }}
            onRedo={() => {
              if (codeHistoryIndex >= codeHistory.length - 1) return;
              const i = codeHistoryIndex + 1;
              setCodeHistoryIndex(i);
              setCodeValue(codeHistory[i]);
            }}
            canUndo={codeHistoryIndex > 0}
            canRedo={codeHistoryIndex < codeHistory.length - 1}
            addedContexts={["code-editor"]}
            contextData={{
              content: codeValue,
              context: "panel-1-code-editor",
              file_path: "demo/panel-1.tsx",
            }}
            scope="user"
          >
            <textarea
              ref={codeRef}
              value={codeValue}
              onChange={(e) => {
                setCodeValue(e.target.value);
                pushCodeHistory(e.target.value);
              }}
              className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-card p-3 text-[16px] font-mono outline-none focus:ring-2 focus:ring-primary"
            />
          </UnifiedAgentContextMenu>
        </section>

        {/* ── 2 ── Editable content editor */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">2. Content editor (editable)</h2>
            <p className="text-[11px] text-muted-foreground">
              addedContexts: <code>['content-editor']</code>
              <br />
              excludedContexts: none
              <br />
              placements: all show
            </p>
          </header>
          <UnifiedAgentContextMenu
            getTextarea={() => contentRef.current}
            onTextReplace={(v) => setContentValue(v)}
            onTextInsertBefore={(t) => setContentValue(t + contentValue)}
            onTextInsertAfter={(t) => setContentValue(contentValue + t)}
            isEditable
            addedContexts={["content-editor"]}
            contextData={{
              content: contentValue,
              context: "panel-2-content",
            }}
            scope="user"
          >
            <textarea
              ref={contentRef}
              value={contentValue}
              onChange={(e) => setContentValue(e.target.value)}
              className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-card p-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
            />
          </UnifiedAgentContextMenu>
        </section>

        {/* ── 3 ── Read-only block — hide content-block + quick-action */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">3. Read-only paragraph</h2>
            <p className="text-[11px] text-muted-foreground">
              addedContexts: <code>['content-editor']</code>
              <br />
              placements:{" "}
              <code>
                {"{ content-block: 'hide', quick-action: 'hide' }"}
              </code>
            </p>
          </header>
          <UnifiedAgentContextMenu
            isEditable={false}
            addedContexts={["content-editor"]}
            placementMode={{
              "content-block": "hide",
              "quick-action": "hide",
            }}
            contextData={{
              content: readonlyValue,
              context: "panel-3-readonly",
            }}
            scope="user"
          >
            <div className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-card p-3 text-[16px] leading-relaxed whitespace-pre-line">
              {readonlyValue}
            </div>
          </UnifiedAgentContextMenu>
        </section>

        {/* ── 4 ── Restrictive — code-editor ONLY (general excluded) */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">4. Restrictive (code only)</h2>
            <p className="text-[11px] text-muted-foreground">
              addedContexts: <code>['code-editor']</code>
              <br />
              excludedContexts: <code>['general']</code>
              <br />
              Only shortcuts explicitly tagged 'code-editor' appear.
            </p>
          </header>
          <UnifiedAgentContextMenu
            getTextarea={() => restrictiveRef}
            onTextReplace={(v) => setRestrictiveValue(v)}
            isEditable
            addedContexts={["code-editor"]}
            excludedContexts={["general"]}
            contextData={{
              content: restrictiveValue,
              context: "panel-4-restrictive",
              ts_errors: "Type 'string' is not assignable to type 'number'",
              terminal_output: "npm run build\nBuild succeeded",
            }}
            scope="user"
          >
            <textarea
              ref={setRestrictiveRef}
              value={restrictiveValue}
              onChange={(e) => setRestrictiveValue(e.target.value)}
              className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-card p-3 text-[16px] font-mono outline-none focus:ring-2 focus:ring-primary"
            />
          </UnifiedAgentContextMenu>
        </section>

        {/* ── 5 ── Disable showcase */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">5. Disable showcase</h2>
            <p className="text-[11px] text-muted-foreground">
              placements:{" "}
              <code>
                {
                  "{ content-block: 'disable', organization-tool: 'disable' }"
                }
              </code>
              <br />
              Both submenus render but are greyed out.
            </p>
          </header>
          <UnifiedAgentContextMenu
            getTextarea={() => showcaseRef.current}
            onTextReplace={(v) => setShowcaseValue(v)}
            isEditable
            addedContexts={["content-editor"]}
            placementMode={{
              "content-block": "disable",
              "organization-tool": "disable",
            }}
            contextData={{
              content: showcaseValue,
              context: "panel-5-showcase",
            }}
            scope="user"
          >
            <textarea
              ref={showcaseRef}
              value={showcaseValue}
              onChange={(e) => setShowcaseValue(e.target.value)}
              className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-card p-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
            />
          </UnifiedAgentContextMenu>
        </section>

        {/* ── 6 ── Diagnostic link */}
        <section className="flex flex-col gap-2">
          <header>
            <h2 className="text-sm font-semibold">Diagnostic</h2>
            <p className="text-[11px] text-muted-foreground">
              If shortcuts don't show up the way you expect, open
              <br />
              <a
                href="/demos/context-menu-v2/debug"
                className="underline text-primary"
              >
                /demos/context-menu-v2/debug
              </a>{" "}
              to see the raw view output and Redux state.
            </p>
          </header>
          <div className="flex-1 min-h-[220px] w-full rounded-md border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-2">
              Expected behavior per panel (with current seed data)
            </p>
            <ol className="list-decimal ml-4 space-y-2">
              <li>
                Code editor — shows shortcuts tagged code-editor OR general.
              </li>
              <li>
                Content editor — shows shortcuts tagged content-editor OR
                general.
              </li>
              <li>
                Read-only — hides Content Blocks and Quick Actions submenus.
              </li>
              <li>
                Restrictive — ONLY shows shortcuts tagged code-editor
                (generic 'general' ones are filtered out).
              </li>
              <li>
                Disable showcase — Content Blocks and Organization Tools
                submenus visible but greyed out.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

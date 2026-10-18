"use client";

/**
 * The Studio workspace, live and editable (RIGHT pane before an agent exists). It IS the inputs card:
 * editable labels and values, never a question card. The assistant fills it through the `studio_workspace`
 * tool while it works; every edit here marks the field as the person's, and the server then refuses the
 * assistant's overwrite. Suggestions from the "inputs we may have missed" check glow ("we think") until
 * the person keeps or drops each one.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDraftField } from "../use-draft-field";
import { Plus, X } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { EditableLabel } from "@ai-matrx/design-system";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { VariableChip } from "@ai-matrx/rich-content/display/chat-markdown/matrx-variables/VariableChip";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { toast } from "@/lib/toast";
import {
  editWorkspace,
  keepSuggestedInput,
  loadWorkspace,
  personAddListItem,
  personRemoveInput,
  personRemoveListItem,
  personSetInput,
  personSetListItem,
  personSetText,
  workspaceIsEmpty,
  type StudioWorkspace,
  type TextField,
  type TextListField,
  type WorkspaceInput,
} from "../workspace";

const POLL_MS = 2500;

/**
 * A field that shows its WHOLE text (it grows with the content and wraps, never truncates) and, while
 * empty, reads as a quiet "Not set yet" line instead of a big empty box; the border appears on hover/focus.
 */
function QuietText({
  value,
  onChange,
  label,
  className = "",
  testId,
  emphasis = false,
}: {
  value: string;
  onChange: (v: string) => void | Promise<void>;
  label: string;
  className?: string;
  testId?: string;
  emphasis?: boolean;
}) {
  // The person's draft owns the field while it is focused/unsaved; echoes and assistant writes never clobber it.
  const field = useDraftField(value, onChange);
  return (
    <textarea
      rows={1}
      value={field.text}
      aria-label={label}
      placeholder="Not set yet"
      data-testid={testId}
      onChange={(e) => field.onChange(e.target.value)}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
      style={{ fieldSizing: "content" } as CSSProperties}
      className={`block w-full min-w-0 resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm leading-snug outline-none placeholder:text-muted-foreground hover:border-border focus:border-ring focus:bg-background ${
        emphasis ? "font-medium text-foreground" : "text-foreground"
      } ${className}`}
    />
  );
}

/** The record, re-read while the assistant is working; `refresh` after the person's own edit. */
export function useStudioWorkspace(conversationId: string | null) {
  // The record is held WITH the conversation it belongs to, so a closed or switched conversation shows
  // nothing without a synchronous reset in the effect.
  const [held, setHeld] = useState<{ id: string; ws: StudioWorkspace } | null>(null);
  const ws = held && held.id === conversationId ? held.ws : null;
  const setWs = (update: StudioWorkspace | null | ((w: StudioWorkspace | null) => StudioWorkspace | null)) => {
    if (!conversationId) return;
    setHeld((current) => {
      const prev = current && current.id === conversationId ? current.ws : null;
      const next = typeof update === "function" ? update(prev) : update;
      return next ? { id: conversationId, ws: next } : null;
    });
  };
  const edits = useRef(0); // edits queued or in flight
  const gen = useRef(0); // bumps on every edit, so a read that started earlier is discarded
  const chain = useRef<Promise<unknown>>(Promise.resolve()); // saves land in the order they were made
  useEffect(() => {
    if (!conversationId) return;
    let live = true;
    const read = async () => {
      if (edits.current > 0) return; // never overwrite the screen under a pending edit
      const started = gen.current;
      try {
        const next = await loadWorkspace(conversationId);
        if (!live || edits.current > 0 || gen.current !== started) return; // an edit began while this read was out
        setHeld(next ? { id: conversationId, ws: next } : null);
      } catch {
        /* the next poll tries again; a failed read never blanks what is on screen */
      }
    };
    void read();
    const t = setInterval(read, POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [conversationId]);
  const edit = (change: (w: StudioWorkspace) => StudioWorkspace): Promise<void> => {
    if (!conversationId) return Promise.resolve();
    edits.current += 1;
    gen.current += 1;
    setWs((w) => (w ? change(w) : w)); // optimistic
    const run = chain.current.then(async () => {
      try {
        const saved = await editWorkspace(conversationId, change);
        // Only the LAST queued save's echo is shown: an earlier echo would land on top of newer typing.
        if (edits.current === 1) setWs(saved);
      } catch (e) {
        toast.error("That edit did not save", { description: e instanceof Error ? e.message : String(e) });
      } finally {
        edits.current -= 1;
      }
    });
    chain.current = run;
    return run;
  };
  return { ws, edit };
}

/**
 * One input the person gave: its name as THE variable pill (what it becomes in the agent), the value
 * under it. Pressing the pill renames it in place; Enter or leaving keeps it, Esc puts it back.
 */
function InputRow({
  input,
  onRename,
  onValue,
  onRemove,
}: {
  input: WorkspaceInput;
  onRename: (label: string) => void;
  onValue: (value: string) => void | Promise<void>;
  onRemove: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const label = input.label?.trim() || input.name;
  return (
    <div className="group flex items-start gap-1" data-testid={`workspace-input-${input.name}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-h-7 items-center px-1.5 text-sm">
          {renaming ? (
            <EditableLabel
              activation="controlled"
              editing
              onEditingChange={setRenaming}
              value={label}
              onCommit={(next) => onRename(next)}
              ariaLabel={`Name for ${label}`}
              className="min-w-0 flex-1"
            />
          ) : (
            <VariableChip
              state="declared"
              label={label}
              role="button"
              tabIndex={0}
              title="Rename"
              aria-label={`Rename ${label}`}
              onClick={() => setRenaming(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRenaming(true);
                }
              }}
            />
          )}
        </div>
        <QuietText label={`Value of ${label}`} value={input.value ?? ""} onChange={onValue} />
      </div>
      <Button variant="quiet" icon={<X />} aria-label={`Remove ${label}`} title={`Remove ${label}`} onClick={onRemove} />
    </div>
  );
}

const LISTS: { field: TextListField; title: string }[] = [
  { field: "requirements", title: "Rules from your corrections" },
  { field: "steps", title: "Steps" },
  { field: "knowledge", title: "Knowledge used" },
  { field: "open_questions", title: "Still open" },
];

export function StudioWorkspacePane({
  ws,
  edit,
  suggestions,
  onDropSuggestion,
}: {
  ws: StudioWorkspace | null;
  edit: (change: (w: StudioWorkspace) => StudioWorkspace) => Promise<void>;
  suggestions: WorkspaceInput[];
  onDropSuggestion: (name: string) => void;
}) {
  if (!ws || (workspaceIsEmpty(ws) && suggestions.length === 0)) {
    return (
      <div className="h-full" data-testid="studio-workspace">
        <EmptyState
          icon={<AGENT_ICON className="h-5 w-5" />}
          title="Your workspace fills in as you work"
          line="The goal, the inputs you give and the rules you set appear here. You can change any of it"
        />
      </div>
    );
  }
  const text = (field: TextField, title: string) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <QuietText
        label={title}
        value={ws[field] ?? ""}
        onChange={(v) => edit((w) => personSetText(w, field, v))}
        testId={`workspace-${field}`}
      />
    </div>
  );
  return (
    <div className="h-full overflow-y-auto p-3" data-testid="studio-workspace">
      <div className="flex flex-col gap-4">
        {text("title", "Name")}
        {text("goal", "What you want")}
        {text("deliverable", "What the answer is")}
        <section className="flex flex-col gap-2" data-testid="workspace-inputs">
          <h3 className="text-xs font-semibold text-foreground">Inputs</h3>
          {ws.inputs.length === 0 && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">None yet</p>
          )}
          {ws.inputs.map((i) => (
            <InputRow
              key={i.name}
              input={i}
              onRename={(label) => void edit((w) => personSetInput(w, i.name, { label }))}
              onValue={(value) => edit((w) => personSetInput(w, i.name, { value }))}
              onRemove={() => void edit((w) => personRemoveInput(w, i.name))}
            />
          ))}
          {suggestions.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2"
              data-testid={`workspace-suggestion-${s.name}`}
            >
              <span className="min-w-0 flex-1 break-words text-xs text-foreground">
                {s.label ?? s.name}: {s.value}
              </span>
              <Button variant="outline" onClick={() => { void edit((w) => keepSuggestedInput(w, s)); onDropSuggestion(s.name); }}>
                Keep
              </Button>
              <Button variant="quiet" onClick={() => onDropSuggestion(s.name)}>
                Drop
              </Button>
            </div>
          ))}
        </section>
        {ws.approved_result && (
          <section className="flex flex-col gap-1" data-testid="workspace-approved">
            <h3 className="text-xs font-semibold text-foreground">The result you approved</h3>
            <div className="max-h-40 overflow-hidden rounded-md border border-border px-2 py-1.5 text-sm [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
              <RichContent level="full" imagePolicy="ai" source={ws.approved_result.text} />
            </div>
          </section>
        )}
        {LISTS.map(({ field, title }) =>
          ws[field].length === 0 ? null : (
            <section key={field} className="flex flex-col gap-1" data-testid={`workspace-${field}`}>
              <h3 className="text-xs font-semibold text-foreground">{title}</h3>
              {ws[field].map((v, idx) => (
                <div key={`${field}-${idx}`} className="flex items-start gap-1">
                  <QuietText
                    label={`${title} ${idx + 1}`}
                    value={v}
                    onChange={(val) => edit((w) => personSetListItem(w, field, idx, val))}
                  />
                  <Button variant="quiet" icon={<X />} aria-label={`Remove ${title} ${idx + 1}`} onClick={() => void edit((w) => personRemoveListItem(w, field, idx))} />
                </div>
              ))}
            </section>
          ),
        )}
        {ws.tools_that_mattered.length > 0 && (
          <section className="flex flex-col gap-1" data-testid="workspace-tools">
            <h3 className="text-xs font-semibold text-foreground">Tools that mattered</h3>
            {ws.tools_that_mattered.map((t) => (
              <p key={t.tool} className="text-xs text-muted-foreground">
                {t.tool}
                {t.why ? `: ${t.why}` : ""}
              </p>
            ))}
          </section>
        )}
        <Button variant="quiet" icon={<Plus />} onClick={() => void edit((w) => personAddListItem(w, "requirements", ""))}>
          Add a rule
        </Button>
      </div>
    </div>
  );
}

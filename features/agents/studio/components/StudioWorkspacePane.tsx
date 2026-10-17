"use client";

/**
 * The Studio workspace, live and editable (RIGHT pane before an agent exists). It IS the inputs card:
 * editable labels and values, never a question card. The assistant fills it through the `studio_workspace`
 * tool while it works; every edit here marks the field as the person's, and the server then refuses the
 * assistant's overwrite. Suggestions from the "inputs we may have missed" check glow ("we think") until
 * the person keeps or drops each one.
 */

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
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

/** The record, re-read while the assistant is working; `refresh` after the person's own edit. */
export function useStudioWorkspace(conversationId: string | null) {
  const [ws, setWs] = useState<StudioWorkspace | null>(null);
  const edits = useRef(0);
  useEffect(() => {
    if (!conversationId) {
      setWs(null);
      return;
    }
    let live = true;
    const read = async () => {
      if (edits.current > 0) return; // never overwrite the screen under a pending edit
      try {
        const next = await loadWorkspace(conversationId);
        if (live) setWs(next);
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
  const edit = async (change: (w: StudioWorkspace) => StudioWorkspace) => {
    if (!conversationId) return;
    edits.current += 1;
    setWs((w) => (w ? change(w) : w)); // optimistic
    try {
      setWs(await editWorkspace(conversationId, change));
    } catch (e) {
      toast.error("That edit did not save", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      edits.current -= 1;
    }
  };
  return { ws, edit };
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
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {title}
      <ProInput
        value={ws[field] ?? ""}
        onChange={(e) => void edit((w) => personSetText(w, field, e.target.value))}
        data-testid={`workspace-${field}`}
      />
    </label>
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
            <div key={i.name} className="flex items-end gap-2" data-testid={`workspace-input-${i.name}`}>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
                <ProInput
                  aria-label={`Label for ${i.name}`}
                  value={i.label ?? i.name}
                  onChange={(e) => void edit((w) => personSetInput(w, i.name, { label: e.target.value }))}
                />
              </label>
              <ProInput
                className="min-w-0 flex-1"
                aria-label={`Value of ${i.label ?? i.name}`}
                value={i.value ?? ""}
                onChange={(e) => void edit((w) => personSetInput(w, i.name, { value: e.target.value }))}
              />
              <Button variant="quiet" icon={<X />} aria-label={`Remove ${i.label ?? i.name}`} onClick={() => void edit((w) => personRemoveInput(w, i.name))} />
            </div>
          ))}
          {suggestions.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2"
              data-testid={`workspace-suggestion-${s.name}`}
            >
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
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
            <p className="line-clamp-6 whitespace-pre-wrap text-xs text-muted-foreground">{ws.approved_result.text}</p>
          </section>
        )}
        {LISTS.map(({ field, title }) =>
          ws[field].length === 0 ? null : (
            <section key={field} className="flex flex-col gap-1" data-testid={`workspace-${field}`}>
              <h3 className="text-xs font-semibold text-foreground">{title}</h3>
              {ws[field].map((v, idx) => (
                <div key={`${field}-${idx}`} className="flex items-center gap-2">
                  <ProInput
                    className="min-w-0 flex-1"
                    aria-label={`${title} ${idx + 1}`}
                    value={v}
                    onChange={(e) => void edit((w) => personSetListItem(w, field, idx, e.target.value))}
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

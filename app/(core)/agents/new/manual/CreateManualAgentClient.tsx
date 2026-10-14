"use client";

import { ProTextarea } from "@/components/official/ProTextarea";

// The client half of `/agents/new/manual`.
//
// 🚨 THE ROW IS CREATED ON THE FIRST SAVE, NEVER ON MOUNT. This page used to
// create an "Untitled Agent" the moment it opened, so every visit, reload or
// back-button landed a blank row (the way Notion and Google Docs avoid: the
// document exists once the person acts). Now the page is a small form and the
// insert runs only on submit; a successful create ends in `redirect()` to
// `/agents/<id>/build`, so a refresh there reopens the existing row.
//
// The organization a write acts in is the one the person SELECTED, read HERE
// from the store and carried into the action as an argument —
// `agent.definition` has a BEFORE INSERT trigger (`public._stamp_org_default`)
// that files a NULL-organization row into the creator's own organization.
// common-docs/policies/context-is-carried-never-rebuilt.md.
//
// Honest states: no organization selected → `OrganizationContextNotice`;
// create refused → the refusal in the person's words; otherwise the form.

import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";

import { createAgentFromSeed } from "@/lib/agents/actions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { BLANK_AGENT_SEED } from "@ai-matrx/chat/agents/constants/blank-agent";
import { Loader2 } from "lucide-react";
import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export function CreateManualAgentClient() {
  const organizationId = useAppSelector(selectOrganizationId);
  // 🚨 THE FOURTH STATE IS NOT THE REFUSAL (R37): `orgBootstrapResolved` is
  // TRUE after a FAILED read too, so this page used to ask for a pick nobody
  // had checked was needed.
  const { organizationState } = useOrganizationRequired();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  // One create per submit sequence: a double click or Enter-repeat must not
  // insert twice. Reset only when the create is refused.
  const inFlight = useRef(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    const trimmedName = name.trim();
    const seed = {
      ...BLANK_AGENT_SEED,
      name: trimmedName || BLANK_AGENT_SEED.name,
      messages: [
        {
          role: "system" as const,
          content: [{ type: "text" as const, text: instructions }],
        },
      ],
    };
    void createAgentFromSeed(seed, organizationId).catch((err: unknown) => {
      // A successful create ends in `redirect()`, which Next turns into a
      // navigation rather than a value — anything that lands here is a real
      // refusal, and the person reads it instead of an empty screen.
      inFlight.current = false;
      setSaving(false);
      setError(
        err instanceof Error
          ? err.message
          : "The agent could not be created just now.",
      );
    });
  };

  if (organizationState === "required" || organizationState === "unavailable") {
    return (
      <OrganizationContextNotice
        state={organizationState}
        what="A new agent"
        description="An agent belongs to one organization, and none is selected for this session, so nothing was created. Pick the organization you are working in and the agent will be created there."
      />
    );
  }

  const errorPanel = error ? (
    <div className="flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="type-title text-foreground">The agent was not created</p>
        <p className="mt-1 type-body text-muted-foreground">
          {error} <ErrorAlchemyMenu error={error} />
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex h-full items-start justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-xl space-y-4">
        {errorPanel}
        <div className="space-y-1.5">
          <label
            htmlFor="new-agent-name"
            className="type-label text-foreground"
          >
            Name
          </label>
          <input
            id="new-agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Agent"
            autoFocus
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-agent-instructions"
            className="type-label text-foreground"
          >
            Instructions
          </label>
          <ProTextarea
            id="new-agent-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create agent
        </button>
      </form>
    </div>
  );
}

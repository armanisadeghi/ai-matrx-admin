"use client";

// features/education/create/EducationCreatePage.tsx
//
// THE page shape of every Education Create screen (owner, 2026-09-27: "Create ·
// Choose source options, style options, and other details · Get results"):
//
//   1. Sources         — the one Source input (a deck via Use existing, a topic
//                        via the Topic tile)
//   2. Style and details — the tool's own controls (children)
//   3. Make            — the metered, COPPA-gated run
//
// THE one shell: flashcards (`CreateDeckPage`), quizzes and practice tests
// (`AssessmentCreate`), oral practice (`PracticeSetup`), mind maps, memory aids
// and audio study all render it. It holds, once: the drop notice for picks that
// can no longer be read, the Source input, the restored-style notice, the Make
// step (blocked reason, hold for the clean version, error, meter, Cancel, the
// AI job mark) and the tab-bound run (stopped notice → Try again, never a
// duplicate — `useCreateRun`). The page owns its style controls and its run.
// React Compiler is on: no manual memo.

import { useEffect, useEffectEvent, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { cn } from "@/lib/utils";
import { EntitlementMeter } from "@/features/entitlements/components/EntitlementMeter";
import type { Capability } from "@/features/entitlements/registry";
import { IntelligenceIndicator } from "@/features/mandates/feature-intelligence/IntelligenceIndicator";
import { EducationToolHeader } from "@/features/education/components/EducationToolHeader";
import { CreateStep } from "@/features/education/components/CreateStep";
import { SourceInput } from "@/features/resource-manager/source-input/components/SourceInput";
import {
  ASSISTANT_MESSAGE_COLUMN_CLASS,
  ASSISTANT_MESSAGE_COLUMN_INSET_CLASS,
} from "@ai-matrx/chat/agents/components/shared/assistant-message-layout";
import { useSuppressAmbientAssistant } from "@ai-matrx/chat/agents/components/ambient-assistant/ambientAssistantSuppression";
import { WizardDraftRestored } from "@/lib/wizard-draft/WizardDraftRestored";
import { RunStoppedNotice } from "@/lib/wizard-draft/RunStoppedNotice";
import type { SourceInputKindId } from "@/features/resource-manager/source-input/sourceKinds";
import type { UseWizardDraftResult } from "@/lib/wizard-draft/useWizardDraft";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { SourceDelivery } from "@ai-matrx/agents/sources/runtime";
import type { EducationSources } from "./useEducationSources";
import type { CreateRun } from "./useCreateRun";

export interface EducationCreatePageProps {
  /** The tool's name in the shell header ("New mind map"). */
  title: string;
  /** The tool's home — Back, Cancel and "Check your …" go here. */
  backHref: string;
  /**
   * Inside a host that is not its own page (a Board tile, a route that already
   * carries the shell header): no shell header or its offset, no Cancel.
   */
  embedded?: boolean;
  /** Above the steps (a way-in switch, a mode's own line). */
  lead?: ReactNode;
  /** Shown INSTEAD of the three steps (flashcards' Import a deck file). */
  alternate?: ReactNode;
  /** Step 1's title (default "What should it come from?"). */
  sourcesTitle?: string;
  /** Which Add new tiles this screen offers; omit for all. */
  kinds?: readonly SourceInputKindId[];
  /** The Source input's key on this page — picks are held and kept under it. */
  surfaceKey: string;
  /** What the Sources are for, in the person's words ("your mind map"). */
  purpose: string;
  /** How the AI may get a Source; omit for both. */
  deliveries?: readonly SourceDelivery[];
  /**
   * Kinds Use existing offers on this screen beyond the approved nine — always
   * explicit (`STUDY_FROM_DECK_KINDS` / `NO_EXTRA_KINDS`), never a default.
   */
  extraKinds: readonly string[];
  sources: EducationSources;
  /** The tool's Style and details controls. */
  children: ReactNode;
  /** Saved style answers, to say they were put back. */
  styleDraft?: UseWizardDraftResult<object>;
  /** Empty the style fields (the layout drops the draft). */
  onStartFresh?: () => void;
  make: {
    /** Step 3's title (default "Make it"). */
    title?: string;
    /** The button ("Make the mind map"). */
    label: string;
    /** While it runs ("Mapping your material…"). */
    busyLabel: string;
    icon: ReactNode;
    busy: boolean;
    /** What shows while it runs (a live stream); default the busy line. */
    running?: ReactNode;
    /** A check before the run (the limit) is under way: the button spins. */
    checking?: boolean;
    /** The run, once the page has checked everything else (it holds for the clean version itself). */
    onMake: () => void;
    /** Lines above the summary (a made-but-unopened result, an organization hold). */
    notices?: ReactNode;
    /** A reason beyond the Sources (e.g. a limit still loading). */
    extraBlockedReason?: string | null;
    /** The one line above the button when nothing blocks. */
    summary: string;
    error?: string | null;
    capability: Capability;
    /** The AI jobs behind Make; omit for none. */
    mandates?: { feature: string; keys: readonly AnyMandateKey[] };
    /** `<coppa.Gate />` and `<gen.Paywall />` — mounted for the page's whole life. */
    gates: ReactNode;
    operation: string;
    /** The meter shows every window (default) or only the binding one. */
    meterAllWindows?: boolean;
  };
  /** The tab-bound run (`useCreateRun`) and how its notice names it. */
  run?: {
    state: CreateRun;
    /** "Making 10 cards" — the notice adds "stopped when the page closed." */
    stoppedLabel: string;
    /** "your deck" — "The page closed while saving your deck." */
    savingWhat: string;
    /** "Your decks" — the button that opens the tool's home. */
    listLabel: string;
  };
}

export function EducationCreatePage({
  title,
  backHref,
  surfaceKey,
  purpose,
  deliveries,
  extraKinds,
  embedded = false,
  lead,
  alternate,
  sourcesTitle = "What should it come from?",
  kinds,
  sources,
  children,
  styleDraft,
  onStartFresh,
  make,
  run,
}: EducationCreatePageProps) {
  const router = useRouter();
  const [isLeaving, startLeaving] = useTransition();
  // A form page: the floating ask-anything bar must not sit on its fields.
  useSuppressAmbientAssistant(true);

  const blockedReason = sources.blockedReason ?? make.extraBlockedReason ?? null;
  const canMake = !blockedReason && !make.busy && !make.checking && !sources.holding;
  const waiting = sources.waitingForClean;
  const leave = () => startLeaving(() => router.push(backHref));

  // Try again put the stopped request back: press Make once the page can start.
  const runState = run?.state ?? null;
  const redoPending = runState?.redoPending ?? false;
  const fireRedo = useEffectEvent(() => {
    runState?.clearRedo();
    make.onMake();
  });
  useEffect(() => {
    if (redoPending && canMake) fireRedo();
  }, [redoPending, canMake]);
  const stopped = runState?.stopped ?? null;

  return (
    <>
      {embedded ? null : <EducationToolHeader title={title} backHref={backHref} />}
      <div className="min-h-full w-full bg-textured">
        <div
          className={cn(
            ASSISTANT_MESSAGE_COLUMN_CLASS,
            ASSISTANT_MESSAGE_COLUMN_INSET_CLASS,
            "matrx-touch-targets flex flex-col gap-4 pb-safe sm:gap-5",
            embedded ? "pt-3" : "pt-[var(--shell-header-h)]",
          )}
        >
          {lead}
          {alternate ?? (
          <>
          <CreateStep n={1} title={sourcesTitle}>
            {sources.dropNotice ? (
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1">{sources.dropNotice}</span>
                <Button type="button" variant="quiet" onClick={sources.dismissDropNotice}>
                  Dismiss
                </Button>
              </p>
            ) : null}
            <SourceInput
              surfaceKey={surfaceKey}
              title="Sources"
              purpose={purpose}
              required={!sources.optional}
              attachTo={undefined}
              kinds={kinds}
              deliveries={deliveries}
              extraKinds={extraKinds}
              marks={sources.marks}
            />
          </CreateStep>

          <CreateStep n={2} title="Style and details">
            <div className="flex flex-col gap-4">
              {styleDraft?.didRestore ? (
                <WizardDraftRestored
                  what="your style and details"
                  onDismiss={styleDraft.acknowledge}
                  onStartFresh={() => {
                    styleDraft.discard();
                    onStartFresh?.();
                  }}
                />
              ) : null}
              {children}
            </div>
          </CreateStep>

          <CreateStep n={3} title={make.title ?? "Make it"}>
            {make.busy ? (
              (make.running ?? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm font-medium text-foreground">{make.busyLabel}</p>
                </div>
              ))
            ) : sources.holding ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <p className="flex items-start gap-2 text-sm text-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Waiting for the clean version of {waiting.map((s) => `“${s.draft.label}”`).join(", ")} — it starts
                    by itself.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      sources.setHolding(false);
                      make.onMake();
                    }}
                  >
                    Start now with what is ready
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => sources.setHolding(false)}>
                    Stop waiting
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {make.notices}
                {run && stopped?.whileSaving ? (
                  // The save had been sent and may have landed: never redo it blind.
                  <RunStoppedNotice
                    message={`The page closed while saving ${run.savingWhat}. Check ${run.listLabel.toLowerCase()}.`}
                    redoLabel={run.listLabel}
                    redoIcon={ArrowRight}
                    onRedo={() => {
                      run.state.dismiss();
                      leave();
                    }}
                    onDismiss={run.state.dismiss}
                  />
                ) : run && stopped ? (
                  <RunStoppedNotice
                    message={`${run.stoppedLabel} stopped when the page closed.`}
                    onRedo={run.state.redo}
                    onDismiss={run.state.dismiss}
                  />
                ) : null}
                {make.error ? (
                  <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{make.error}</span>
                    <ErrorAlchemyMenu error={make.error} operation={make.operation} />
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">{blockedReason ?? make.summary}</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <EntitlementMeter
                    capability={make.capability}
                    showAllWindows={make.meterAllWindows ?? true}
                    className="mr-auto"
                  />
                  {embedded ? null : (
                    <Button type="button" variant="quiet" onClick={leave} disabled={isLeaving}>
                      Cancel
                    </Button>
                  )}
                  {make.mandates ? (
                    <IntelligenceIndicator
                      feature={make.mandates.feature}
                      mandateKeys={make.mandates.keys}
                      label={`The AI ${make.mandates.keys.length === 1 ? "job" : "jobs"} behind ${make.label}`}
                    />
                  ) : null}
                  <Button
                    variant="primary"
                    type="button"
                    disabled={!canMake}
                    onClick={make.onMake}
                    icon={make.checking ? <Loader2 className="animate-spin" /> : make.icon}
                  >
                    {make.label}
                  </Button>
                </div>
              </div>
            )}
          </CreateStep>
          </>
          )}
        </div>
      </div>
      {/* The run's dialogs (COPPA, paywall) stay mounted through the run. */}
      {make.gates}
    </>
  );
}

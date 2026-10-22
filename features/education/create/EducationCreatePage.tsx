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
// Same steps as `CreateDeckPage` (flashcards); mind maps, memory aids and audio
// study render this instead of three copies. The page owns its style state and
// its run; this owns the shape. React Compiler is on: no manual memo.

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Loader2 } from "lucide-react";
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
import type { UseWizardDraftResult } from "@/lib/wizard-draft/useWizardDraft";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { SourceDelivery } from "@ai-matrx/agents/sources/runtime";
import type { EducationSources } from "./useEducationSources";

export interface EducationCreatePageProps {
  /** The tool's name in the shell header ("New mind map"). */
  title: string;
  /** The tool's home — Back and Cancel go here. */
  backHref: string;
  /** The Source input's key on this page — picks are held and kept under it. */
  surfaceKey: string;
  /** What the Sources are for, in the person's words ("your mind map"). */
  purpose: string;
  /** How the AI may get a Source; omit for both. */
  deliveries?: readonly SourceDelivery[];
  sources: EducationSources;
  /** The tool's Style and details controls. */
  children: ReactNode;
  /** Saved style answers, to say they were put back. */
  styleDraft?: UseWizardDraftResult<object>;
  /** Empty the style fields (the layout drops the draft). */
  onStartFresh?: () => void;
  make: {
    /** The button ("Make the mind map"). */
    label: string;
    /** While it runs ("Mapping your material…"). */
    busyLabel: string;
    icon: ReactNode;
    busy: boolean;
    /** The run, once the page has checked everything else. */
    onMake: () => void;
    /** A reason beyond the Sources (e.g. a limit still loading). */
    extraBlockedReason?: string | null;
    /** The one line above the button when nothing blocks. */
    summary: string;
    error?: string | null;
    capability: Capability;
    /** The AI jobs behind Make; omit for none. */
    mandates?: { feature: string; keys: readonly AnyMandateKey[] };
    /** `<coppa.Gate />` and `<gen.Paywall />`. */
    gates: ReactNode;
    operation: string;
  };
}

export function EducationCreatePage({
  title,
  backHref,
  surfaceKey,
  purpose,
  deliveries,
  sources,
  children,
  styleDraft,
  onStartFresh,
  make,
}: EducationCreatePageProps) {
  const router = useRouter();
  // A form page: the floating ask-anything bar must not sit on its fields.
  useSuppressAmbientAssistant(true);

  const blockedReason = sources.blockedReason ?? make.extraBlockedReason ?? null;
  const canMake = !blockedReason && !make.busy && !sources.holding;
  const waiting = sources.waitingForClean;

  return (
    <>
      <EducationToolHeader title={title} backHref={backHref} />
      <div className="min-h-full w-full bg-textured">
        <div
          className={cn(
            ASSISTANT_MESSAGE_COLUMN_CLASS,
            ASSISTANT_MESSAGE_COLUMN_INSET_CLASS,
            "matrx-touch-targets flex flex-col gap-4 pb-safe pt-[var(--shell-header-h)] sm:gap-5",
          )}
        >
          <CreateStep n={1} title="What should it come from?">
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
              required
              attachTo={undefined}
              deliveries={deliveries}
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

          <CreateStep n={3} title="Make it">
            {make.busy ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm font-medium text-foreground">{make.busyLabel}</p>
              </div>
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
                {make.error ? (
                  <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{make.error}</span>
                    <ErrorAlchemyMenu error={make.error} operation={make.operation} />
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">{blockedReason ?? make.summary}</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {make.gates}
                  <EntitlementMeter capability={make.capability} showAllWindows className="mr-auto" />
                  <Button type="button" variant="quiet" onClick={() => router.push(backHref)}>
                    Cancel
                  </Button>
                  {make.mandates ? (
                    <IntelligenceIndicator
                      feature={make.mandates.feature}
                      mandateKeys={make.mandates.keys}
                      label={`The AI job behind ${make.label}`}
                    />
                  ) : null}
                  <Button variant="primary" type="button" disabled={!canMake} onClick={make.onMake} icon={make.icon}>
                    {make.label}
                  </Button>
                </div>
              </div>
            )}
          </CreateStep>
        </div>
      </div>
    </>
  );
}

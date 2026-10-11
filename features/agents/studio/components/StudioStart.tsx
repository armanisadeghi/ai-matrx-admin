"use client";

/**
 * The Studio's start screen: one card per way in (`STUDIO_MODES`). "Describe it" opens its box
 * here and starts an Agent Factory build through the `studio` door (always the factory, no knob);
 * "Just do it with me" opens the workspace with the doer; the rest announce tracked promises.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ExamplesField, filledExamples } from "@/features/agents/factory/components/ExamplesField";
import { startAgentBuild } from "@/features/agents/factory/service";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { announceComingSoon } from "@/lib/coming-soon/announce";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { STUDIO_MODES, type StudioMode } from "../modes";
import { buildNameFrom, type StudioState } from "../studio-state";

interface StudioStartProps {
  onStart: (patch: Partial<StudioState>) => void;
  onBack: () => void;
  /** A System Builder step's job: "Describe it" opens prefilled with it. */
  initialJob?: string;
  /** The "from plan … step n" back-link, when opened from a plan. */
  planLink?: React.ReactNode;
}

export function StudioStart({ onStart, onBack, initialJob = "", planLink }: StudioStartProps) {
  const router = useRouter();
  const [open, setOpen] = useState<StudioMode["id"] | null>(initialJob ? "describe" : null);
  const [description, setDescription] = useState(initialJob);
  // Build-first: examples are optional, so none are asked for up front — one quiet
  // "Add a real example" opens the shared field with a single box.
  const [examples, setExamples] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  const pick = (mode: StudioMode) => {
    if (mode.comingSoonId) {
      void announceComingSoon(mode.comingSoonId);
      return;
    }
    if (mode.href) {
      router.push(mode.href);
      return;
    }
    if (mode.id === "describe") {
      setOpen("describe");
      return;
    }
    onStart({ mode: mode.id });
  };

  const build = async () => {
    const purpose = description.trim();
    if (!purpose) return;
    setStarting(true);
    try {
      const given = filledExamples(examples);
      const buildId = await startAgentBuild({
        spec: {
          name: buildNameFrom(purpose),
          purpose,
          ...(given.length > 0 ? { sample_inputs: JSON.stringify(given) } : {}),
        },
        door: "studio",
        organizationId: await ensureOrgId(null),
      });
      onStart({ mode: "describe", buildId });
    } catch (e) {
      toast.error("The build did not start", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 pb-6 pt-[var(--shell-header-h)] sm:px-6">
        <div className="flex items-center gap-2">
          <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />
          <h1 className="text-lg font-semibold text-foreground">Agent Studio</h1>
          {planLink}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-testid="studio-modes">
          {STUDIO_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                data-clickable
                data-testid={`studio-mode-${mode.id}`}
                onClick={() => pick(mode)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-card p-4 text-left",
                  open === mode.id ? "border-primary" : "border-border",
                  mode.comingSoonId && "opacity-70",
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{mode.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {mode.comingSoonId ? "Coming soon" : mode.line}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {open === "describe" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4" data-testid="studio-describe">
            <ProTextarea
              aria-label="What should the agent do?"
              placeholder="What should the agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minHeight={96}
              autoGrow
            />
            {examples.length > 0 && <ExamplesField examples={examples} onChange={setExamples} disabled={starting} />}
            <div className="flex items-center justify-between gap-2">
              {examples.length === 0 ? (
                <Button
                  variant="quiet"
                  icon={<Plus />}
                  data-testid="studio-add-example"
                  onClick={() => setExamples([""])}
                  disabled={starting}
                >
                  Add a real example
                </Button>
              ) : (
                <span />
              )}
              <Button variant="primary" onClick={() => void build()} disabled={!description.trim() || starting}>
                {starting ? "Starting…" : "Build it"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * The Studio's start screen — a front door (STYLE-GUIDE "Two kinds of screen"), not a form.
 *
 * Champions (Phase 3a): Claude and ChatGPT's new-chat composer (one big box is the whole page),
 * v0 and Lovable (the prompt is the hero, the ways in are a quiet row under it), Linear's
 * onboarding (calm, dense, nothing extra). So: one `type-display` question, the `hero` composer
 * open on "Describe it" by default, the ways in (`STUDIO_MODES`) as one row of toggles under it,
 * and the person's own recent agents below (each opens "Improve an agent I have" on it).
 *
 * "Describe it" starts an Agent Factory build through the `studio` door (always the factory, no
 * knob); "Just do it with me" opens the workspace with the doer; "Improve an agent I have" picks
 * one of the person's editable agents with THE agent picker; "From examples I already have" opens
 * the examples box (`ExamplesStart`); bring-over modes are their own pages.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronDown, Plus } from "lucide-react";
import { AgentListDropdown, useAgentListCore } from "@ai-matrx/agents/catalog/react";
import { Button, RegionSkeleton, Tile } from "@ai-matrx/design-system/controls";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ExamplesField, filledExamples } from "@/features/agents/factory/components/ExamplesField";
import { startAgentBuild } from "@/features/agents/factory/service";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { toast } from "@/lib/toast";
import { STUDIO_MODES, type StudioMode } from "../modes";
import { buildNameFrom, type StudioState } from "../studio-state";
import { canEditAgent } from "../improve";
import { editedLine, recentAgents, RECENT_AGENTS_SHOWN } from "../recent-agents";
import { ExamplesStart } from "./ExamplesStart";
import stage from "./StudioStart.module.css";

type OpenMode = "describe" | "improve" | "from-examples";

/** The ways in that open here (the rest navigate). */
const opensInPlace = (mode: StudioMode): mode is StudioMode & { id: OpenMode } =>
  !mode.href && !mode.comingSoonId && (mode.id === "describe" || mode.id === "improve" || mode.id === "from-examples");

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
  const [open, setOpen] = useState<OpenMode>("describe");
  const [description, setDescription] = useState(initialJob);
  // Build-first: examples are optional, so none are asked for up front — one quiet
  // "Add a real example" opens the shared field with a single box.
  const [examples, setExamples] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const openMode = STUDIO_MODES.find((m) => m.id === open)!;

  const pick = (mode: StudioMode) => {
    if (mode.comingSoonId) {
      void announceComingSoon(mode.comingSoonId);
      return;
    }
    if (mode.href) {
      router.push(mode.href);
      return;
    }
    if (opensInPlace(mode)) {
      setOpen(mode.id);
      return;
    }
    onStart({ mode: mode.id });
  };

  const build = async () => {
    const purpose = description.trim();
    if (!purpose || starting) return;
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
    <div className="relative h-full overflow-y-auto bg-textured" data-matrx-page-scroll>
      <div className={stage.stage} aria-hidden>
        <div className={stage.glowA} />
        <div className={stage.glowB} />
      </div>
      <div className="relative z-[1] mx-auto flex w-full max-w-5xl flex-col px-4 pt-[var(--shell-header-h)] sm:px-6">
        <div className="flex h-10 items-center gap-2">
          <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />
          <span className="type-title text-foreground">Agent Studio</span>
          {planLink}
        </div>

        <main className="mx-auto flex w-full max-w-[48rem] flex-col items-stretch pt-[clamp(1.5rem,9vh,6rem)]">
          <h1 key={`h-${open}`} className={`type-display ${stage.enter} text-center text-foreground`} data-testid="studio-headline">
            {openMode.headline ?? openMode.title}
          </h1>

          {/* The open way in. Its slot keeps the composer's height, so a switch never moves the row below. */}
          <div key={`p-${open}`} className={`${stage.enter} mt-8 flex min-h-[11.5rem] flex-col`}>
            {open === "describe" && (
              <div className="flex flex-col gap-3" data-testid="studio-describe">
                <ProTextarea
                  appearance="hero"
                  aria-label="What should the agent do?"
                  placeholder="Turn a messy client intake call into a one-page brief…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minHeight={184}
                  maxHeight={360}
                  autoGrow
                  autoFocus={!initialJob}
                  surfaceName="agent-studio:start"
                  onSubmit={() => void build()}
                  submitLabel="Build it"
                  submitDisabled={!description.trim()}
                  isSubmitting={starting}
                  submitOnCmdEnter
                  leading={
                    examples.length === 0 ? (
                      <Button
                        variant="quiet"
                        icon={<Plus />}
                        data-testid="studio-add-example"
                        onClick={() => setExamples([""])}
                        disabled={starting}
                      >
                        Add a real example
                      </Button>
                    ) : null
                  }
                />
                {examples.length > 0 && <ExamplesField examples={examples} onChange={setExamples} disabled={starting} />}
              </div>
            )}
            {open === "improve" && (
              <div className="flex flex-1 flex-col items-center justify-center" data-testid="studio-improve">
                <AgentListDropdown
                  consumerId="agent-studio-improve"
                  onSelect={(agentId: string) => {
                    if (agentId) onStart({ mode: "improve", agentId });
                  }}
                  label="Choose one of your agents"
                  visibleTabs={["mine", "shared"]}
                  agentFilter={{ label: "You can edit", test: canEditAgent }}
                  triggerSlot={
                    <Button hero variant="outline" iconEnd={<ChevronDown />}>
                      Choose one of your agents
                    </Button>
                  }
                />
              </div>
            )}
            {open === "from-examples" && <ExamplesStart onStart={onStart} />}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center" role="group" aria-label="Ways to start" data-testid="studio-modes">
            {STUDIO_MODES.map((mode) => {
              const Icon = mode.icon;
              const inPlace = opensInPlace(mode);
              return (
                <Button
                  key={mode.id}
                  variant="outline"
                  icon={<Icon />}
                  iconEnd={inPlace ? undefined : <ArrowUpRight />}
                  pressed={inPlace ? open === mode.id : undefined}
                  title={`${mode.title} — ${mode.comingSoonId ? "Coming soon" : mode.line}`}
                  data-testid={`studio-mode-${mode.id}`}
                  className="w-full sm:w-auto"
                  onClick={() => pick(mode)}
                >
                  {mode.label}
                </Button>
              );
            })}
          </div>

          <RecentAgents onPick={(agentId) => onStart({ mode: "improve", agentId })} />
        </main>
      </div>
    </div>
  );
}

/** The person's own recent agents — a press opens "Improve an agent I have" on it. Absent when none. */
function RecentAgents({ onPick }: { onPick: (agentId: string) => void }) {
  const { agents, isLoading } = useAgentListCore({ consumerId: "agent-studio-recent", visibleTabs: ["mine"] });
  const recent = recentAgents(agents);
  if (!isLoading && recent.length === 0) return null;
  return (
    <section className="mt-16 flex flex-col gap-2 pb-6" aria-label="Your recent agents" data-testid="studio-recent">
      <h2 className="type-label px-1">Recent</h2>
      {isLoading && recent.length === 0 ? (
        <RegionSkeleton shape="rows" count={RECENT_AGENTS_SHOWN / 2} twoLine aria-label="Loading your agents" />
      ) : (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {recent.map((a) => (
            <Tile
              key={a.id}
              variant="quiet"
              icon={<AGENT_ICON />}
              title={a.name}
              line={editedLine(a) ?? undefined}
              data-testid="studio-recent-agent"
              onClick={() => onPick(a.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

/**
 * The Studio's start screen — a front door (STYLE-GUIDE "Two kinds of screen"), not a form.
 *
 * Champions: Claude and ChatGPT's new chat (one big box is the page; the box's own button names its
 * action), v0 and Lovable (the prompt is the hero; starters fill the box), Linear's onboarding (calm,
 * one obvious step). So: the shared `StudioStage` (display question, living light), the ways in as one
 * row of plain verbs ABOVE the open panel — the row is navigation, the panel is content, so a panel
 * that grows (examples) only ever grows downward and the row never moves — then the open panel, then
 * "Keep working on" (the person's recent agents) or, for someone with none yet, starter jobs that fill
 * the box.
 *
 * "Describe it" starts an Agent Factory build through the `studio` door (always the factory, no knob);
 * "Do it together" opens the workspace with the doer; "Improve an agent" picks one of the person's
 * editable agents with THE agent picker (or, with none yet, says so and offers Describe it); "From my
 * examples" opens the examples box (`ExamplesStart`); the two bring-over ways in are their own pages.
 *
 * Every in-place panel stays mounted (hidden when closed), so text typed in one survives a switch;
 * the description is also kept for the tab's session, so leaving and coming back never loses it.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Hammer, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { AgentListDropdown, useAgentListCore } from "@ai-matrx/agents/catalog/react";
import { Button, RegionSkeleton, Tile } from "@ai-matrx/design-system/controls";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ExamplesField, filledExamples } from "@/features/agents/factory/components/ExamplesField";
import { startAgentBuild } from "@/features/agents/factory/service";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { toast } from "@/lib/toast";
import { STUDIO_MODES, STUDIO_STARTERS, type StudioMode } from "../modes";
import { buildNameFrom, type StudioState } from "../studio-state";
import { canEditAgent } from "../improve";
import { editedLine, recentAgents } from "../recent-agents";
import { ExamplesStart } from "./ExamplesStart";
import { StudioStage } from "./StudioStage";

type OpenMode = "describe" | "improve" | "from-examples";

/** The ways in that open here (the rest navigate). */
const opensInPlace = (mode: StudioMode): mode is StudioMode & { id: OpenMode } =>
  !mode.href && !mode.comingSoonId && (mode.id === "describe" || mode.id === "improve" || mode.id === "from-examples");

/** The description survives leaving the page for this tab's session (a way in that navigates, Back). */
export const STUDIO_DRAFT_KEY = "agent-studio:start:describe";

interface StudioStartProps {
  onStart: (patch: Partial<StudioState>) => void;
  onBack: () => void;
  /** An Orchestra Studio step's job: "Describe it" opens prefilled with it. */
  initialJob?: string;
  /** The "from plan … step n" back-link, when opened from a plan. */
  planLink?: React.ReactNode;
}

export function StudioStart({ onStart, onBack, initialJob = "", planLink }: StudioStartProps) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenMode>("describe");
  const [description, setDescriptionState] = useState(initialJob);
  // Build-first: examples are optional, so none are asked for up front — one quiet
  // "Add an example" opens the shared field with a single box.
  const [examples, setExamples] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  // The way in whose navigation is in flight: its chevron becomes a spinner, a second press is ignored.
  const [leaving, setLeaving] = useState<string | null>(null);
  const [navigating, startNavigation] = useTransition();
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const openMode = STUDIO_MODES.find((m) => m.id === open)!;
  const importModes = STUDIO_MODES.filter((m) => m.inImportMenu);
  const importing = navigating && importModes.some((m) => m.id === leaving);

  const { agents, isLoading } = useAgentListCore({ consumerId: "agent-studio-start", visibleTabs: ["mine", "shared"] });
  const recent = recentAgents(agents);
  const hasEditable = agents.some((a) => !a.isArchived && canEditAgent(a));

  const setDescription = (text: string) => {
    setDescriptionState(text);
    try {
      if (text.trim()) sessionStorage.setItem(STUDIO_DRAFT_KEY, text);
      else sessionStorage.removeItem(STUDIO_DRAFT_KEY);
    } catch {
      // Storage refused (private mode): the text still lives in the box for this visit.
    }
  };

  // Restore the session's draft after mount (never during render: the server has no session storage).
  useEffect(() => {
    if (initialJob) return;
    try {
      const kept = sessionStorage.getItem(STUDIO_DRAFT_KEY);
      if (kept) setDescriptionState(kept);
    } catch {
      // No storage: nothing to restore.
    }
  }, [initialJob]);

  const go = (id: string, move: () => void) => {
    if (leaving && navigating) return;
    setLeaving(id);
    startNavigation(move);
  };

  const pick = (mode: StudioMode) => {
    if (mode.comingSoonId) {
      void announceComingSoon(mode.comingSoonId);
      return;
    }
    if (mode.href) {
      const href = mode.href;
      go(mode.id, () => router.push(href));
      return;
    }
    if (opensInPlace(mode)) {
      setOpen(mode.id);
      return;
    }
    go(mode.id, () => onStart({ mode: mode.id }));
  };

  const fillStarter = (job: string) => {
    setOpen("describe");
    setDescription(job);
    requestAnimationFrame(() => {
      const box = boxRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(job.length, job.length);
    });
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
      setDescription("");
      onStart({ mode: "describe", buildId });
    } catch (e) {
      toast.error("The build did not start", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setStarting(false);
    }
  };

  return (
    <StudioStage headline={openMode.headline ?? openMode.title} headlineKey={`h-${open}`} onBack={onBack} aside={planLink}>
      <div
        className="mt-6 grid grid-cols-2 gap-2 @xl:flex @xl:justify-center"
        role="group"
        aria-label="Ways to start"
        data-testid="studio-modes"
      >
        {STUDIO_MODES.filter((m) => !m.inImportMenu).map((mode) => {
          const inPlace = opensInPlace(mode);
          const pending = !inPlace && leaving === mode.id && navigating;
          return (
            <Button
              key={mode.id}
              variant="outline"
              // An in-place way in is a toggle (only the open one is pressed). One that opens another
              // page is not a toggle: a quiet chevron says "goes somewhere", a spinner while it goes.
              iconEnd={inPlace ? undefined : pending ? <Spinner size="xs" label="Opening" /> : <ChevronRight />}
              pressed={inPlace && open === mode.id}
              aria-pressed={inPlace ? open === mode.id : undefined}
              aria-busy={pending || undefined}
              title={mode.comingSoonId ? `${mode.title} — Coming soon` : mode.line}
              data-testid={`studio-mode-${mode.id}`}
              onClick={() => pick(mode)}
            >
              {mode.label}
            </Button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              iconEnd={importing ? <Spinner size="xs" label="Opening" /> : <ChevronDown />}
              aria-busy={importing || undefined}
              className="col-span-2 @xl:col-span-1"
              data-testid="studio-mode-import"
              onPointerEnter={() => importModes.forEach((m) => m.href && router.prefetch(m.href))}
            >
              Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {importModes.map((mode) => (
              <DropdownMenuItem key={mode.id} onSelect={() => pick(mode)} data-testid={`studio-mode-${mode.id}`}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground">{mode.label}</span>
                  <span className="type-meta text-muted-foreground">{mode.line}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The open way in. Closed panels stay mounted (hidden) so what was typed in them survives. */}
      <div className="mt-6 flex flex-col">
        <div hidden={open !== "describe"} className={open === "describe" ? "flex flex-col gap-3" : undefined} data-testid="studio-describe">
          <ProTextarea
            ref={boxRef}
            appearance="hero"
            aria-label="What should the agent do?"
            placeholder="Turn a messy client intake call into a one-page brief…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minHeight={128}
            maxHeight={360}
            autoGrow
            autoFocus={!initialJob}
            surfaceName="agent-studio:start"
            onSubmit={() => void build()}
            submitLabel="Build agent"
            submitText="Build agent"
            submitIcon={<Hammer className="h-4 w-4" />}
            submitDisabled={!description.trim()}
            isSubmitting={starting}
            submitOnCmdEnter
            leading={
              examples.length === 0 ? (
                <Button variant="quiet" icon={<Plus />} data-testid="studio-add-example" onClick={() => setExamples([""])} disabled={starting}>
                  Add an example
                </Button>
              ) : null
            }
          />
          {examples.length > 0 && <ExamplesField examples={examples} onChange={setExamples} disabled={starting} />}
        </div>

        <div
          hidden={open !== "improve"}
          className={open === "improve" ? "flex min-h-32 flex-col items-center justify-center gap-3" : undefined}
          data-testid="studio-improve"
        >
          {isLoading && !hasEditable ? (
            <RegionSkeleton shape="rows" count={1} aria-label="Loading your agents" />
          ) : hasEditable ? (
            <AgentListDropdown
              consumerId="agent-studio-improve"
              onSelect={(agentId: string) => {
                if (agentId) go("improve", () => onStart({ mode: "improve", agentId }));
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
          ) : (
            <div className="flex flex-col items-center gap-3 text-center" data-testid="studio-improve-empty">
              <p className="type-body text-muted-foreground">You have no agents yet.</p>
              <Button variant="primary" onClick={() => setOpen("describe")} data-testid="studio-improve-describe">
                Describe one instead
              </Button>
            </div>
          )}
        </div>

        <div hidden={open !== "from-examples"}>
          <ExamplesStart onStart={onStart} />
        </div>
      </div>

      {isLoading && recent.length === 0 ? (
        <section className="mt-12 flex flex-col gap-2" aria-label="Loading your agents">
          <RegionSkeleton shape="rows" count={2} twoLine aria-label="Loading your agents" />
        </section>
      ) : recent.length > 0 ? (
        <section className="mt-12 flex flex-col gap-2" aria-label="Keep working on" data-testid="studio-recent">
          <h2 className="type-label px-1">Keep working on</h2>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {recent.map((a) => (
              <Tile
                key={a.id}
                variant="quiet"
                icon={<AGENT_ICON />}
                title={a.name}
                line={editedLine(a) ?? undefined}
                data-testid="studio-recent-agent"
                onClick={() => go(`agent:${a.id}`, () => onStart({ mode: "improve", agentId: a.id }))}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-12 flex flex-col gap-2" aria-label="Try one of these" data-testid="studio-starters">
          <h2 className="type-label px-1">Try one of these</h2>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {STUDIO_STARTERS.map((job) => (
              <Tile key={job} variant="quiet" icon={<Plus />} title={job} data-testid="studio-starter" onClick={() => fillStarter(job)} />
            ))}
          </div>
        </section>
      )}
    </StudioStage>
  );
}

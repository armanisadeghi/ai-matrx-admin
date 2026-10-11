"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { Badge, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setMode } from "@/styles/themes/themeSlice";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import {
  useKindSandboxCeilings,
  type KindSandboxSettings,
} from "@/features/content-ir/react/db-component/useKindSandboxKnob";
import { PLAYGROUND_DEMOS } from "./demos";
import type { CheckStatus } from "./demo-health";
import { PlaygroundDemoCard, VERDICT_TONE, type RenderMode } from "./PlaygroundDemoCard";

/**
 * The Shape Playground: every capability a shape component has, as real demo
 * shapes rendered through the same compile + frame path stored components use,
 * each judging itself live.
 */
export default function PlaygroundClient() {
  const dispatch = useAppDispatch();
  const theme = useThemeMode();
  const [mode, setRenderMode] = React.useState<RenderMode>("frame");
  const [verdicts, setVerdicts] = React.useState<Record<string, CheckStatus>>({});
  const onVerdict = (slug: string, verdict: CheckStatus) =>
    setVerdicts((prev) => (prev[slug] === verdict ? prev : { ...prev, [slug]: verdict }));

  const { ceilings, refusal } = useKindSandboxCeilings();
  const frameSandbox: KindSandboxSettings | null = ceilings
    ? { enabled: true, ceilings, refusal: null }
    : null;

  const counts = { pass: 0, fail: 0, pending: 0, na: 0 };
  for (const demo of PLAYGROUND_DEMOS) counts[verdicts[demo.slug] ?? "pending"] += 1;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="sticky top-[var(--shell-header-h)] z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/95 p-2 backdrop-blur"
        data-playground-summary
        data-pass={counts.pass}
        data-fail={counts.fail}
        data-pending={counts.pending}
      >
        <span className="text-sm font-semibold text-foreground">Shape Playground</span>
        <Badge tone={VERDICT_TONE.pass}>{counts.pass} pass</Badge>
        <Badge tone={counts.fail ? VERDICT_TONE.fail : "neutral"}>{counts.fail} fail</Badge>
        {counts.pending ? <Badge>{counts.pending} checking</Badge> : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SegmentedControl<RenderMode>
            aria-label="Render all"
            value={mode}
            onValueChange={setRenderMode}
            data={[
              { value: "frame", label: "Frame" },
              { value: "page", label: "In page" },
            ]}
          />
          <Button
            variant="outline"
            icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            onClick={() => {
              dispatch(setMode(theme === "dark" ? "light" : "dark"));
            }}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </div>
      {PLAYGROUND_DEMOS.map((demo) => (
        <PlaygroundDemoCard
          key={demo.slug}
          demo={demo}
          mode={mode}
          frameSandbox={frameSandbox}
          frameRefusal={refusal}
          onVerdict={onVerdict}
        />
      ))}
    </div>
  );
}

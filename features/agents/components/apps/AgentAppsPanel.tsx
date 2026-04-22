"use client";

/**
 * AgentAppsPanel — PLACEHOLDER
 *
 * Landing UI for `/agents/[id]/apps/`. The relationship between agents and
 * "apps" (custom_app_configs / custom_applet_configs) is not yet wired through
 * a single direct FK — applets reference agents via `compiled_recipe_id` →
 * recipe → agents. See `app/(a)/agents/[id]/apps/NOTES.md` for the open
 * questions the user still needs to resolve before this page can light up.
 */

import Link from "next/link";
import { Construction, ExternalLink, LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AgentAppsPanelProps {
  agentId: string;
  agentName: string;
}

export function AgentAppsPanel({ agentId, agentName }: AgentAppsPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <header className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Apps
          </div>
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {agentName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Custom apps and applets that run this agent under the hood.
          </p>
        </header>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="shrink-0 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 p-2">
              <Construction className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="text-sm font-semibold text-foreground">
                Under construction
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There isn&apos;t a direct agent → app FK yet. Apps (
                <span className="font-mono">custom_app_configs</span>) contain
                applets (
                <span className="font-mono">custom_applet_configs</span>) which
                point at compiled recipes — which in turn reference this agent.
                Wiring the landing page needs a decision on which of those
                surfaces we want to expose here, plus an RPC that returns the
                agent → app graph.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                See{" "}
                <span className="font-mono text-foreground">
                  app/(a)/agents/[id]/apps/NOTES.md
                </span>{" "}
                for the open questions before this panel can ship.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Counts — placeholder visuals so the layout feels complete */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PlaceholderCountCard
            label="Apps using this agent"
            icon={LayoutGrid}
          />
          <PlaceholderCountCard
            label="Applets powered by this agent"
            icon={Sparkles}
          />
          <PlaceholderCountCard
            label="Recipes referencing this agent"
            icon={Sparkles}
          />
        </section>

        {/* Links out to existing App Builder until this page has real data */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-semibold text-foreground">
              In the meantime
            </div>
            <p className="text-xs text-muted-foreground">
              You can manage apps and applets directly from the App Builder:
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/apps/app-builder/apps/list">
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Browse apps
                </Button>
              </Link>
              <Link href="/apps/app-builder/applets/list">
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Browse applets
                </Button>
              </Link>
              <Link href={`/agents/${agentId}`}>
                <Button size="sm" variant="ghost">
                  Back to agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlaceholderCountCard({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof LayoutGrid;
}) {
  return (
    <Card className="p-4 flex items-start gap-3 bg-muted/30 border-dashed">
      <div className="shrink-0 rounded-md bg-muted text-muted-foreground p-2">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        <div className="text-2xl font-semibold text-muted-foreground/60 leading-none mt-1">
          —
        </div>
        <p className="text-[11px] text-muted-foreground/80 mt-1.5">
          Needs a data source
        </p>
      </div>
    </Card>
  );
}

"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Folder,
  Globe,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAgentShortcuts } from "@/features/agent-shortcuts";

const SCOPE = "global" as const;

type Tile = {
  href: string;
  label: string;
  description: string;
  icon: typeof Folder;
  count: (counts: {
    shortcuts: number;
    categories: number;
    contentBlocks: number;
  }) => number;
};

const TILES: Tile[] = [
  {
    href: "/administration/agent-shortcuts/shortcuts",
    label: "Shortcuts",
    description:
      "Agent-backed triggers surfaced in menus, buttons, and keyboard hotkeys.",
    icon: Zap,
    count: (c) => c.shortcuts,
  },
  {
    href: "/administration/agent-shortcuts/categories",
    label: "Categories",
    description:
      "Organise shortcuts and content blocks by placement and hierarchy.",
    icon: Folder,
    count: (c) => c.categories,
  },
  {
    href: "/administration/agent-shortcuts/content-blocks",
    label: "Content Blocks",
    description:
      "Reusable text/template blocks insertable from the agent context menu.",
    icon: FileText,
    count: (c) => c.contentBlocks,
  },
];

export default function AgentShortcutsDashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  const { shortcuts, categories, contentBlocks, isLoading, refetch } =
    useAgentShortcuts({ scope: SCOPE });

  const counts = {
    shortcuts: shortcuts.length,
    categories: categories.length,
    contentBlocks: contentBlocks.length,
  };

  const activeShortcuts = shortcuts.filter((s) => s.isActive).length;
  const wiredShortcuts = shortcuts.filter((s) => s.agentId).length;

  const handleNavigate = (href: string) => {
    if (isPending) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Agent Shortcuts Admin
              </h1>
              <p className="text-sm text-muted-foreground">
                Managing{" "}
                <Badge variant="outline" className="ml-0.5 text-[11px]">
                  global
                </Badge>{" "}
                scope. Changes apply to every user on the platform.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{counts.shortcuts}</div>
                <div className="text-xs text-muted-foreground">Shortcuts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-primary">
                  {activeShortcuts}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-success">
                  {wiredShortcuts}
                </div>
                <div className="text-xs text-muted-foreground">
                  Wired to agent
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">
                  {counts.categories + counts.contentBlocks}
                </div>
                <div className="text-xs text-muted-foreground">
                  Categories + Blocks
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              const navigating = isPending && pendingHref === tile.href;
              return (
                <button
                  key={tile.href}
                  type="button"
                  onClick={() => handleNavigate(tile.href)}
                  disabled={isPending}
                  className="text-left group focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          {navigating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {tile.count(counts)}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-foreground font-medium group-hover:text-primary transition-colors">
                          {tile.label}
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {tile.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1.5">
              <div className="font-medium text-foreground">
                About global-scope management
              </div>
              <p>
                Everything you create here is available to every user on the
                platform unless overridden by a user- or organization-scope
                entry. User and organization scopes are managed in separate
                routes — this page only writes global rows.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

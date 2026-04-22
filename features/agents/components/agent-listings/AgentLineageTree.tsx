"use client";

/**
 * AgentLineageTree
 *
 * Admin-only visualization of the "what came from this agent" tree. For each
 * root agent we show:
 *   - Derived agents (other agents whose `sourceAgentId` points here — the
 *     typical "promoted from user → system" linkage).
 *   - Shortcuts pointing at this agent (via `selectShortcutsByAgentId`).
 *   - Agent apps backed by this agent (fetched from `agent_apps`).
 *
 * Each row is a click-through into the matching admin editor. No write
 * operations happen here — this is a read-only map.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppWindow,
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Loader2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchAgentsListFull } from "@/features/agents/redux/agent-definition/thunks";
import {
  selectBuiltinAgents,
  selectLiveAgents,
} from "@/features/agents/redux/agent-definition/selectors";
import { useAgentShortcuts } from "@/features/agent-shortcuts";
import { selectShortcutsByAgentId } from "@/features/agents/redux/agent-shortcuts/selectors";
import type { RootState } from "@/lib/redux/store";
import type { AgentDefinitionRecord } from "@/features/agents/types/agent-definition.types";
import type { AgentShortcutRecord } from "@/features/agents/redux/agent-shortcuts/types";
import {
  fetchAgentAppsAdmin,
  type AgentAppAdminView,
} from "@/lib/services/agent-apps-admin-service";

const ADMIN_AGENT_BASE = "/administration/system-agents/agents";

export function AgentLineageTree() {
  const dispatch = useAppDispatch();
  const builtins = useAppSelector(selectBuiltinAgents);
  const allAgents = useAppSelector(selectLiveAgents);

  // Hydrate both shortcut scopes so selectShortcutsByAgentId returns everything
  // the admin should see (global + anything else visible via RLS).
  const globalQuery = useAgentShortcuts({ scope: "global" });
  const userQuery = useAgentShortcuts({ scope: "user" });

  const [apps, setApps] = useState<AgentAppAdminView[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchAgentsListFull());
    setAppsLoading(true);
    fetchAgentAppsAdmin({ limit: 500 })
      .then((rows) => setApps(rows))
      .catch(() => setApps([]))
      .finally(() => setAppsLoading(false));
  }, [dispatch]);

  // Group derived agents by their source id — fast lookup per root.
  const derivedBySource = useMemo(() => {
    const map = new Map<string, AgentDefinitionRecord[]>();
    for (const a of allAgents) {
      if (!a.sourceAgentId) continue;
      const list = map.get(a.sourceAgentId) ?? [];
      list.push(a);
      map.set(a.sourceAgentId, list);
    }
    return map;
  }, [allAgents]);

  // Same for apps.
  const appsByAgent = useMemo(() => {
    const map = new Map<string, AgentAppAdminView[]>();
    for (const app of apps) {
      if (!app.agent_id) continue;
      const list = map.get(app.agent_id) ?? [];
      list.push(app);
      map.set(app.agent_id, list);
    }
    return map;
  }, [apps]);

  const isShortcutsLoading = globalQuery.isLoading || userQuery.isLoading;

  if (builtins.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading system agents…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {builtins.map((agent) => (
        <LineageCard
          key={agent.id}
          agent={agent}
          derived={derivedBySource.get(agent.id) ?? []}
          apps={appsByAgent.get(agent.id) ?? []}
          appsLoading={appsLoading}
          shortcutsLoading={isShortcutsLoading}
        />
      ))}
    </div>
  );
}

function LineageCard({
  agent,
  derived,
  apps,
  appsLoading,
  shortcutsLoading,
}: {
  agent: AgentDefinitionRecord;
  derived: AgentDefinitionRecord[];
  apps: AgentAppAdminView[];
  appsLoading: boolean;
  shortcutsLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shortcuts = useAppSelector((state: RootState) =>
    selectShortcutsByAgentId(state, agent.id),
  );

  const totalRefs = derived.length + shortcuts.length + apps.length;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {agent.description ?? "No description"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <CountBadge
            count={derived.length}
            label="Derived"
            icon={GitBranch}
          />
          <CountBadge
            count={shortcuts.length}
            label="Shortcuts"
            icon={Zap}
            loading={shortcutsLoading}
          />
          <CountBadge
            count={apps.length}
            label="Apps"
            icon={AppWindow}
            loading={appsLoading}
          />
          <Link
            href={`${ADMIN_AGENT_BASE}/${agent.id}/build`}
            className="ml-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            aria-label="Open in builder"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          {totalRefs === 0 ? (
            <div className="text-xs text-muted-foreground px-1">
              Nothing references this agent yet.
            </div>
          ) : null}

          {derived.length > 0 && (
            <Section title="Derived agents" icon={GitBranch}>
              {derived.map((d) => (
                <LineageRow
                  key={d.id}
                  href={`${ADMIN_AGENT_BASE}/${d.id}`}
                  title={d.name}
                  subtitle={`${d.agentType} · updated ${formatDate(
                    d.updatedAt,
                  )}`}
                  badge={d.agentType === "builtin" ? "system" : "user"}
                />
              ))}
            </Section>
          )}

          {shortcuts.length > 0 && (
            <Section title="Shortcuts" icon={Zap}>
              {shortcuts.map((s) => (
                <LineageRow
                  key={s.id}
                  href={
                    isGlobalShortcut(s)
                      ? `/administration/system-agents/edit/${s.id}`
                      : `${ADMIN_AGENT_BASE}/${agent.id}/shortcuts/${s.id}`
                  }
                  title={s.label}
                  subtitle={s.description ?? ""}
                  badge={scopeBadge(s)}
                />
              ))}
            </Section>
          )}

          {apps.length > 0 && (
            <Section title="Agent apps" icon={AppWindow}>
              {apps.map((app) => (
                <LineageRow
                  key={app.id}
                  href={`/administration/agent-apps/edit/${app.id}`}
                  title={app.name}
                  subtitle={app.slug}
                  badge={app.user_id === null ? "system" : app.status}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof GitBranch;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function LineageRow({
  href,
  title,
  subtitle,
  badge,
}: {
  href: string;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        "bg-background hover:bg-accent/50 transition-colors",
        "border border-border/60",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{title}</div>
        {subtitle ? (
          <div className="text-[10px] text-muted-foreground truncate">
            {subtitle}
          </div>
        ) : null}
      </div>
      {badge ? (
        <Badge variant="outline" className="text-[9px] shrink-0">
          {badge}
        </Badge>
      ) : null}
      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
    </Link>
  );
}

function CountBadge({
  count,
  label,
  icon: Icon,
  loading,
}: {
  count: number;
  label: string;
  icon: typeof GitBranch;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
        count > 0
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/60 border border-border",
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {loading && count === 0 ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className="tabular-nums">{count}</span>
      )}
    </div>
  );
}

function isGlobalShortcut(s: AgentShortcutRecord): boolean {
  return (
    s.userId === null &&
    s.organizationId === null &&
    s.projectId === null &&
    s.taskId === null
  );
}

function scopeBadge(s: AgentShortcutRecord): string {
  if (isGlobalShortcut(s)) return "global";
  if (s.userId) return "user";
  if (s.organizationId) return "org";
  if (s.projectId) return "project";
  if (s.taskId) return "task";
  return "—";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

"use client";

import type { ReactNode } from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationDirectoryItem } from "./integration-directory";
import { NATIVE_ABILITY_LABELS, type IntegrationAbility } from "./provider-folds";

/**
 * One provider, several abilities: each ability is a titled section with its
 * own connect state, and the body is that ability's existing connect flow,
 * unchanged. Used when a provider's card holds more than one way to connect.
 */
export function AbilitySections({
  item,
  renderOwn,
  renderAbility,
}: {
  item: IntegrationDirectoryItem;
  renderOwn: () => ReactNode;
  renderAbility: (ability: IntegrationAbility) => ReactNode;
}) {
  const key = item.id.replace(/^native:/, "");
  const own = item.ownState;
  return (
    <div className="space-y-6">
      <Section
        title={NATIVE_ABILITY_LABELS[key] ?? item.name}
        state={own ? stateOf(own) : null}
      >
        {renderOwn()}
      </Section>
      {item.abilities?.map((ability) => (
        <Section
          key={ability.item.id}
          title={ability.label}
          state={stateOf(ability.item)}
        >
          {renderAbility(ability)}
        </Section>
      ))}
    </div>
  );
}

function stateOf(s: {
  connected: boolean;
  attention: boolean;
  saved: boolean;
  status: string;
}) {
  return {
    label: s.connected || s.attention || s.saved ? s.status : "Not connected",
    tone: s.attention ? "warning" : s.connected ? "success" : "muted",
  } as const;
}

function Section({
  title,
  state,
  children,
}: {
  title: string;
  state: ReturnType<typeof stateOf> | null;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
          {title}
        </h3>
        {state ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              state.tone === "success" && "bg-success/10 text-success",
              state.tone === "warning" && "bg-warning/10 text-warning",
              state.tone === "muted" && "bg-muted text-muted-foreground",
            )}
          >
            {state.tone === "success" ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : state.tone === "warning" ? (
              <AlertCircle className="h-3 w-3" aria-hidden />
            ) : null}
            {state.label}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

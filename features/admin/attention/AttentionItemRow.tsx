"use client";

/**
 * AttentionItemRow — ONE row of the attention dock, and the same row on the
 * review page. A row is a decision, not a title:
 *
 *   name (a door: open / new tab / peek)   state chip
 *   one honest sentence, ids openable (TextWithDoors — never a bare uuid)
 *   Where it shows: ⧉ page · ⧉ page        (or: hasn't said which pages it feeds)
 *   [Re-enable]  [Mute ▾]                  (or, muted: until … by … — [Unmute])
 *
 * Every door opens in a NEW TAB: this row lives in a floating card over work
 * in progress, and navigating the tab away is the data loss the new-tab door
 * exists to prevent. The record's name is an `EntityRef` with its controls
 * pinned visible (a floating card is a transient surface; hover-reveal on
 * touch is an invisible control that is still tappable).
 */

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  BellOff,
  ExternalLink,
  Info,
  Loader2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as SurfaceButton } from "@ai-matrx/design-system";
import { AppLink } from "@/components/navigation/AppLink";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { CopyForAiAction } from "./CopyForAiAction";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { TextWithDoors } from "@/components/official/entity-ref/TextWithDoors";
import { humanizeRelative } from "@/features/scheduling/utils/triggerHumanize";
import { cn } from "@/lib/utils";
import type { AttentionAction, AttentionItem } from "./types";

export interface AttentionItemRowProps {
  item: AttentionItem;
  /** The row is listed as MUTED: shows the mute and an Unmute instead of the menu. */
  muted?: boolean;
  onAction: (item: AttentionItem, action: AttentionAction) => Promise<void>;
  /** Kept for callers; muting goes through the one dialog (`onMuteWithNote`). */
  onMute?: (item: AttentionItem, ms: number) => Promise<void>;
  onMuteWithNote: (item: AttentionItem) => void;
  onUnmute: (item: AttentionItem) => Promise<void>;
}

export function AttentionItemRow({
  item,
  muted = false,
  onAction,
  onMuteWithNote,
  onUnmute,
}: AttentionItemRowProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const Icon = item.severity === "critical" ? AlertOctagon : item.severity === "info" ? Info : AlertTriangle;
  const severityText =
    item.severity === "critical"
      ? "text-destructive"
      : item.severity === "info"
        ? "text-muted-foreground"
        : "text-warning";
  const impactDoors = item.doors.filter((d) => d.kind === "impact");
  const evidenceDoors = item.doors.filter((d) => d.kind === "evidence");

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <li
      className={cn("flex flex-col gap-1 py-2", muted && "opacity-80")}
      data-testid="attention-row"
      data-attention-key={item.key}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", severityText)} aria-hidden />
        {item.record ? (
          <EntityRef
            token={item.record.token}
            id={item.record.id}
            name={item.title}
            href={item.record.href}
            openInNewTab
            alwaysShowActions
            labelClassName="font-medium text-foreground whitespace-normal break-words line-clamp-2"
          />
        ) : (
          <span className="line-clamp-2 break-words font-medium text-foreground">{item.title}</span>
        )}
        <span className={cn("text-[11px]", severityText)}>{item.state}</span>
        {item.copy && (
          <span className="ml-auto inline-flex items-center gap-1">
            <CopyButtons size="xs" label={item.copy.label} hide={["ai"]} human={item.copy.human} />
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground" data-testid="attention-sentence">
        <TextWithDoors text={item.sentence} defaultToken={item.record?.token ?? null} />
      </p>

      {item.about && (
        <p className="truncate text-[11px] text-muted-foreground/80" title={item.about}>
          {item.about}
        </p>
      )}

      {item.fix && (
        <p className="text-[11px] text-foreground" data-testid="attention-fix">
          <span className="text-muted-foreground">What to do: </span>
          {item.fix}
        </p>
      )}

      {(impactDoors.length > 0 || item.impactDeclared === false || evidenceDoors.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {impactDoors.length > 0 && (
            <span className="text-muted-foreground">Where it shows:</span>
          )}
          {impactDoors.map((door) => (
            <AppLink
              key={`${door.href}:${door.label}`}
              href={door.href}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              title={door.what ? `${door.label} — ${door.what}` : door.label}
              className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              {door.label}
            </AppLink>
          ))}
          {item.impactDeclared === false && (
            // Honest, and a nudge: the job's registration in aidream owns the
            // declaration (`register_system_task(..., impact=[...])`).
            <span className="text-muted-foreground">
              This job has not said which pages it feeds.
            </span>
          )}
          {evidenceDoors.map((door) => (
            <AppLink
              key={`${door.href}:${door.label}`}
              href={door.href}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              title={door.what ? `${door.label} — ${door.what}` : door.label}
              className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              {door.label}
            </AppLink>
          ))}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {!muted &&
          item.actions.map((action) => (
            <SurfaceButton
              key={action.id}
              size="sm"
              variant={action.variant ?? "outline"}
              className="h-7 text-xs"
              disabled={busy !== null}
              onClick={() => void run(action.id, () => onAction(item, action))}
            >
              {busy === action.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />}
              {action.label}
            </SurfaceButton>
          ))}

        {item.copy && <CopyForAiAction label={item.copy.label} agent={item.copy.agent} />}

        {item.mute === null ? null : muted && item.mute.current ? (
          <>
            <span className="text-[11px] text-muted-foreground" data-testid="attention-mute-state">
              Muted until {humanizeRelative(item.mute.current.until).replace(/^in /, "")} from now
              {item.mute.current.by ? ` by ${item.mute.current.by}` : ""}
              {item.mute.current.reason ? `: ${item.mute.current.reason}` : ""}
            </span>
            {item.mute.scope === "server" && (
              <Button variant="quiet" disabled={busy !== null} onClick={() => onMuteWithNote(item)} aria-label={`Change the mute on ${item.title}`}>
                Change
              </Button>
            )}
            {item.mute.clear && (
              <Button
                icon={busy === "unmute" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Volume2 aria-hidden />
                )}
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run("unmute", () => onUnmute(item))}
                aria-label={`Unmute ${item.title}`}
              >
                Unmute
              </Button>
            )}
          </>
        ) : (
          // ONE dialog: pick how long, add a note if you like (harsh walk: a note only on one duration).
          <Button
            icon={busy === "mute" ? <Loader2 className="animate-spin" aria-hidden /> : <BellOff aria-hidden />}
            variant="quiet"
            disabled={busy !== null}
            data-testid="attention-mute"
            onClick={() => onMuteWithNote(item)}
            aria-label={`Mute ${item.title} for a while`}
          >
            Mute
          </Button>
        )}
      </div>
    </li>
  );
}

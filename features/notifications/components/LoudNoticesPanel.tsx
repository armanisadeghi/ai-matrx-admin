"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { ProTextarea } from "@/components/official/ProTextarea";
import { countBySeverity, sortLoudNotices, type LoudNotice, type LoudSeverity } from "../loud/loudNotices";
import { verbsFor } from "../loud/targetVerbs";

export interface LoudNoticesPanelProps {
  /** Loud notices waiting for this person (not Done, not snoozed, not put off this session). */
  notices: LoudNotice[];
  onOpen: (notice: LoudNotice) => void;
  /** Done for this person only (the notice leaves their inbox). */
  onDone: (notice: LoudNotice) => void;
  /** The target's own Resolve (for everyone). Only offered when the target kind has one. */
  onResolve: (notice: LoudNotice, note: string) => void;
  /** The target's own Snooze (for everyone). Only offered when the target kind has one. */
  onSnooze: (notice: LoudNotice) => void;
  /** X, Escape, the backdrop or "Remind me later": hide for this browser session; nothing changes. */
  onLater: () => void;
}

/** Each severity has its own colour, icon and word, so no two read alike (colour is never the only cue). */
export const SEVERITY_STYLE: Record<LoudSeverity, { label: string; Icon: LucideIcon; card: string; text: string }> = {
  critical: { label: "Critical", Icon: OctagonAlert, card: "border-destructive/60 bg-destructive/10", text: "text-destructive" },
  warning: { label: "Needs a decision", Icon: AlertTriangle, card: "border-warning/50 bg-warning/10", text: "text-warning" },
  info: { label: "For your information", Icon: Info, card: "border-info/40 bg-info/10", text: "text-info" },
};

function summary(counts: Record<LoudSeverity, number>): string {
  const parts: string[] = [];
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.warning) parts.push(`${counts.warning} to decide`);
  if (counts.info) parts.push(`${counts.info} info`);
  return parts.join(", ");
}

/**
 * The notification centre's LOUD state (2026-10-10): loud notices open at sign-in over the page
 * (a modal adds no layout, so nothing shifts) and stay until handled. Every notice names what
 * happened and what to do, opens its own record, and offers its target's verbs (a spend alarm:
 * Resolve, Snooze 24h) plus Done and Copy for AI. "Remind me later" hides it for this session.
 */
export default function LoudNoticesPanel({ notices, onOpen, onDone, onResolve, onSnooze, onLater }: LoudNoticesPanelProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (notices.length === 0) setResolving(null);
  }, [notices.length]);

  const sorted = sortLoudNotices(notices);
  const counts = countBySeverity(sorted);
  const top: LoudSeverity = counts.critical ? "critical" : counts.warning ? "warning" : "info";
  const TopIcon = SEVERITY_STYLE[top].Icon;

  return (
    <Dialog open={notices.length > 0} onOpenChange={(open) => !open && onLater()}>
      <DialogContent data-testid="loud-notices" className={cn("max-w-2xl", top === "critical" && "border-destructive/60")}>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", SEVERITY_STYLE[top].text)}>
            <TopIcon className="h-5 w-5 shrink-0" aria-hidden />
            Needs your attention ({notices.length})
          </DialogTitle>
          <DialogDescription>{summary(counts)}</DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {sorted.map((n) => {
            const style = SEVERITY_STYLE[n.severity];
            const Icon = style.Icon;
            const verbs = verbsFor(n);
            const detail = verbs.detail ? verbs.detail(n) : n.body;
            const facts = verbs.facts ? verbs.facts(n) : [];
            const isResolving = resolving === n.id;
            return (
              <li key={n.id} data-testid={`loud-${n.id}`} data-severity={n.severity} className={cn("rounded-xl border p-3", style.card)}>
                <div className="flex items-start gap-3">
                  <Icon data-loud-icon={n.severity} className={cn("mt-0.5 h-5 w-5 shrink-0", style.text)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{n.subject ?? "Notice"}</p>
                    {detail ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p> : null}
                    <p className="mt-1 text-xs font-medium text-foreground">
                      <span className={style.text}>{style.label}</span>
                      {facts.length ? <span className="text-muted-foreground">{` · ${facts.join(" · ")}`}</span> : null}
                    </p>
                    {isResolving && verbs.resolve ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <ProTextarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Note (optional)"
                          surfaceName="loud-notice-resolve"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            type="button"
                            title={verbs.resolve.title}
                            onClick={() => {
                              onResolve(n, note.trim());
                              setResolving(null);
                              setNote("");
                            }}
                          >
                            Resolve for everyone
                          </Button>
                          <Button variant="quiet" type="button" title="Keep it open" onClick={() => setResolving(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        {n.deep_link ? (
                          <Button variant="primary" type="button" icon={<ArrowRight />} title="Open its record" onClick={() => onOpen(n)}>
                            Open
                          </Button>
                        ) : null}
                        {verbs.resolve ? (
                          <Button
                            variant="quiet"
                            type="button"
                            title={verbs.resolve.title}
                            onClick={() => {
                              setNote("");
                              setResolving(n.id);
                            }}
                          >
                            {verbs.resolve.label}
                          </Button>
                        ) : (
                          <Button variant="quiet" type="button" title="Done for you; it leaves your inbox" onClick={() => onDone(n)}>
                            Done
                          </Button>
                        )}
                        {verbs.snooze ? (
                          <Button variant="quiet" type="button" title={verbs.snooze.title} onClick={() => onSnooze(n)}>
                            {verbs.snooze.label}
                          </Button>
                        ) : null}
                        <CopyButtons
                          size="icon"
                          label="Notice"
                          className="ml-auto"
                          human={() =>
                            [n.subject, detail, ...facts, n.deep_link ? `${window.location.origin}${n.deep_link}` : null]
                              .filter(Boolean)
                              .join("\n")
                          }
                          agent={() => {
                            const own = verbs.agentCopy?.(n);
                            return {
                              kind: own?.kind ?? "notice",
                              location: "Loud notice",
                              description: "One notice from the sign-in notice panel.",
                              attributes: { severity: n.severity, event: n.event_key },
                              data: own?.data ?? { id: n.id, title: n.subject, body: n.body, link: n.deep_link },
                            };
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="h-9 items-center">
          <Button variant="quiet" type="button" title="Close for now; they return next visit" onClick={onLater}>
            Remind me later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

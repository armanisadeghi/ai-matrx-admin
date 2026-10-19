"use client";

// The sheet's footer bar — desktop only, thin, identical in every variant.
// Left: the save/sync status slot. Right: the Agent companion toggle, history, help.
import type { ReactNode } from "react";
import { CircleHelp, History, PanelRight, Webhook, X } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";

export interface SheetFooterProps {
  status?: ReactNode;
  companionOpen: boolean;
  onCompanionToggle: () => void;
  onHistory?: () => void;
  onHelp?: () => void;
  /** Medium form: the properties panel and the companion take turns; this brings properties back. */
  propertiesToggle?: { shown: boolean; onToggle: () => void };
}

export function SheetFooter({
  propertiesToggle,
  status,
  companionOpen,
  onCompanionToggle,
  onHistory,
  onHelp,
}: SheetFooterProps) {
  return (
    <footer className="mf-rule-t flex h-[var(--matrx-frame-footer-h)] shrink-0 items-center gap-1 pr-1 pl-3">
      <div className="type-meta flex min-w-0 flex-1 items-center gap-1.5 truncate text-muted-foreground">
        {status}
      </div>
      {propertiesToggle ? (
        <Button
          variant={propertiesToggle.shown ? "outline" : "quiet"}
          icon={<PanelRight />}
          aria-pressed={propertiesToggle.shown}
          onClick={propertiesToggle.onToggle}
        >
          Properties
        </Button>
      ) : null}
      <Button
        variant={companionOpen ? "outline" : "quiet"}
        icon={<Webhook />}
        aria-pressed={companionOpen}
        onClick={onCompanionToggle}
      >
        Agent
      </Button>
      <Button variant="quiet" icon={<History />} aria-label="History" onClick={onHistory} />
      <Button variant="quiet" icon={<CircleHelp />} aria-label="Help" onClick={onHelp} />
    </footer>
  );
}

/** STAND-IN: the companion chat that will live in the sheet's right side. */
export function CompanionPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mf-rule-b flex h-[var(--matrx-frame-tabs-h)] shrink-0 items-center gap-2 pr-1 pl-3">
        <Webhook className="size-4 text-muted-foreground" aria-hidden />
        <span className="type-title flex-1">Agent</span>
        <Button variant="quiet" icon={<X />} aria-label="Close agent" onClick={onClose} />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <EmptyState
          icon={<Webhook />}
          title="Companion placeholder"
          line="The page's agent chat will sit here"
        />
      </div>
    </div>
  );
}

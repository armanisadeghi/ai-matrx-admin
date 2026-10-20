"use client";

// The sheet's footer bar — desktop only, thin, identical in every variant.
// Left: the save/sync status slot (the page's). Right: Properties, history, help (the frame's).
import type { ReactNode } from "react";
import { CircleHelp, History, PanelRight } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

export interface SheetFooterProps {
  status?: ReactNode;
  onHistory?: () => void;
  onHelp?: () => void;
  /** Properties is shown or hidden from here; when the side chat or canvas took its room, this brings it back. */
  propertiesToggle?: { shown: boolean; onToggle: () => void };
}

export function SheetFooter({
  propertiesToggle,
  status,
  onHistory,
  onHelp,
}: SheetFooterProps) {
  return (
    <footer
      data-mf-owner="frame"
      data-mf-region="footer"
      className="mf-rule-t flex h-[var(--matrx-frame-footer-h)] shrink-0 items-center gap-1 pr-1 pl-3"
    >
      <div
        data-mf-owner="page"
        data-mf-region="status"
        className="type-meta flex min-w-0 flex-1 items-center gap-1.5 truncate text-muted-foreground"
      >
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
      <Button variant="quiet" icon={<History />} aria-label="History" onClick={onHistory} />
      <Button variant="quiet" icon={<CircleHelp />} aria-label="Help" onClick={onHelp} />
    </footer>
  );
}

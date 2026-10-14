"use client";

import * as React from "react";
import { SessionOfferPanel } from "@ai-matrx/chat/tool-call-visualization/renderers/session-offer/SessionOfferPanel";

type OfferView = React.ComponentProps<typeof SessionOfferPanel>["view"];

const child = (status: "running" | "waiting" | "done" | "failed" | "stopped") => ({
  id: "00000000-0000-4000-8000-000000000001",
  title: "Draft the launch email",
  status,
  offerId: "demo-offer",
  createdAt: null,
});

const started = (status: Parameters<typeof child>[0]): OfferView => ({
  phase: "started",
  child: child(status),
  conversationId: "00000000-0000-4000-8000-000000000001",
});

const STATES: Array<{ key: string; view: OfferView }> = [
  { key: "pending", view: { phase: "pending" } },
  { key: "started-running", view: started("running") },
  { key: "started-waiting", view: started("waiting") },
  { key: "started-done", view: started("done") },
  { key: "started-failed", view: started("failed") },
  { key: "started-stopped", view: started("stopped") },
  { key: "here", view: { phase: "here" } },
  { key: "dismissed", view: { phase: "dismissed" } },
  { key: "withdrawn", view: { phase: "withdrawn" } },
  { key: "expired", view: { phase: "expired" } },
];

export default function SessionOfferStates() {
  return (
    <div className="mx-auto max-w-2xl space-y-1 p-4" data-session-offer-states="">
      {STATES.map(({ key, view }) => (
        <div key={key} data-state-row={key}>
          <div className="text-[10px] text-muted-foreground">{key}</div>
          <SessionOfferPanel
            title="Draft the launch email"
            why="Runs on its own so this chat stays on the plan"
            brief="Write the launch email for the new plan."
            offeredAgentId={null}
            view={view}
            act={() => {}}
          />
        </div>
      ))}
    </div>
  );
}

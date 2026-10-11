"use client";

// Demo of the loud state with sample notices shaped exactly like `communication.my_loud_notices`
// rows from the spend.alarm.* events. Verbs act on the sample only: nothing is written.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LoudNotice } from "../loud/loudNotices";
import LoudNoticesPanel from "./LoudNoticesPanel";

const at = "2026-10-10T18:20:00Z";
const alarm = (id: string, severity: LoudNotice["severity"], subject: string, a: Record<string, unknown>, target_kind = "spend_alarm"): LoudNotice => ({
  id,
  event_key: `spend.alarm.${severity}`,
  severity,
  subject,
  body: String(a.fix ?? ""),
  deep_link: `/administration/billing/alarms/${id}`,
  target_kind,
  target_id: id,
  payload: { alarm: a },
  created_at: at,
  updated_at: at,
  read_at: null,
});

const SAMPLE: LoudNotice[] = [
  alarm("6f1c2b8e-0d1a-4c55-9a0e-1b2c3d4e5f60", "warning", "Spend with no owner: grok_x:search", {
    detail: "A paid grok_x:search call has no owner on record.",
    fix: "Pass the request context from the code that made this call",
    count: 4,
  }),
  alarm("0b7e9d24-5c3f-4e1a-8b6d-2f9a8c7e6d51", "critical", "SMS sent without the spend gate", {
    detail: "A text to a customer left without passing the spend gate.",
    fix: "Add the origin stamp where this SMS was queued",
    cost: "$0.04 spent",
    count: 1,
  }),
  alarm("9a4d6e2c-7b1f-4f3a-a5c8-3e2d1b0a9f87", "warning", "Hourly research run waits for approval", {
    detail: "Competitor price watch would cost $3.10 per run.",
    fix: "Approve or reject this run",
    cost: "$3.10 kept from spending",
    count: 2,
  }),
];

export function LoudNoticesDemo() {
  const [notices, setNotices] = useState(SAMPLE);
  const drop = (n: LoudNotice) => setNotices((all) => all.filter((x) => x.id !== n.id));
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Button variant="primary" type="button" onClick={() => setNotices(SAMPLE)}>
        Show loud notices
      </Button>
      <LoudNoticesPanel
        notices={notices}
        onOpen={() => setNotices([])}
        onDone={drop}
        onResolve={drop}
        onSnooze={drop}
        onLater={() => setNotices([])}
      />
    </div>
  );
}

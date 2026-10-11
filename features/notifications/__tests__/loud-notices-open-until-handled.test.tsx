/** @jest-environment jsdom */
// The loud notice (2026-10-10): loud in-app notices open over the page in their severity's
// colours, critical first; a spend alarm offers Open, Resolve (with a note), Snooze 24h and Copy
// for AI; a notice with no target verbs offers Done; "Remind me later" puts the set off.
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const copied: unknown[] = [];
jest.mock("@/components/agent-copy/CopyButtons", () => ({
  CopyButtons: ({ label, agent }: { label: string; agent: () => unknown }) => (
    <button type="button" aria-label={`Copy for AI: ${label}`} onClick={() => copied.push(agent())} />
  ),
}));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (p: { value: string; onChange: (e: { target: { value: string } }) => void; placeholder?: string }) => (
    <textarea data-testid="resolve-note" value={p.value} placeholder={p.placeholder} onChange={(e) => p.onChange({ target: { value: e.target.value } })} />
  ),
}));
jest.mock("@/features/admin/spend-alarms/spendAlarms", () => ({ setSpendAlarmStatus: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));

import LoudNoticesPanel from "../components/LoudNoticesPanel";
import { laterKey, sortLoudNotices, toLoudNotice, type LoudNotice } from "../loud/loudNotices";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  copied.length = 0;
});

const mk = (over: Partial<LoudNotice>): LoudNotice => ({
  id: "n",
  event_key: "spend.alarm.warning",
  severity: "warning",
  subject: "Approve this run",
  body: "Approve or reject this run",
  deep_link: "/administration/billing/alarms/rec-1",
  target_kind: "spend_alarm",
  target_id: "rec-1",
  payload: { alarm: { detail: "A run waits for approval", fix: "Approve or reject this run", cost: "$2.00 spent", count: 3, kind: "spend_approval_hold" } },
  created_at: "2026-10-10T10:00:00Z",
  updated_at: "2026-10-10T10:00:00Z",
  read_at: null,
  ...over,
});

function render(notices: LoudNotice[]) {
  const calls = { open: [] as string[], done: [] as string[], resolve: [] as [string, string][], snooze: [] as string[], later: 0 };
  const el = document.createElement("div");
  document.body.appendChild(el);
  root = createRoot(el);
  act(() =>
    root!.render(
      <LoudNoticesPanel
        notices={notices}
        onOpen={(n) => calls.open.push(n.id)}
        onDone={(n) => calls.done.push(n.id)}
        onResolve={(n, note) => calls.resolve.push([n.id, note])}
        onSnooze={(n) => calls.snooze.push(n.id)}
        onLater={() => (calls.later += 1)}
      />,
    ),
  );
  return calls;
}

const items = () => [...document.body.querySelectorAll<HTMLElement>('[data-testid^="loud-"]')].filter((e) => e.dataset.severity);
const within = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === name);
const anywhere = (name: string) =>
  [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === name);
const click = (b: HTMLElement | undefined) => {
  expect(b).toBeTruthy();
  act(() => b!.click());
};

test("nothing loud, nothing open", () => {
  render([]);
  expect(document.body.querySelector('[data-testid="loud-notices"]')).toBeNull();
});

test("critical first, each severity in its own colour and word", () => {
  render([mk({ id: "w" }), mk({ id: "c", severity: "critical", subject: "SMS sent ungated" }), mk({ id: "i", severity: "info", subject: "Skipped" })]);
  const list = items();
  expect(list.map((e) => e.dataset.severity)).toEqual(["critical", "warning", "info"]);
  expect(list[0].className).toContain("border-destructive");
  expect(list[1].className).toContain("border-warning");
  expect(list[2].className).toContain("border-info");
  expect(list[0].textContent).toContain("Critical");
  expect(list[1].textContent).toContain("Needs a decision");
});

test("a spend alarm shows what happened, cost, count and what to do, with its verbs", () => {
  const calls = render([mk({ id: "a" })]);
  const [card] = items();
  expect(card.textContent).toContain("A run waits for approval");
  expect(card.textContent).toContain("$2.00 spent");
  expect(card.textContent).toContain("x3");
  expect(card.textContent).toContain("Approve or reject this run");
  click(within(card, "Open"));
  click(within(card, "Snooze 24h"));
  expect(within(card, "Done")).toBeUndefined();
  click(within(card, "Resolve"));
  act(() => {
    const ta = document.body.querySelector<HTMLTextAreaElement>('[data-testid="resolve-note"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(ta, "price seeded");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  click(anywhere("Resolve for everyone"));
  expect(calls.open).toEqual(["a"]);
  expect(calls.snooze).toEqual(["a"]);
  expect(calls.resolve).toEqual([["a", "price seeded"]]);
  click(anywhere("Copy for AI: Notice"));
  expect(copied[0]).toMatchObject({ kind: "spend-alarm", data: { record_id: "rec-1", level: "warning" } });
});

test("a loud notice with no target verbs offers Done", () => {
  const calls = render([mk({ id: "g", target_kind: "task", payload: {} })]);
  const [card] = items();
  expect(within(card, "Resolve")).toBeUndefined();
  click(within(card, "Done"));
  expect(calls.done).toEqual(["g"]);
});

test("Remind me later puts the set off", () => {
  const calls = render([mk({ id: "a" })]);
  click(anywhere("Remind me later"));
  expect(calls.later).toBe(1);
});

test("a refreshed notice asks again after Remind me later", () => {
  const a = mk({ id: "a" });
  expect(laterKey(a)).not.toEqual(laterKey({ ...a, updated_at: "2026-10-10T11:00:00Z" }));
});

test("the door's rows are checked field by field", () => {
  expect(toLoudNotice({ id: "x", severity: "nonsense" })?.severity).toBe("warning");
  expect(toLoudNotice({ severity: "critical" })).toBeNull();
  expect(sortLoudNotices([mk({ id: "1", severity: "info" }), mk({ id: "2", severity: "critical" })]).map((n) => n.id)).toEqual(["2", "1"]);
});

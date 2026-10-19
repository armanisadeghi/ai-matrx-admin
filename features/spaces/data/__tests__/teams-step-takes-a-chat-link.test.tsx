/**
 * @jest-environment jsdom
 */
// AT-MSFT: the Teams message step takes a channel OR a chat link (a chat posts with ChatMessage.Send), every edit lands on
// the step, and Settings offers the one-time "Send Teams chat messages" approval that step needs.
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@ai-matrx/records/react", () => ({ useTables: () => ({ data: [] }), useOptionalRecordsClient: () => null }));
jest.mock("@/features/data-tables/records-ui-host/recordsUiLazy", () => ({ ConditionGroup: () => null }));
jest.mock("@/features/mandates/catalogue", () => ({ fetchMandateCatalogue: jest.fn() }));
jest.mock("@/features/mandates/input-surface", () => ({ useMandateInputSurface: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/hooks/usePersonTimeZone", () => ({ usePersonTimeZone: () => "UTC" }));

import { FlowStepEditor, type Step } from "../AutomationSteps";
import { describeMicrosoftCampaign, MICROSOFT_DEFAULT_CAMPAIGNS } from "@/features/microsoft-integration/campaigns";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const CHAT = "https://teams.microsoft.com/l/chat/19:meeting_abc123@thread.v2/conversations";

it("edits a Teams message step with a chat link", async () => {
  let step: Step = { do: "teams_message", channel_link: "", message: "" };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () =>
    root.render(<FlowStepEditor step={step} onChange={(s) => { step = s; render(); }} number={1} before={[]} tableId="t1" fields={[]} trigger={{ on: "outlook_received" } as never} />);
  await act(async () => render());
  const link = host.querySelector('input[aria-label="Channel or chat link"]') as HTMLInputElement;
  expect(link).not.toBeNull();
  expect(link.placeholder).toBe("Teams channel or chat link");
  await act(async () => type(link, CHAT));
  await act(async () => type(host.querySelector('input[aria-label="Message"]') as HTMLInputElement, "New invoice"));
  expect(step).toEqual({ do: "teams_message", channel_link: CHAT, message: "New invoice" });
  await act(async () => root.unmount());
});

it("offers Teams chat sending as its own write approval, never by default", () => {
  const chat = describeMicrosoftCampaign("teams_chat_send");
  expect(chat?.scopes).toEqual(["ChatMessage.Send"]);
  expect(chat?.writes).toBe(true);
  expect(chat?.label).toBe("Send Teams chat messages");
  expect(MICROSOFT_DEFAULT_CAMPAIGNS).not.toContain("teams_chat_send");
});

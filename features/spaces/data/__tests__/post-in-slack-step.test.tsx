/**
 * @jest-environment jsdom
 */
// AT-SLACK: the "Post in Slack" step (slack_post) is edited with a channel and a message, and every edit lands on the step.
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@ai-matrx/records/react", () => ({ useTables: () => ({ data: [] }), useOptionalRecordsClient: () => null }));
jest.mock("@/features/data-tables/records-ui-host/recordsUiLazy", () => ({ ConditionGroup: () => null }));
jest.mock("@/features/mandates/catalogue", () => ({ fetchMandateCatalogue: jest.fn() }));
jest.mock("@/features/mandates/input-surface", () => ({ useMandateInputSurface: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/hooks/usePersonTimeZone", () => ({ usePersonTimeZone: () => "UTC" }));

import { FlowStepEditor, type Step } from "../AutomationSteps";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("edits a Post in Slack step's channel and message", async () => {
  let step: Step = { do: "slack_post", channel: "", message: "" };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () =>
    root.render(<FlowStepEditor step={step} onChange={(s) => { step = s; render(); }} number={1} before={[]} tableId="t1" fields={[]} trigger={{ on: "webhook" } as never} />);
  await act(async () => render());
  expect(host.textContent).toContain("Post in Slack");
  const channel = host.querySelector('input[aria-label="Channel"]') as HTMLInputElement;
  const message = host.querySelector('input[aria-label="Message"]') as HTMLInputElement;
  expect(channel).not.toBeNull();
  expect(message).not.toBeNull();
  await act(async () => type(channel, "general"));
  await act(async () => type(host.querySelector('input[aria-label="Message"]') as HTMLInputElement, "New order"));
  expect(step).toEqual({ do: "slack_post", channel: "general", message: "New order" });
  await act(async () => root.unmount());
});

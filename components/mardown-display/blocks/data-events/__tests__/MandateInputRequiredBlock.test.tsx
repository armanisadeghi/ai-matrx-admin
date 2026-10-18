/**
 * A PAUSED JOB IS ANSWERED IN PLACE, never dumped as an Unknown Data Event.
 *
 * The card shows the server's sentence and the inputs it asks for; Continue
 * refuses an empty required input by name, and with an answer it posts exactly
 * `{ values, initiation: "user" }` to `POST /mandates/runs/{request_id}/answer`.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockCallApi = jest.fn((args: unknown) => ({ type: "callApi", args }));
const mockDispatch = jest.fn(async (action: unknown) =>
  (action as { type?: string })?.type === "callApi" ? { data: null, error: null } : action,
);
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => null,
  useAppStore: () => ({ getState: () => ({}), dispatch: jest.fn() }),
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/lib/api/call-api", () => ({ callApi: (args: unknown) => mockCallApi(args) }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/adopt-foreign-stream", () => ({
  adoptForeignStream: () => ({ type: "adopt" }),
}));
const mockWindow = { update: jest.fn(), close: jest.fn() };
jest.mock("@/features/overlays/definitions/liveRunWindow.overlay", () => ({
  useOpenLiveRunWindow: () => () => mockWindow,
}));

// eslint-disable-next-line import/first
import MandateInputRequiredBlock from "../MandateInputRequiredBlock";

const PAYLOAD = {
  type: "mandate_input_required",
  mandate_key: "wfparity.text_summary",
  run_id: "run-1",
  checkpoint_id: null,
  request_id: "req-1",
  message: "Text to summarize is missing.",
  inputs: [
    {
      name: "source_text",
      kind: "text",
      sourcing: "require",
      label: "Text to summarize",
      help: "Paste an article, email, or notes.",
      options: [],
      variant: "textarea",
      json_schema: { type: "string", title: "Text to summarize" },
    },
  ],
};

describe("MandateInputRequiredBlock", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockCallApi.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    act(() => {
      root.render(
        <TooltipProvider>
          <MandateInputRequiredBlock data={PAYLOAD} />
        </TooltipProvider>,
      );
    });
  }
  const continueButton = () =>
    Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Continue")!;

  it("shows the server's sentence and the field it asks for", () => {
    render();
    expect(container.textContent).toContain("Text to summarize is missing.");
    expect(container.textContent).toContain("Text to summarize");
    expect(container.textContent).not.toContain("Unknown Data Event");
    expect(continueButton()).toBeDefined();
  });

  it("an empty required input is refused before anything is sent", async () => {
    render();
    await act(async () => {
      continueButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it("an answer posts to the run's answer door with the typed value", async () => {
    render();
    const field = container.querySelector("textarea, input") as HTMLTextAreaElement | HTMLInputElement;
    expect(field).toBeTruthy();
    await act(async () => {
      const proto = Object.getPrototypeOf(field);
      Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(field, "An article about bees.");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      continueButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(mockCallApi).toHaveBeenCalledTimes(1);
    const args = mockCallApi.mock.calls[0][0] as {
      path: string;
      pathParams: Record<string, string>;
      body: { values: Record<string, unknown>; initiation: string };
    };
    expect(args.path).toBe("/mandates/runs/{request_id}/answer");
    expect(args.pathParams).toEqual({ request_id: "req-1" });
    expect(args.body).toEqual({ values: { source_text: "An article about bees." }, initiation: "user" });
  });
});

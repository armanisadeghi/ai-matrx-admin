/**
 * FORCING GUARD — Codex in the person's hosted Matrx Sandbox, on either payer.
 *
 * Three contracts, each the whole of what the server can see:
 *   1. The request body. `CodexManagedRequest` refuses a start that carries a
 *      `thread_id` and a resume that lacks one, bills AI Matrx whenever
 *      `billing` is absent, refuses `/home/agent` itself once an own-plan
 *      sign-in lives there, and has no default model.
 *   2. The Run gate. On "Your ChatGPT plan" only a server-reported
 *      `signed_in` lets Run go — never `awaiting_browser`, never an API-key
 *      sign-in (`signed_in_not_plan`).
 *   3. The sign-in. OpenAI's device flow has nothing to paste: the step shows
 *      the link and the one-time code, then re-reads the status door until it
 *      says `signed_in`.
 * Only the wire is mocked; the components and the gate are real.
 */

import * as React from "react";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const callApi = jest.fn();
const ownPlanStatus = jest.fn();
const ownPlanSignInStart = jest.fn();

jest.mock("@/lib/api/call-api", () => ({
  callApi: (...args: unknown[]) => callApi(...args),
}));
jest.mock("@/lib/api/server-api", () => ({ serverApi: {} }));
jest.mock("@ai-matrx/api/code", () => ({
  ...jest.requireActual("@ai-matrx/api/code"),
  ownPlanStatus: (...a: unknown[]) => ownPlanStatus(...a),
  ownPlanSignInStart: (...a: unknown[]) => ownPlanSignInStart(...a),
}));
jest.mock(
  "@ai-matrx/chat/agents/redux/execution-system/thunks/adopt-foreign-stream",
  () => ({ adoptForeignStream: () => ({ type: "test/adopt" }) }),
);
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));


import {
  HOSTED_CODEX_STREAM_PATH,
  readHostedSessionId,
  startHostedRun,
} from "@/features/ai-work/lib/hostedSandboxRun";
import {
  hostedRunBlocker,
  type HostedBilling,
  type OwnPlanStatus,
} from "@/features/ai-work/lib/ownPlan";
import {
  HostedBillingStep,
  OWN_PLAN_POLL_MS,
} from "@/features/ai-work/compose/components/HostedBillingStep";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";

type Thunk = (dispatch: Dispatch, getState: () => unknown) => unknown;
type Dispatch = (action: unknown) => unknown;
const dispatch: Dispatch = (action) =>
  typeof action === "function"
    ? (action as Thunk)(dispatch, () => ({}))
    : action;

function sent(): { path: string; body: Record<string, unknown> } {
  expect(callApi).toHaveBeenCalledTimes(1);
  return callApi.mock.calls[0][0] as { path: string; body: Record<string, unknown> };
}

beforeEach(() => {
  callApi.mockReset();
  callApi.mockReturnValue(async () => ({ error: null }));
  ownPlanStatus.mockReset();
  ownPlanSignInStart.mockReset();
});

describe("the Codex request body", () => {
  it("names the payer and the projects folder, and never sends a thread on start", async () => {
    await dispatch(
      startHostedRun({
        provider: "codex",
        conversationId: "c-1",
        prompt: "Fix the failing test",
        model: "gpt-5",
        billing: "own_plan",
      }),
    );
    const { path, body } = sent();
    expect(path).toBe(HOSTED_CODEX_STREAM_PATH);
    expect(path).toBe("/coding-sessions/codex/stream");
    expect(body.action).toBe("start");
    expect(body.billing).toBe("own_plan");
    expect(body.workspace_root).toBe("/home/agent/projects");
    expect(body.model).toBe("gpt-5");
    expect(body.sandbox_mode).toBe("workspace-write");
    expect("thread_id" in body).toBe(false);
    expect(body.conversation).toEqual({ conversation_id: "c-1", is_new: true, store: true });
    // A Claude-only field on the Codex wire is refused (`extra="forbid"`).
    expect("max_turns" in body).toBe(false);
    expect("permission_mode" in body).toBe(false);
  });

  it("bills AI Matrx credits when no payer is named", async () => {
    await dispatch(
      startHostedRun({ provider: "codex", conversationId: "c-2", prompt: "Hi", model: "gpt-5" }),
    );
    expect(sent().body.billing).toBe("platform");
  });

  it("resumes the same conversation with the previous run's thread id", async () => {
    await dispatch(
      startHostedRun({
        provider: "codex",
        conversationId: "c-3",
        prompt: "Now add a test",
        model: "gpt-5",
        threadId: "0199a-thread",
      }),
    );
    const { body } = sent();
    expect(body.action).toBe("resume");
    expect(body.thread_id).toBe("0199a-thread");
    expect(body.conversation).toEqual({ conversation_id: "c-3", is_new: false, store: true });
  });

  it("reads the Codex thread id the stream reports", () => {
    const frame = {
      event: "data",
      data: {
        sdk_message_type: "CodexManagedEvent",
        runtime_id: "rt-1",
        session_id: null,
        event_type: "thread.started",
        event: { type: "thread.started", thread_id: "0199a-thread" },
      },
    } as unknown as TypedStreamEvent;
    expect(readHostedSessionId(frame)).toBe("0199a-thread");
  });
});

describe("continuing a hosted Claude Code session", () => {
  it("resumes the same conversation with the previous run's session id", async () => {
    await dispatch(
      startHostedRun({ conversationId: "c-9", prompt: "Keep going", sessionId: "sess-1" }),
    );
    const { body } = sent();
    expect(body.action).toBe("resume");
    expect(body.session_id).toBe("sess-1");
    expect(body.conversation).toEqual({ conversation_id: "c-9", is_new: false, store: true });
  });

  it("never sends a session id on a start", async () => {
    await dispatch(startHostedRun({ conversationId: "c-10", prompt: "Begin" }));
    const { body } = sent();
    expect(body.action).toBe("start");
    expect("session_id" in body).toBe(false);
  });
});

describe("the Run gate", () => {
  const blocker = (billing: HostedBilling, state: OwnPlanStatus["state"] | null, model: string | null = "gpt-5") =>
    hostedRunBlocker(
      "codex",
      billing,
      state ? ({ provider: "codex", state } as OwnPlanStatus) : null,
      model,
    );

  it("keeps Run off on the ChatGPT plan until the server says signed_in", () => {
    for (const state of [null, "signed_out", "starting", "awaiting_browser", "unavailable"] as const) {
      expect(blocker("own_plan", state)).toBe("Connect your ChatGPT account first.");
    }
    expect(blocker("own_plan", "signed_in_not_plan")).toBe(
      "Sign in with a ChatGPT plan, or use AI Matrx credits.",
    );
    expect(blocker("own_plan", "signed_in")).toBeNull();
  });

  it("lets AI Matrx credits run without any sign-in", () => {
    expect(blocker("platform", null)).toBeNull();
  });

  it("needs a model for Codex, whoever pays", () => {
    expect(blocker("platform", null, null)).toBe("Choose a Codex model first.");
    expect(blocker("own_plan", "signed_in", null)).toBe("Choose a Codex model first.");
  });
});

function Host({ initial }: { initial: OwnPlanStatus | null }) {
  const [billing, setBilling] = useState<HostedBilling>("own_plan");
  const [status, setStatus] = useState<OwnPlanStatus | null>(initial);
  return (
    <>
      <HostedBillingStep
        provider="codex"
        billing={billing}
        onBillingChange={setBilling}
        status={status}
        onStatusChange={setStatus}
      />
      <output data-testid="state">{status?.state ?? "none"}</output>
    </>
  );
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  if (!found) throw new Error(`no button "${text}"`);
  return found as HTMLButtonElement;
}

describe("the ChatGPT sign-in", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  it("shows OpenAI's link and the one-time code, then polls to signed_in", async () => {
    const awaiting = {
      provider: "codex",
      state: "awaiting_browser",
      sign_in_url: "https://auth.openai.com/codex/device",
      user_code: "ABCD-12345",
    } as OwnPlanStatus;
    ownPlanSignInStart.mockResolvedValue(awaiting);
    ownPlanStatus
      .mockResolvedValueOnce(awaiting)
      .mockResolvedValueOnce({ provider: "codex", state: "signed_in", signed_in: true } as OwnPlanStatus);

    act(() => {
      root.render(<Host initial={{ provider: "codex", state: "signed_out" } as OwnPlanStatus} />);
    });
    expect(container.textContent).toContain("Your ChatGPT plan");

    await act(async () => {
      button(container, "Connect your ChatGPT account").click();
    });
    expect(ownPlanSignInStart).toHaveBeenCalledTimes(1);
    expect(ownPlanSignInStart.mock.calls[0][1]).toMatchObject({ path: { provider: "codex" } });

    const link = container.querySelector('a[href="https://auth.openai.com/codex/device"]');
    expect(link?.textContent).toContain("Open OpenAI sign-in");
    expect(container.querySelector('[data-testid="own-plan-user-code"]')?.textContent).toBe(
      "ABCD-12345",
    );
    // Nothing to paste: the Claude code box never appears for Codex.
    expect(container.querySelector("input")).toBeNull();
    expect(button(container, "Copy")).toBeTruthy();

    // Not read again before the poll interval.
    expect(ownPlanStatus).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(OWN_PLAN_POLL_MS);
    });
    expect(ownPlanStatus).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe("awaiting_browser");

    await act(async () => {
      jest.advanceTimersByTime(OWN_PLAN_POLL_MS);
    });
    expect(ownPlanStatus).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe("signed_in");
    expect(container.textContent).toContain("Signed in to ChatGPT");

    // Signed in: polling stops.
    await act(async () => {
      jest.advanceTimersByTime(OWN_PLAN_POLL_MS * 3);
    });
    expect(ownPlanStatus).toHaveBeenCalledTimes(2);
  });

  it("says a failed read once and keeps polling until signed_in", async () => {
    const { toast } = jest.requireMock("@/lib/toast") as {
      toast: { error: jest.Mock };
    };
    toast.error.mockReset();
    ownPlanStatus
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ provider: "codex", state: "signed_in", signed_in: true } as OwnPlanStatus);

    act(() => {
      root.render(
        <Host
          initial={{
            provider: "codex",
            state: "awaiting_browser",
            sign_in_url: "https://auth.openai.com/codex/device",
            user_code: "ABCD-12345",
          } as OwnPlanStatus}
        />,
      );
    });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(OWN_PLAN_POLL_MS);
      });
    }
    expect(ownPlanStatus).toHaveBeenCalledTimes(3);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe("signed_in");
  });
});

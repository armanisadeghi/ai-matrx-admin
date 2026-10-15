/**
 * Live 2026-10-15: POST /scheduling/device-tasks answered 500 (request c9ce8f4f…) and the schedule
 * form said "Please fix the highlighted fields above before saving." with nothing highlighted. A
 * server failure now shows the server's own words (aidream's `user_message`) and its request id.
 * Drives the real createComputerAgentTask through the real scheduler client; only the wire (the
 * send, the session, the organization) is stood in, answering the live 500's exact body.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

const LIVE_500 = {
  error: "internal_error",
  message: "Internal server error: DBNotConfiguredError",
  user_message: "Something went wrong. Please try again later.",
  details: null,
  request_id: "c9ce8f4f479c42bd83b95aff682c77e5",
};
let answer: { status: number; body: unknown } = { status: 500, body: LIVE_500 };

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "jwt" } } }) } },
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "39c38960-d30c-4840-b0c1-c9960de95582" }));
jest.mock("@/lib/api/resolve-service-url", () => ({ resolveServiceBaseUrl: () => "http://aidream.test" }));
jest.mock("@ai-matrx/api", () => ({
  ...jest.requireActual("@ai-matrx/api"),
  sendMatrxRequest: async () => ({
    ok: answer.status < 400,
    status: answer.status,
    json: async () => answer.body,
  }),
}));

import { createComputerAgentTask } from "../../service/queries";
import { SaveProblem, saveFailureFrom } from "./SaveProblem";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function failedSave(): Promise<unknown> {
  try {
    await createComputerAgentTask({
      title: "Inbox agent",
      description: null,
      deviceId: "94bd4c68-8e2c-40af-be97-7d8d359afd9e",
      agentId: "a2525cd3-5cd7-41e3-a0d5-14a9507285d1",
      prompt: "sort the inbox",
      variables: {},
      authMode: "ask",
      maxRuntimeSeconds: 600,
      maxConcurrent: 1,
      trigger: { type: "one-shot", at: "2030-01-15T17:00:00Z" },
    } as Parameters<typeof createComputerAgentTask>[0]);
  } catch (err) {
    return err;
  }
  throw new Error("the save did not fail");
}

test("the live 500: the server's words and its request id, never 'fix the highlighted fields'", async () => {
  answer = { status: 500, body: LIVE_500 };
  const failure = saveFailureFrom(await failedSave());
  expect(failure).toEqual({ message: LIVE_500.user_message, requestId: LIVE_500.request_id });
  act(() => root.render(<SaveProblem failure={failure} fieldErrors={{}} />));
  expect(host.textContent).toContain(LIVE_500.user_message);
  expect(host.textContent).toContain(LIVE_500.request_id);
  expect(host.textContent).not.toContain("highlighted fields");
});

test("a 422 refusal: the refusal's sentence", async () => {
  answer = {
    status: 422,
    body: { error: "invalid_argument", message: "x", user_message: "That computer is not in an organization.", request_id: "r-422" },
  };
  const failure = saveFailureFrom(await failedSave());
  expect(failure).toEqual({ message: "That computer is not in an organization.", requestId: "r-422" });
});

test("a field the form marked: the highlighted-fields line, and nothing when all is well", () => {
  act(() => root.render(<SaveProblem failure={null} fieldErrors={{ title: "Name the schedule" }} />));
  expect(host.textContent).toContain("Please fix the highlighted fields above before saving.");
  act(() => root.render(<SaveProblem failure={null} fieldErrors={{}} />));
  expect(host.textContent).toBe("");
});

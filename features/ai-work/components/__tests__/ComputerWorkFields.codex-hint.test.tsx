/**
 * The schedule form showed "Codex: sign in on <computer>…" while Claude Code was the chosen, working
 * app (2026-10-15). A provider's sign-in line belongs to that provider: shown when it is the chosen
 * app, or when nothing on that computer can run; never under a working Claude Code choice.
 * Drives the real ComputerWorkFields against a recorder computer at its request seam.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { ComputerWorkFields } from "../ComputerWorkFields";
import type { ComputerConnectionState } from "@/features/ai-work/compose/components/RunsOnStep";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Provider = { provider: "claude" | "codex"; label: string; installed: boolean; loggedIn: boolean };

function computerWith(providers: Provider[]): ComputerConnectionState {
  const answers: Record<string, unknown> = {
    "coding.providers": { providers },
    "coding.folders.recent": { folders: [{ path: "/w", exists: true }] },
    "apps.profiles.list": { profiles: [] },
  };
  return {
    deviceId: "dev-1",
    client: { request: async (op: string) => answers[op] },
    status: { pill: "live", label: "Live", detail: null },
  } as unknown as ComputerConnectionState;
}

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

async function render(providers: Provider[], initialProvider: "claude" | "codex" = "claude") {
  await act(async () => {
    root.render(
      <ComputerWorkFields
        computer={{ device: { id: "dev-1" }, name: "Studio" }}
        connection={computerWith(providers)}
        initial={{ deviceId: "dev-1", name: "Studio", provider: initialProvider, folder: "/w", accountProfileId: null }}
        onPlan={() => {}}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const claudeReady: Provider = { provider: "claude", label: "Claude Code", installed: true, loggedIn: true };
const codexSignedOut: Provider = { provider: "codex", label: "Codex", installed: true, loggedIn: false };

test("Claude Code chosen and working: no Codex sign-in line", async () => {
  await render([claudeReady, codexSignedOut]);
  expect(host.querySelector('[data-testid="runs-on-form"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="next-step-codex"]')).toBeNull();
  expect(host.textContent).not.toContain("sign in on Studio");
});

test("Codex chosen (a kept schedule) and signed out: its sign-in line shows", async () => {
  await render([claudeReady, codexSignedOut], "codex");
  expect(host.querySelector('[data-testid="next-step-codex"]')?.textContent).toBe(
    "Codex: sign in on Studio in Matrx 2 › Code › Accounts",
  );
});

test("Nothing can run: every app's next step shows (they are the way forward)", async () => {
  await render([{ ...claudeReady, loggedIn: false }, codexSignedOut]);
  expect(host.querySelector('[data-testid="next-step-claude"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="next-step-codex"]')).not.toBeNull();
});

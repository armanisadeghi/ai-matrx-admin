/**
 * After a coding schedule's home was removed, its detail page read "Filed under: Not filed" — a row
 * that says nothing (2026-10-15). With no homes the row is absent; with homes it names them.
 * Renders the real SpecCard; only the computer's live status (a network read) is stood in.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import type { AgendaTask } from "../../types";
import type { ComputerCodingWork } from "../../utils/computerWork";

jest.mock("./ComputerTargetLine", () => ({
  runsOnComputer: () => true,
  useComputerStatus: () => ({ name: "Studio", state: "online" }),
}));

import { SpecCard } from "./SpecCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function codingTask(homes: ComputerCodingWork["homes"]): AgendaTask {
  return {
    id: "task-1",
    userId: "u-1",
    kind: "device_op",
    metadata: {},
    title: "Nightly tidy",
    description: null,
    queue: "default",
    surfaces: ["desktop"],
    enabled: true,
    expiresAt: null,
    tags: [],
    nextDueAt: null,
    lastRunAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    agentId: null,
    prompt: "",
    variables: {},
    persistentConversationId: null,
    authMode: "auto",
    maxRuntimeSeconds: 600,
    maxConcurrent: 1,
    triggers: [],
    targetDeviceId: "dev-1",
    deviceOp: { op: "coding.start", provider: "claude", folder: "/w", prompt: "tidy", accountProfileId: null, homes, raw: {} },
  } as AgendaTask;
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

test("no homes: no Filed under row, and never 'Not filed'", () => {
  act(() => root.render(<SpecCard task={codingTask([])} />));
  expect(host.textContent).toContain("Folder");
  expect(host.textContent).not.toContain("Filed under");
  expect(host.textContent).not.toContain("Not filed");
});

test("a home: the row names it", () => {
  act(() => root.render(<SpecCard task={codingTask([{ token: "project", id: "p1", label: "Site" }])} />));
  expect(host.textContent).toContain("Filed under");
  expect(host.textContent).toContain("Site");
});

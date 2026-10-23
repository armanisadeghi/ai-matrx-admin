/**
 * Typing into the name finder (Trustpilot "Company name or website", LinkedIn "Company name") must never
 * crash the page. Live 2026-10-22 every keystroke ended in React error #185 (maximum update depth):
 * ProInput's measuring refs were new functions on every render, so each commit detached and re-attached
 * them and re-measured synchronously; a field whose measured size moves with its own controls (a wide
 * placeholder, the Find button beside it) set new state in every commit, forever. The witness below is a
 * layout whose size changes on every read: a re-measure per commit loops, a measure per mount does not.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import { TooltipProvider } from "@ai-matrx/design-system";

import { NameFinder } from "../NameFinder";
import { nameFinderFor } from "../nameFinders";

jest.mock("@/features/comparison/server", () => ({ lookupItems: jest.fn() }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

jest.mock("@/providers/GlobalRecordingProvider", () => ({
  useGlobalRecordingOptional: () => null,
}));

// No store in a unit mount: run every selector against one inert recordings
// slice (nothing is recording, so no surface owns the recorder).
const fakeState = {
  recordings: {
    isRecording: false,
    isPaused: false,
    isTranscribing: false,
    isFinalizing: false,
    liveTranscript: "",
    audioLevel: 0,
    durationSec: 0,
    context: null,
  },
  userAuth: { id: "test-user", createdAt: null },
  userPreferences: {
    mediaDevices: {
      audioInputDeviceId: "default",
      audioOutputDeviceId: "default",
      videoInputDeviceId: "default",
    },
  },
};
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(fakeState),
  useAppDispatch: () => jest.fn(),
  useAppStore: () => ({
    getState: () => fakeState,
    dispatch: jest.fn(),
    subscribe: () => () => {},
  }),
}));
// The chat package reads these hooks through its own module (P3): one double covers both.
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));

jest.mock("@/lib/toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: () => ({
        select: () => ({
          is: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        }),
      }),
    }),
  },
}));

jest.mock("@ai-matrx/kit/media-query", () => ({ ...jest.requireActual("@ai-matrx/kit/media-query"), useIsMobile: () => false }));

// The "…" menu's agent machinery is a different subsystem entirely; stubbing it
// keeps this suite about the recorder path and nothing else.
jest.mock("@/components/official/useProTextareaAgentAction", () => ({
  useProTextareaAgentAction: () => ({
    state: { status: "idle", text: "", error: null, actionId: null },
    run: jest.fn(),
    reset: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock("@ai-matrx/chat/surfaces/hooks/useSurfaceBoundAgents", () => ({
  useSurfaceBoundAgents: () => ({
    sections: [],
    loading: false,
    refresh: jest.fn(),
  }),
}));
jest.mock("@ai-matrx/chat/surfaces/hooks/useSurfaceConfig", () => ({
  useSurfaceAgentRoles: () => ({ roles: {}, loading: false }),
}));



function typeInto(input: HTMLInputElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  set?.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("the name finder takes typing", () => {
  let reads = 0;
  const real = HTMLElement.prototype.getBoundingClientRect;
  beforeEach(() => {
    reads = 0;
    HTMLElement.prototype.getBoundingClientRect = function () {
      reads += 1;
      const width = 200 + (reads % 7);
      return { width, height: 32, top: 0, left: 0, right: width, bottom: 32, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
  });
  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = real;
  });

  it.each(["trustpilot_reviews", "linkedin_company", "tiktok_posts"])("%s: typing a name does not loop", async (key) => {
    const finder = nameFinderFor(key);
    expect(finder).not.toBeNull();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onPage = jest.fn();
    await act(async () => {
      root.render(
        <TooltipProvider>
          <NameFinder finder={finder!} organizationId="org-1" page={null} onPage={onPage} />
        </TooltipProvider>,
      );
    });
    const input = container.querySelector("input") as HTMLInputElement;
    let typed = "";
    for (const ch of "Delta") {
      typed += ch;
      await act(async () => typeInto(input, typed));
    }
    expect(input.value).toBe("Delta");
    expect(container.querySelector("button")?.hasAttribute("disabled")).toBe(false);
    await act(async () => root.unmount());
  });
});

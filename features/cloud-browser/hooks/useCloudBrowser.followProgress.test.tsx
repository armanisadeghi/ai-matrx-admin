/**
 * The Computer tab read `browser.action_event` every 2 s for a step list it
 * never shows (2026-10-17). `followProgress: false` stops that poll; the Cloud
 * Browser panel (default) keeps its written-progress face live.
 */

import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, settle } from "@/test-utils/renderHook";
import cloudBrowserReducer from "../redux/cloudBrowserSlice";

const makeStore = () => configureStore({ reducer: { cloudBrowser: cloudBrowserReducer } });
const mockRef: { store: ReturnType<typeof makeStore> } = { store: makeStore() };

jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => mockRef.store.dispatch,
  useAppSelector: (sel: (s: unknown) => unknown) =>
    React.useSyncExternalStore(
      mockRef.store.subscribe,
      () => sel(mockRef.store.getState()),
      () => sel(mockRef.store.getState()),
    ),
}));
jest.mock("@/lib/hooks/useUser", () => ({
  useUser: () => ({ userId: "user-1", activeUserName: "Test Admin" }),
}));

const mockFollowed: Array<string | null | undefined> = [];
jest.mock("./useWrittenProgress", () => ({
  useWrittenProgress: (runId: string | null | undefined) => {
    mockFollowed.push(runId);
    return { refreshProgress: jest.fn() };
  },
}));

const snapshot = {
  activeProfileId: "prof-1",
  profiles: [],
  quotas: {},
  run: { id: "run-1", profileId: "prof-1", state: "agent_control" },
  progress: [],
  handoff: null,
  controller: null,
  bindings: [],
  telemetry: null,
  consent: null,
  notificationAcknowledgedAt: null,
};
jest.mock("../service", () => ({
  loadSnapshot: jest.fn(async () => snapshot),
}));

import { useCloudBrowser } from "./useCloudBrowser";

beforeEach(() => {
  mockRef.store = makeStore();
  mockFollowed.length = 0;
});

it("the Computer tab never follows written progress", async () => {
  const h = await renderHook(() =>
    useCloudBrowser(undefined, null, "sandbox", { followProgress: false }),
  );
  await settle(h, (v) => v.run?.id === "run-1", "the machine run");
  expect(mockFollowed.length).toBeGreaterThan(0);
  expect(mockFollowed.every((id) => id === null)).toBe(true);
  await h.unmount();
});

it("the Cloud Browser panel still follows it", async () => {
  const h = await renderHook(() => useCloudBrowser("prof-1"));
  await settle(h, (v) => v.run?.id === "run-1", "the run");
  expect(mockFollowed).toContain("run-1");
  await h.unmount();
});

/**
 * `?focus=<id>` opens THAT transcript even when the list read lands while the by-id read is in
 * flight (the real order on the processor page: both fire on mount). Red before the fix: the layout
 * effect's cleanup cancelled the in-flight read on the list's re-render and the one-attempt guard
 * blocked the retry, so the page showed the first row of the list.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import transcriptsReducer, { transcriptsFetched, transcriptsLoadingChanged } from "../../redux/transcriptsSlice";
import type { Transcript } from "../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const row = (id: string) => ({ id, title: id }) as unknown as Transcript;
let resolveById: (t: Transcript | null) => void = () => {};
jest.mock("../../service/transcriptsService", () => ({
  fetchTranscriptById: jest.fn(() => new Promise((res) => { resolveById = res; })),
  fetchTranscripts: jest.fn(),
}));
jest.mock("@/hooks/useToastManager", () => ({ useToastManager: () => ({ error: jest.fn(), success: jest.fn() }) }));
jest.mock("@ai-matrx/data/realtime", () => ({ defineChannelNamespace: () => ({ topic: () => "t" }), subscribeToRealtimeManager: () => () => {} }));

import { useFocusTranscript } from "../useFocusTranscript";
import { useTranscripts } from "../useTranscripts";

it("selects the focused transcript although the list read lands first", async () => {
  const store = configureStore({ reducer: { transcripts: transcriptsReducer } });
  let active: string | null | undefined;
  function Probe() {
    useFocusTranscript("focus-me");
    active = useTranscripts().activeTranscript?.id ?? null;
    return null;
  }
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
  });
  // The list read lands while the by-id read is still in flight.
  await act(async () => {
    store.dispatch(transcriptsLoadingChanged(false));
    store.dispatch(transcriptsFetched([row("a"), row("b")]));
  });
  await act(async () => {
    resolveById(row("focus-me"));
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(active).toBe("focus-me");
  // And a later list read does not move it.
  await act(async () => {
    store.dispatch(transcriptsFetched([row("a"), row("b")]));
  });
  expect(active).toBe("focus-me");
  act(() => root.unmount());
});

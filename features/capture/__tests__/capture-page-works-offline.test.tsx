/**
 * @jest-environment jsdom
 */
// AT-FIX-I: the capture page warms its lazy code on mount (latch opens while online), and the route source
// calls the hook — so "load online, go offline, type" never asks for a chunk that cannot arrive.
import fs from "node:fs";
import path from "node:path";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useWarmOfflineCode } from "../useWarmOfflineCode";
import * as latch from "@/components/dialogs/host/dialogHostsLatch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  useWarmOfflineCode();
  return null;
}

afterEach(() => latch._resetDialogHostsLatchForTests());

it("opens the dialog-host latch on mount, before anyone types", () => {
  const el = document.createElement("div");
  const root = createRoot(el);
  expect(latch.isDialogHostsRequested()).toBe(false);
  act(() => root.render(<Probe />));
  expect(latch.isDialogHostsRequested()).toBe(true);
  act(() => root.unmount());
});

it("the capture route calls the hook", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "app/(link)/capture/[sheetId]/page.tsx"), "utf8");
  expect(src).toMatch(/useWarmOfflineCode\(userId\)/);
});

/**
 * Forcing test: the app's Coming-soon registry must be registered by a CLIENT module.
 * Regression (2026-10-15): app/Providers.tsx is a Server Component and was the only importer of the
 * registry, so the browser registry was empty and every menu row failed closed.
 */
import fs from "node:fs";
import path from "node:path";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { getComingSoon } from "@ai-matrx/kit/coming-soon";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("coming-soon client registration", () => {
  it("rendering only the client entry registers the app's promises", async () => {
    jest.isolateModules(() => {
      jest.doMock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));
    });
    const { ComingSoonClient } = await import("./ComingSoonClient");
    const el = document.createElement("div");
    await act(async () => {
      createRoot(el).render(<ComingSoonClient />);
    });
    expect(getComingSoon("documents.citations")).toBeDefined();
  });

  it("the client entry is a 'use client' module", () => {
    expect(read("lib/coming-soon/ComingSoonClient.tsx")).toMatch(/^"use client";/);
  });

  it.each(["app/Providers.tsx", "features/applets-host/AppletProviders.tsx"])(
    "%s mounts <ComingSoonClient /> and does not rely on a server-side side-effect import",
    (file) => {
      const src = read(file);
      expect(src).toMatch(/<ComingSoonClient \/>/);
      expect(src).not.toMatch(/^import "@\/lib\/coming-soon\/registry";/m);
    },
  );

  it("every provider tree that mounts ConfirmDialogHost as a root also mounts ComingSoonClient", () => {
    for (const file of ["app/Providers.tsx", "features/applets-host/AppletProviders.tsx"]) {
      const src = read(file);
      if (src.includes("<ConfirmDialogHost />")) expect(src).toContain("<ComingSoonClient />");
    }
  });
});

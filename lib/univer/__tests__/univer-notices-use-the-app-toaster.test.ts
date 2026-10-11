/**
 * ONE TOASTER PER PAGE. Univer's own notification service mounts a second sonner
 * Toaster, so every toast on a workbook or document page showed twice (it was
 * hidden with a CSS rule until 2026-10-11). Both editors now replace the service
 * so Univer's notices go through the app's toast path and Univer mounts nothing.
 *
 * Breaks that turn this red: an editor that stops calling the router; the router
 * no longer replacing INotificationService; a notice that no longer reaches the
 * app toast (or reaches the wrong severity); the CSS hide coming back.
 */
import fs from "node:fs";
import path from "node:path";

const calls: Array<[string, unknown, unknown]> = [];
jest.mock("@/lib/toast", () => {
  const mk = (kind: string) => (title: unknown, opts: unknown) => {
    calls.push([kind, title, opts]);
    return `${kind}-id`;
  };
  return {
    toast: Object.assign(mk("default"), {
      success: mk("success"),
      error: mk("error"),
      info: mk("info"),
      warning: mk("warning"),
      message: mk("message"),
      dismiss: (id: unknown) => calls.push(["dismiss", id, undefined]),
    }),
  };
});
jest.mock("@univerjs/ui", () => ({ INotificationService: "INotificationService-token" }));
jest.mock("@univerjs/core", () => ({ toDisposable: (fn: () => void) => ({ dispose: fn }) }));

import { routeUniverNotificationsToApp, showUniverNotification } from "@/lib/univer/routeUniverNotificationsToApp";

const root = path.resolve(__dirname, "../../..");

it("replaces Univer's notification service, so Univer never mounts its own Toaster", () => {
  const replaced: unknown[] = [];
  const result = routeUniverNotificationsToApp({ replace: (dep) => replaced.push(dep) });
  expect(result.applied).toBe(true);
  expect(replaced).toHaveLength(1);
  const [token, provider] = replaced[0] as [unknown, { useValue: { show: unknown } }];
  expect(token).toBe("INotificationService-token");
  expect(provider.useValue.show).toBe(showUniverNotification);
  expect(routeUniverNotificationsToApp({}).applied).toBe(false);
});

it("shows a Univer notice as an app toast of the same severity, and dismisses it", () => {
  calls.length = 0;
  const handle = showUniverNotification({ title: "Paste limit", content: "Only 10,000 rows were pasted", type: "warning" });
  expect(calls[0]).toEqual(["warning", "Paste limit", { description: "Only 10,000 rows were pasted" }]);
  handle.dispose();
  expect(calls[1]).toEqual(["dismiss", "warning-id", undefined]);
  showUniverNotification({ title: "Copied" });
  expect(calls[2][0]).toBe("message");
});

it("both Univer editors route their notices, and no CSS hides a second toaster", () => {
  for (const file of ["features/workbooks/components/WorkbookEditor.tsx", "features/documents/components/DocumentEditor.tsx"]) {
    expect(fs.readFileSync(path.join(root, file), "utf8")).toMatch(/routeUniverNotificationsToApp\(/);
  }
  expect(fs.readFileSync(path.join(root, "app/globals.css"), "utf8")).not.toMatch(/\[data-sonner-toaster\]:not\(/);
});

/**
 * COLD OPEN (FIX-COLD-OPEN 2026-10-18): a Cloud Computer run that is still
 * provisioning was re-read every 2 s, so the tab learned its Chrome was live up
 * to ~3 s late on every cold open. A machine run is re-read every 750 ms; the
 * fleet keeps 2 s. Failed before this change (no such export).
 */
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => undefined }));
jest.mock("@/lib/hooks/useUser", () => ({ useUser: () => ({ userId: "u", activeUserName: "U" }) }));
jest.mock("./useWrittenProgress", () => ({ useWrittenProgress: () => ({ refreshProgress: jest.fn() }) }));
jest.mock("../service", () => ({}));

import { provisioningPollMs } from "./useCloudBrowser";

test("a Cloud Computer run is polled under a second; fleet starts keep 2 s", () => {
  expect(provisioningPollMs("sandbox")).toBeLessThan(1000);
  expect(provisioningPollMs(undefined)).toBe(2000);
});

/**
 * @jest-environment jsdom
 */
// AT-FIX-I: the route source calls the warm hook (it keeps the capture page offline-capable). Typing no
// longer mounts any lazy body: the old dialog hosts are summon overlays, loaded only when one is asked for.
import fs from "node:fs";
import path from "node:path";

it("the capture route calls the hook", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "app/(link)/capture/[sheetId]/page.tsx"), "utf8");
  expect(src).toMatch(/useWarmOfflineCode\(userId, sheetId\)/);
});

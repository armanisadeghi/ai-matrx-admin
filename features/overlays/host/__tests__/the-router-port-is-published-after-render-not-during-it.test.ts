import { readFileSync } from "node:fs";
import { join } from "node:path";

// The router bridge sets its PARENT's state; doing that in render is React's "Cannot update a component while
// rendering a different component" warning (walk 2026-10-17, D13). It must publish from an effect.
it("the router bridge publishes the port from an effect, never while rendering", () => {
  const src = readFileSync(join(__dirname, "..", "AppSummonProvider.tsx"), "utf8");
  const bridge = src.slice(src.indexOf("function RouterPortBridge"), src.indexOf("export function AppSummonProvider"));
  expect(bridge).toMatch(/useEffect\(\(\) => \{\s*onPort\(port\);/);
  expect(bridge).not.toMatch(/if \(published !== port\)/);
});

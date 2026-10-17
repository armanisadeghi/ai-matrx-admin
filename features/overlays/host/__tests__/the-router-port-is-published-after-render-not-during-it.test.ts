import { readFileSync } from "node:fs";
import { join } from "node:path";

// The router bridge publishes the Next router port; doing that in render is React's "Cannot update a component
// while rendering a different component" warning (walk 2026-10-17, D13). It must publish from an effect.
it("the router bridge publishes the port from an effect, never while rendering", () => {
  const src = readFileSync(join(__dirname, "..", "AppSummonRuntime.tsx"), "utf8");
  const bridge = src.slice(src.indexOf("function RouterPortBridge"), src.indexOf("export default function AppSummonRuntime"));
  expect(bridge).toMatch(/useEffect\(\(\) => setAppRouterPort\(port\), \[port\]\)/);
  expect(bridge).not.toMatch(/setAppRouterPort\(port\);\s*return null/);
});

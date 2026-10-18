// lib/perf/SpeedTestPage.tsx — THE EMPTY PAGE: the baseline instrument for "what does a route cost
// before it does anything?". Every `speed-test` route (`/speed-test`, `/<module>/speed-test`,
// `/administration/speed-test`) renders this and nothing else — no data, no client state — so every
// request, script and paint measured on it belongs to the shell and the module's own layout.
// Measure: `node scripts/speed-test-census.mjs` (results: docs/perf/speed-test-census.md).
// Kept out of search engines (noindex) and out of route discovery (utils/route-discovery/scan-fs.ts).
import type { Metadata } from "next";
import { LoadMark } from "@/lib/diagnostics/LoadMarkIsland";

export const speedTestMetadata: Metadata = {
  title: "Speed test",
  robots: { index: false, follow: false },
};

export function SpeedTestPage({ route }: { route: string }) {
  return (
    <div className="h-full overflow-hidden p-6" data-speed-test={route}>
      <LoadMark name={`page ${route}`} />
      <h1 className="type-title">Speed test {route}</h1>
    </div>
  );
}

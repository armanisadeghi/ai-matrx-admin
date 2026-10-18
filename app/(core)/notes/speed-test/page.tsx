// Empty baseline page — see lib/perf/SpeedTestPage.tsx.
import { SpeedTestPage, speedTestMetadata } from "@/lib/perf/SpeedTestPage";

export const metadata = speedTestMetadata;

export default function Page() {
  return <SpeedTestPage route="/notes/speed-test" />;
}

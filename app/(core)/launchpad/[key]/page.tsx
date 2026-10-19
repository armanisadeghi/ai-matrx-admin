// app/(core)/launchpad/[key]/page.tsx — THE MOUNT, AND NOTHING MORE. One of the person's launchpads by its key
// (bookmarkable); the screen is `LaunchpadPage` (features/launchpad).
import { LaunchpadPage } from "@/features/launchpad/components/LaunchpadPage";

export default async function LaunchpadKeyRoute({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <LaunchpadPage launchpadKey={decodeURIComponent(key)} />;
}

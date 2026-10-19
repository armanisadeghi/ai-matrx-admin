// record-view: none — addressed by a catalog key (key), not a record id
// app/(core)/launchpad/[key]/page.tsx — THE MOUNT, AND NOTHING MORE. One of the person's launchpads by its key
// (bookmarkable); the screen is `LaunchpadPage` (features/launchpad). The person's own launchpad is read here,
// on the server, so its saved layout is in the first HTML (loading.tsx streams while it is read).
import { LaunchpadPage } from "@/features/launchpad/components/LaunchpadPage";
import { readLaunchpadsOnServer } from "@/features/launchpad/server/readLaunchpads";

export default async function LaunchpadKeyRoute({ params }: { params: Promise<{ key: string }> }) {
  const [{ key }, server] = await Promise.all([params, readLaunchpadsOnServer()]);
  const launchpadKey = decodeURIComponent(key);
  const own = server?.pads.find((p) => p.key === launchpadKey) ?? null;
  return (
    <LaunchpadPage
      launchpadKey={launchpadKey}
      initial={own ? { title: own.title, savedAt: own.savedAt, doc: own.doc } : null}
      initialSiblings={server ? server.pads.map((p) => ({ key: p.key, title: p.title })) : null}
    />
  );
}

import PageHeader from "@/features/shell/components/header/PageHeader";
import { createRouteMetadata } from "@/utils/route-metadata";
import { readJsonCookie } from "../_lib/readLayoutCookie";
import { MountStateProvider } from "./MountStateProvider";
import { ConditionalHeaderControls } from "./HeaderControls";
import { ConditionalGroup } from "./ConditionalGroup";

export const metadata = createRouteMetadata(
  "/ssr/demos/resizables/05-conditional-panels",
  {
    title: "05 · Conditional panels (mount / unmount)",
    description:
      "Right panel is mounted vs unmounted (not just collapsed). Each combination of mounted panels remembers its own layout via useDefaultLayout({ id, panelIds }).",
  },
);

const TOGGLE_COOKIE = "panels:demo-05:toggles";

interface Toggles {
  showRight: boolean;
}

// SERVER COMPONENT. Reads only the toggle cookie server-side so the initial
// render mounts the correct set of panels (no flash of wrong layout).
//
// The actual <Group> uses useDefaultLayout({ panelIds }) on the client,
// which builds a different storage key per panel combination. Reading the
// matching combo's layout cookie server-side too is a future polish — the
// current trade-off is a brief client-only re-read on first paint, which is
// fine because we already mount the correct PANELS server-side.
export default async function ConditionalPanelsPage() {
  const toggles = await readJsonCookie<Toggles>(TOGGLE_COOKIE);
  const initialShowRight = toggles?.showRight ?? true;

  return (
    <MountStateProvider
      initialShowRight={initialShowRight}
      toggleCookie={TOGGLE_COOKIE}
    >
      <PageHeader>
        <ConditionalHeaderControls />
      </PageHeader>

      <div className="h-full overflow-hidden">
        <ConditionalGroup />
      </div>
    </MountStateProvider>
  );
}

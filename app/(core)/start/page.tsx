// app/(core)/start/page.tsx — the Start page moved into launchpads (custom-experience §5.2): it is the person's
// `start` launchpad now. Old links and bookmarks land there.
import { permanentRedirect } from "next/navigation";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";

export default function StartRoute() {
  permanentRedirect(launchpadHref("start"));
}

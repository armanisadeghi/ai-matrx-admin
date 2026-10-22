import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import UserLaunchpad from "@/features/launchpad/components/UserLaunchpad";
import { readLaunchpadsOnServer } from "@/features/launchpad/server/readLaunchpads";

export default function LaunchpadPage() {
  // Not awaited: the launcher streams at once; the "Your launchpads" strip fills from this read as it lands.
  const serverLaunchpads = readLaunchpadsOnServer().then((read) =>
    read ? { pads: read.pads.map((p) => ({ key: p.key, title: p.title })) } : null,
  );
  return (
    <>
      <RecordPageHeader level={{ name: "Launchpad" }} />
      <UserLaunchpad serverLaunchpads={serverLaunchpads} />
    </>
  );
}

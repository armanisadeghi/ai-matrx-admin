// Server half of Google One Tap: reads the auto-select knob (signed-out visitors cannot read knobs in
// the browser) and mounts the client prompt. Pass `organizationId` on a page that belongs to one
// organization (a shared agent page) so its own choice applies.

import { GoogleOneTap, type GoogleOneTapProps } from "./GoogleOneTap";
import { readOneTapAutoSelect } from "./oneTapAutoSelect.server";

export async function GoogleOneTapMount({
  organizationId,
  ...props
}: Omit<GoogleOneTapProps, "autoSelect"> & { organizationId?: string | null }) {
  const autoSelect = await readOneTapAutoSelect(organizationId);
  return <GoogleOneTap autoSelect={autoSelect} {...props} />;
}

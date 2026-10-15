// Phone composer — the REAL messages composer (MessagesComposerInput →
// ProTextarea inline controls) at phone and desktop widths, side by side, to
// check the compact shape: no mic device chevron and no emoji button at phone
// width, both at desktop width. Signed out on purpose: nothing here sends.
import { mapUserData } from "@/utils/userDataMapper";
import { LabSmartAddProviders } from "../smart-add-brand/LabSmartAddProviders";
import { LabPhoneComposer } from "./LabPhoneComposer";

export const metadata = { title: "Phone composer" };

export default function LabPhoneComposerPage() {
  return (
    <LabSmartAddProviders initialReduxState={{ user: mapUserData(null) }}>
      <LabPhoneComposer />
    </LabSmartAddProviders>
  );
}

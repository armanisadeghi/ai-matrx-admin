// record-view: none — a settings page (settings) inside a record or scope; the record's own page carries the section
import { SiteConfigurationWorkspace } from "@/features/marketing/components/settings/SiteConfigurationWorkspace";

/** Site settings — general. Sibling routes carry the other configuration views. */
export default function MarketingSiteSettingsPage() {
  return <SiteConfigurationWorkspace view="site" />;
}

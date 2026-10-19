// record-view: none — a sub-view (integrations) inside a record or scope, not the record page; the record's own page carries the section
import { SiteConfigurationWorkspace } from "@/features/marketing/components/settings/SiteConfigurationWorkspace";

export default function MarketingSiteIntegrationsPage() {
  return <SiteConfigurationWorkspace view="integrations" />;
}

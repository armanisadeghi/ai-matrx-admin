// record-view: none — a sub-view (studio) inside a record or scope, not the record page; the record's own page carries the section
// Reserved Marketing route. Body, copy, and status come from the shared
// placeholder — see features/marketing/components/MarketingComingSoon.tsx.
// The promise is tracked as `marketing.content-studio` in lib/coming-soon/registry.ts.

import { MarketingComingSoon } from "@/features/marketing/components/MarketingComingSoon";

export default function BrandContentStudioPage() {
  return <MarketingComingSoon comingSoonId="marketing.content-studio" />;
}

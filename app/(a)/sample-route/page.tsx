import ComingSoonTemplate from "@/components/coming-soon/CominSoonTemplate";

const HERO_TITLE_LINE_1 = "Building your sample";
const HERO_TITLE_LINE_2 = "autonomous future";
const STATUS_BADGE_TEXT = "An unforgettable sample page awaits";
const HERO_DESCRIPTION =
  "This is a sample page to test the coming soon template. It will be replaced with the actual page when the feature is ready.";

export default function Page() {
  return (
    <ComingSoonTemplate
      heroTitleLine1={HERO_TITLE_LINE_1}
      heroTitleLine2={HERO_TITLE_LINE_2}
      statusBadgeText={STATUS_BADGE_TEXT}
      description={HERO_DESCRIPTION}
    />
  );
}

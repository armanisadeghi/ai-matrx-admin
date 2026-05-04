import { StudioLandingHero } from "@/features/images/components/studio/StudioLandingHero";

/**
 * Image Studio landing page.
 *
 * Pure Server Component — entirely static, no client JS shipped for the
 * hero, feature grid, preset-category legend, or workflow walkthrough.
 * Interactivity lives in the sub-routes (/convert, /presets, /library).
 */
export default function ImageStudioLanding() {
    return (
        <main className="min-h-[calc(100dvh-2.5rem)] overflow-y-auto bg-background">
            <StudioLandingHero />
        </main>
    );
}

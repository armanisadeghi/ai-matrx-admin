"use client";

/**
 * The brand session: the whole screen is the card (VISION.md § The session screen). The canonical swipe deck
 * (`@ai-matrx/design-system/swipe-deck`) draws it, bound to `useBrandSessionDeck`, which writes every answer through
 * the one door it belongs to. The page agent reads the card in focus through the session surface; nothing on the
 * page names an agent.
 *
 * Continue: no next-stage workflow exists yet (positioning, story, voice and look are later stages), so the end of
 * the deck ends the sitting and returns to the brand. When a stage workflow exists, Continue starts it here,
 * person-fired, the way Discover starts `brand_discovery`.
 */

import { useRouter } from "next/navigation";
import { SwipeDeck } from "@ai-matrx/design-system/swipe-deck";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { CircleAlert } from "lucide-react";

import { useBrand } from "@/features/marketing/data/hooks";
import { useLiveBrand } from "@/features/marketing/components/brands/useLiveBrand";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import type { MarketingBrand } from "@/features/marketing/types";
import { BrandRoomSurface } from "@/features/marketing/components/brand/BrandRoomSurface";
import { createMarketingBrandSessionScope } from "@/features/surfaces/manifests/marketing-brand-session.manifest";
import { useBrandSessionDeck } from "./useBrandSessionDeck";

export const BRAND_SESSION_SURFACE = "matrx-user/marketing-brand-session";

function SessionDeck({ brand }: { brand: MarketingBrand }) {
  const router = useRouter();
  useLiveBrand(brand.id);
  const { binding, snapshot, proposeForCurrent, deckProps } = useBrandSessionDeck(brand);
  const back = () => router.push(marketingRoutes.brand(marketingSeg(brand)));

  const handlers = {
    session_propose_rewording: async (value: unknown) => {
      if (typeof value !== "string") throw new Error("A rewording is a string of words.");
      await proposeForCurrent(value);
    },
  };
  const buildScope = (base: Record<string, unknown>) =>
    createMarketingBrandSessionScope({
      ...(base as { brand_id: string }),
      session_current: snapshot.current,
      session_counts: snapshot.counts,
    });

  return (
    <BrandRoomSurface surfaceName={BRAND_SESSION_SURFACE} buildScope={buildScope} handlers={handlers}>
      <SwipeDeck
        binding={binding}
        layout="fullscreen"
        // Each card carries its own key, which would also draw its answers as rows under the text; the four edges
        // already are the answers, and the screen holds only the thing being asked about.
        choicesOnCard={false}
        categoryRows={deckProps.categoryRows}
        pickOne={deckProps.pickOne}
        pickAnswer={deckProps.pickAnswer}
        groupLabels={deckProps.groupLabels}
        onExit={back}
        tourKey="matrx.brand-session.tour"
        // The deck's own finish and empty screens; the page only adds its way back.
        endActions={<Button variant="primary" onClick={back}>Back to brand</Button>}
        empty={{
          title: "Nothing to decide",
          line: "Discover proposes candidates for this brand",
          action: <Button variant="primary" onClick={back}>Back to brand</Button>,
        }}
      />
    </BrandRoomSurface>
  );
}

export function BrandSessionPage({ brandId }: { brandId: string }) {
  const brand = useBrand(brandId);
  if (brand.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={<CircleAlert />}
          title="This brand could not be read"
          line={brand.error instanceof Error ? brand.error.message : String(brand.error)}
        />
      </div>
    );
  }
  if (!brand.data) return <RegionSkeleton shape="cards" count={1} aria-label="Loading the session" />;
  return <SessionDeck brand={brand.data} />;
}

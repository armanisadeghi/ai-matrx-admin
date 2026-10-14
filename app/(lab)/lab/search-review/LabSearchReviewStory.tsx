"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { closeOverlay, selectIsOverlayOpen, selectOverlayData } from "@/lib/redux/slices/overlaySlice";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { SmartAddWebRow } from "@/features/marketing/smart-add/SmartAddWebRow";
import type { WebChoice } from "@/features/marketing/smart-add/webKinds";
import { fixtureEvidence } from "@/features/marketing/smart-add/validate/fixtures";
import SearchReviewWindow from "@/features/window-panels/windows/search-review/SearchReviewWindow";

const KINDS: BrandRelationKind[] = [
  ["ours", "Ours", "ours"],
  ["review_site", "Review site", "about_us"],
  ["claimable_listing", "Listing we can claim", "about_us"],
  ["mention", "Mentions us", "about_us"],
  ["partner_page", "Partner or client page", "about_us"],
  ["founder", "Founder / owner", "associated"],
  ["parent_company", "Parent company", "associated"],
  ["competitor", "Competitor", "competitor"],
  ["not_us", "Not us", "not_us"],
  ["irrelevant", "Irrelevant", "irrelevant"],
].map(([key, label, stance]) => ({
  id: key,
  key,
  label,
  routesTo: null,
  isKnown: true,
  stance: stance as BrandRelationKind["stance"],
  description: null,
  hasSentiment: key === "mention",
  match: { hosts: [], paths: [], categories: [] },
}));

const ITEMS = fixtureEvidence();
const CTX = { ourHosts: ["fullspecstaff.com"], ourAccounts: [], name: "Full Spectrum Search Group" };

/** The lab has no AppShell, so the story mounts the window itself (the app's OverlayController does this). */
export function LabSearchReviewStory() {
  const dispatch = useAppDispatch();
  const [choices, setChoices] = useState<Record<string, WebChoice>>({});
  const isOpen = useAppSelector((s) => selectIsOverlayOpen(s, "searchReviewWindow"));
  const data = useAppSelector((s) => selectOverlayData(s, "searchReviewWindow")) as { sessionId?: string } | null;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="text-lg font-semibold">Review search results</h1>
      <SmartAddWebRow
        items={ITEMS}
        kinds={KINDS}
        choices={choices}
        ctx={CTX}
        onChoose={(item, choice) =>
          setChoices(({ [item.key]: _drop, ...rest }) => (choice ? { ...rest, [item.key]: choice } : rest))
        }
      />
      <pre className="text-xs text-muted-foreground" data-testid="lab-search-review-choices">
        {JSON.stringify(choices, null, 1)}
      </pre>
      {isOpen && data?.sessionId ? (
        <SearchReviewWindow
          isOpen
          sessionId={data.sessionId}
          onClose={() => dispatch(closeOverlay({ overlayId: "searchReviewWindow" }))}
        />
      ) : null}
    </main>
  );
}

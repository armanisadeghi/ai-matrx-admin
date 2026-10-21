"use client";

/**
 * Sign-up welcome — the two paid cards after "Looks right" (VISION Part 29: only when a business website is
 * confirmed): what buyers search for (the site's ranked keywords) and a competitor (the domain that ranks beside it on
 * those keywords). Both through the domain page's own door (`useDomainSection`, seo_domain): each first asks for a
 * free stored result, and only then runs the paid read, through the organization's spend approval when it asks.
 * The host decides whether this mounts at all (welcomeSession.paidCardsHost).
 * "What buyers search" shows at most three terms that are not their own name (welcomeSession.buyerTerms). Both slots
 * are there from the first frame: a card that ends with nothing to say settles into the quiet "Not sure" in the same
 * box (the found grid's Slot does the same), so nothing below it ever moves.
 */

import { useEffect, useRef } from "react";
import { categoriesFor, liveKnownDomainRules } from "@/lib/web-domains/registry";
import { KeyRound, Swords } from "lucide-react";
import { useDomainSection } from "@/features/marketing/seo/domain-research/useDomainSection";
import { seedKeywords } from "@/features/marketing/seo/domain-research/DomainResearchPage";
import { CardBody } from "../found/FoundStage";
import { FitText } from "../found/FitText";
import { buyerTerms } from "./welcomeSession";
import found from "../found/found.module.css";

type Section = ReturnType<typeof useDomainSection>;

/** A section with no stored result runs once, by itself: the person already said this site is theirs. */
function useAutoBuy(section: Section) {
  const bought = useRef(false);
  const notStored = section.state.kind === "not_stored" && section.state.note === null;
  useEffect(() => {
    if (!notStored || bought.current) return;
    bought.current = true;
    void section.buy();
  }, [notStored, section]);
}

function SearchResultCard({ id, section, label, icon, value, domain }: { id: string; section: Section; label: string; icon: React.ReactNode; value: string | null; domain?: boolean }) {
  const waiting = section.state.kind === "loading" || section.state.kind === "idle" || (section.state.kind === "not_stored" && section.state.note === null);
  return (
    <div className="min-h-[8.5rem]" data-found-card={id} data-state={value ? "filled" : waiting ? "waiting" : "retired"}>
      {value ? (
        <CardBody icon={icon} label={label} value={<span className="text-[1.3rem] sm:text-[1.45rem]">{domain ? <FitText text={value} /> : value}</span>} />
      ) : waiting ? (
        <div aria-hidden className={`${found.waiting} h-full min-h-[8.5rem] rounded-3xl`} />
      ) : (
        <div className={`${found.quiet} flex h-full min-h-[8.5rem] flex-col justify-end gap-1 rounded-3xl p-5 sm:p-6`}>
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            {icon}
            {label}
          </span>
          <span className="text-lg text-disabled-foreground">Not sure</span>
        </div>
      )}
    </div>
  );
}

export function WelcomeSearchCards({ host, names }: { host: string; names: readonly string[] }) {
  const keywords = useDomainSection("ranked_keywords", { target: host });
  useAutoBuy(keywords);
  const rows = keywords.state.kind === "ready" ? keywords.state.data.rows : [];
  const seeds = seedKeywords(rows);
  const competitors = useDomainSection("serp_competitors", seeds.length ? { keywords: seeds } : null);
  useAutoBuy(competitors);
  const top = buyerTerms(seedKeywords(rows, rows.length), names);
  const rival =
    competitors.state.kind === "ready"
      ? (competitors.state.data.rows
          .map((r) => r.domain)
          // A known kind of site (a reference, a social network, a marketplace…) ranks beside anyone: never a competitor.
          .find((d) => d && d.replace(/^www\./, "") !== host.replace(/^www\./, "") && !categoriesFor(d, liveKnownDomainRules() ?? []).length) ?? null)
      : null;
  const noKeywords = keywords.state.kind === "ready" && rows.length === 0;
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" data-testid="welcome-search-cards">
      <SearchResultCard
        id="competitor"
        section={noKeywords ? keywords : competitors}
        label="A competitor"
        icon={<Swords className="size-4" />}
        value={rival}
        domain
      />
      <SearchResultCard id="buyers" section={keywords} label="What buyers search" icon={<KeyRound className="size-4" />} value={top.length ? top.join(" · ") : null} />
      {keywords.approvalDialog}
      {competitors.approvalDialog}
    </section>
  );
}

import { redirect } from "next/navigation";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { IntelligenceIndex } from "@/features/mandates/feature-intelligence/IntelligenceIndex";
import { splitQuery } from "@/features/mandates/feature-intelligence/IntelligenceTargetRoute";
import {
  mandateDestination,
  readServerTree,
} from "@/features/mandates/feature-intelligence/resolve-destination";
import { createRouteMetadata } from "@/utils/route-metadata";
import { loginHref } from "@/utils/auth/auth-destination";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

/**
 * /intelligence — every AI job, grouped by the registry: a section per Domain,
 * a card per Feature, then Everywhere, the owner lanes and Unplaced
 * (features/mandates/feature-intelligence). `?mandate=<key>` is every job
 * link's door: it reads the job's node and redirects there (or to the research
 * topic's page when the link carries `topicId`), carrying every other param.
 * `?domain=<slug>` scrolls to one Domain.
 */

export const metadata = createRouteMetadata("/mandates", {
  title: "Intelligence",
  description: "Every AI job in the app, by domain and feature.",
  letter: "IN",
});

export default async function IntelligenceIndexRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [verdict, query] = await Promise.all([getSessionVerdict(), searchParams]);
  const domain = typeof query.domain === "string" ? query.domain : null;
  if (!verdict.isAuthenticated) {
    const search = new URLSearchParams();
    for (const [name, raw] of Object.entries(query)) {
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value) search.set(name, value);
    }
    const qs = search.toString();
    redirect(loginHref(qs ? `/intelligence?${qs}` : "/intelligence"));
  }
  const { focus, context } = splitQuery(query);
  if (focus) {
    const { domain: _domain, ...rest } = context;
    redirect(await mandateDestination(focus, rest, verdict.user.id, await readServerTree()));
  }
  return (
    <>
      <RecordPageHeader record={{ name: "Intelligence" }} />
      <div className="h-full overflow-y-auto overflow-x-hidden pt-[var(--shell-header-h)]">
        <IntelligenceIndex focusDomain={domain} />
      </div>
    </>
  );
}

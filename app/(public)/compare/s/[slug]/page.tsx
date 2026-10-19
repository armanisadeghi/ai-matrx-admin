// record-view: none — addressed by a catalog key (slug), not a record id
// app/(public)/compare/s/[slug]/page.tsx — a shared comparison, public. Anyone, signed out, can open it.
// Server-rendered from the public payload: title, description and the social card come from the result,
// and search engines may index it (the comparison.public.share_indexable knob, on by default).
// Feature: features/comparison/public/.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { INDEXED_ROBOTS, NOT_INDEXED_ROBOTS } from "@/lib/seo/search-engine-indexed";
import { getSharedComparison } from "@/features/comparison/public/fetch.server";
import { SharedComparison } from "@/features/comparison/public/SharedComparison";
import { fetchedOn } from "@/features/comparison/public/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedComparison(slug);
  if (!shared) return { title: "Comparison not found", robots: NOT_INDEXED_ROBOTS };
  const path = `/compare/s/${shared.slug}`;
  const when = fetchedOn(shared.fetchedAt);
  const description = when ? `${shared.description} Facts fetched ${when}.` : shared.description;
  return {
    // the root layout's title template adds the brand
    title: shared.title,
    description,
    alternates: { canonical: path },
    robots: shared.policy.indexable ? INDEXED_ROBOTS : NOT_INDEXED_ROBOTS,
    openGraph: { title: shared.title, description, type: "article", url: path, siteName: "AI Matrx" },
    twitter: { card: "summary_large_image", title: shared.title, description },
  };
}

export default async function SharedComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const shared = await getSharedComparison(slug);
  if (!shared) notFound();
  const { isAuthenticated } = await getServerAuth();
  // comparison.public.view_requires_account: an organization may keep its shared comparisons behind an account.
  if (shared.policy.viewRequiresAccount && !isAuthenticated) {
    redirect(`/sign-up?redirectTo=${encodeURIComponent(`/compare/s/${shared.slug}`)}`);
  }
  return <SharedComparison shared={shared} signedIn={isAuthenticated} />;
}

// record-view: none — addressed by a slug, not a record id
// app/(link)/chart/[slug]/page.tsx — A PUBLISHED ORG CHART, OPENED BY ANYONE.
//
// Somebody published their org chart (or one branch of it) from /agents/org-chart and sent the
// address to a colleague. It lives in `(link)` because it is a link somebody SENT — no marketing
// header or footer, no shell — but unlike a sent form it is meant to be found: indexed, with an OG
// card and JSON-LD. It renders the stored snapshot through the ONE org chart primitive, read-only.
// One 404 answers a page taken down, removed or never made.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/extras/site";
import { PublishedChartConversation } from "@/features/agents/org-chart/publish/PublishedChartConversation";
import { PublishedOrgChart } from "@/features/agents/org-chart/publish/PublishedOrgChart";
import { readPublishedOrgChart, readViewerAndCreator } from "@/features/agents/org-chart/publish/publicRead";
import { countBoxes, type PublicOrgBox } from "@/features/agents/org-chart/publish/snapshot";
import { signUpHref } from "@/utils/auth/auth-destination";

// A page its owner may republish or take down at any moment: never cached across people.
export const dynamic = "force-dynamic";

const pathOf = (slug: string) => `/chart/${slug}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const chart = await readPublishedOrgChart(slug).catch(() => null);
  if (!chart) return { title: "Not found · AI Matrx", robots: { index: false, follow: false } };
  const description = chart.blurb ?? `The org chart of ${chart.title}: people, AI agents and who works with whom.`;
  const url = `${siteConfig.url}${pathOf(slug)}`;
  return {
    title: `${chart.title} — Org chart · AI Matrx`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${chart.title} — Org chart`, description, url, type: "article", siteName: "AI Matrx" },
    twitter: { card: "summary_large_image", title: `${chart.title} — Org chart`, description },
    robots: { index: true, follow: true },
  };
}

function itemList(roots: PublicOrgBox[]): { name: string; description?: string }[] {
  const out: { name: string; description?: string }[] = [];
  const walk = (b: PublicOrgBox) => {
    out.push(b.sublabel ? { name: b.label, description: b.sublabel } : { name: b.label });
    b.children.forEach(walk);
  };
  roots.forEach(walk);
  return out.slice(0, 200);
}

export default async function PublishedOrgChartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chart = await readPublishedOrgChart(slug);
  if (!chart) notFound();
  const { viewerId, creatorId } = await readViewerAndCreator(chart.id);
  const url = `${siteConfig.url}${pathOf(slug)}`;
  const boxes = countBoxes(chart.snapshot);

  return (
    <main className="matrx-touch-targets mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 pb-safe pt-6 sm:px-6 sm:pt-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: chart.title,
          ...(chart.blurb ? { description: chart.blurb } : {}),
          url,
          numberOfItems: boxes,
          itemListElement: itemList(chart.snapshot.roots).map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
          })),
        }}
      />
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold text-foreground">{chart.title}</h1>
        {chart.blurb ? <p className="max-w-3xl whitespace-pre-line text-base text-foreground">{chart.blurb}</p> : null}
        <p className="type-secondary text-muted-foreground">
          {chart.creatorName ? `Made by ${chart.creatorName} · ` : ""}
          {boxes} {boxes === 1 ? "box" : "boxes"}
        </p>
      </header>
      <div className="h-[70dvh] min-h-[420px] overflow-hidden rounded-xl border border-border bg-textured">
        <PublishedOrgChart snapshot={chart.snapshot} title={chart.title} />
      </div>
      <PublishedChartConversation
        publicationId={chart.id}
        slug={chart.slug}
        title={chart.title}
        creatorName={chart.creatorName}
        viewerId={viewerId}
        creatorId={creatorId}
      />
      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 type-secondary text-muted-foreground">
        <span>Made with AI Matrx — org charts of people and AI agents.</span>
        <Link href={signUpHref("/agents/org-chart")} className="font-medium text-foreground underline underline-offset-2">
          Make your own
        </Link>
      </footer>
    </main>
  );
}

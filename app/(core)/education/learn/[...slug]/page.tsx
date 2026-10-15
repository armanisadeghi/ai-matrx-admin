import type { Metadata } from "next";
import { NOT_INDEXED_ROBOTS } from "@/lib/seo/search-engine-indexed";
import { searchEngineRobots } from "@/lib/seo/search-engine-indexed.server";
import { notFound } from "next/navigation";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { LearnArticle } from "@/features/education/components/LearnArticle";
import { EDU_ORIGIN } from "@/features/education/constants";
import {
  getPublishedLearnDoc,
  listPublishedLearnDocs,
} from "@/features/education/publishing/queries";

type Props = { params: Promise<{ slug: string[] }> };

// ISR: statically generate every published doc; render new slugs on demand,
// and revalidate against a publish via the LEARN_DOCS_TAG (queries.ts).
export const dynamicParams = true;
export const revalidate = 3600;

// A slow or unreachable database at BUILD time must never fail the release
// (v0.4.3266 died on a 9s restDeadline here). Pre-rendering is an
// optimisation: with dynamicParams every slug still renders on demand, and the
// request-time read keeps its loud throw. So the build screams and continues.
export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  try {
    const docs = await listPublishedLearnDocs();
    return docs.map((d) => ({ slug: d.slug.split("/") }));
  } catch (err) {
    console.error(
      "[education/learn] generateStaticParams: published list unavailable at build; pre-rendering NO learn docs (they render on demand):",
      err,
    );
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedLearnDoc(slug.join("/"));
  if (!doc) {
    const missing = createDynamicRouteMetadata("/education", {
      title: "Study guide",
      description: "AI Matrx Education",
      letter: "Lr",
      metadataBase: EDU_ORIGIN,
    });
    return { ...missing, robots: NOT_INDEXED_ROBOTS };
  }
  const slugPath = slug.join("/");
  const meta = createDynamicRouteMetadata("/education", {
    title: doc.title,
    description: doc.summary,
    letter: doc.letter,
    keywords: doc.keywords,
    canonicalPath: `/education/learn/${slugPath}`,
    ogImage: `/education/learn/og/${slugPath}`,
    metadataBase: EDU_ORIGIN,
  });
  // THE INDEXED SWITCH (access ladder T-12): learning articles default to indexed.
  return { ...meta, robots: await searchEngineRobots([{ type: "learn_doc", key: slugPath }]) };
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const doc = await getPublishedLearnDoc(slug.join("/"));
  if (!doc) notFound();
  return <LearnArticle doc={doc} />;
}

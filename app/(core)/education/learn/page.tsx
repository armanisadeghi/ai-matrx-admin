import { createRouteMetadata } from "@/utils/route-metadata";
import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";
import { AuthedWorkspaceCTA } from "@/features/auth/components/module-landing/AuthedWorkspaceCTA";
import { EduHero } from "@/features/education/components/sections/EduHero";
import { SectionRenderer } from "@/features/education/components/sections/SectionRenderer";
import { listPublishedLearnDocs } from "@/features/education/publishing/queries";
import {
  EDU_WORKSPACE_HREF,
  EDU_WORKSPACE_LABEL,
  eduHref,
} from "@/features/education/constants";
import { BookOpen } from "lucide-react";
import type { EduSection } from "@/features/education/types";
import { LearnIndexSurface } from "@/features/education/publishing/components/LearnIndexSurface";
import type { LearnGuideLibraryRow } from "@/features/surfaces/manifests/education-learn.manifest";

// ISR: the index reflects the published set, revalidated on publish via tag.
export const revalidate = 3600;

export const metadata = createRouteMetadata("/education", {
  titlePrefix: "Study Guides",
  title: "Education",
  description:
    "In-depth study guides and topic explainers — clear content on the subjects you're learning, with one-click paths to study them in the app.",
  letter: "Lr",
  canonicalPath: "/education/learn",
});

export default async function EducationLearnPage() {
  const docs = await listPublishedLearnDocs();
  const guides: LearnGuideLibraryRow[] = docs.map((d) => ({
    title: d.title,
    summary: d.summary,
    href: eduHref("learn", d.slug),
    subject: d.subject ?? null,
    updated: d.updated,
  }));
  // No section heading: the hero already names the page, and the grid is the
  // offer. No status pill: every guide here is published, so it never varies.
  const sections: EduSection[] = [
    {
      kind: "status-cards",
      cards: guides.map((g) => ({
        title: g.title,
        description: g.summary,
        href: g.href,
        icon: BookOpen,
      })),
    },
  ];
  return (
    <MarketingPageShell>
      <AuthedWorkspaceCTA
        workspaceHref={EDU_WORKSPACE_HREF}
        workspaceLabel={EDU_WORKSPACE_LABEL}
      />
      <LearnIndexSurface guides={guides}>
        <EduHero
          eyebrow="AI Matrx Education"
          eyebrowIcon={BookOpen}
          title="Study guides"
          titleAccent="that actually teach"
          description="In-depth, free explainers on the subjects and exams you're tackling — then study them with the full AI Matrx toolkit."
          primary={{ label: "Start studying free", href: eduHref() }}
          primarySignedIn={null}
        />
        <SectionRenderer sections={sections} />
      </LearnIndexSurface>
    </MarketingPageShell>
  );
}

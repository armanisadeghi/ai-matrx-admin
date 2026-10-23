import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const backendUrl = AIDREAM_PRODUCTION_URL;

export const metadata = createRouteMetadata("/research", {
  title: "Research",
  description:
    "AI-powered research pipeline — gather web content, analyze sources, and synthesize reports.",
  letter: "R",
  additionalMetadata: {
    alternates: { canonical: "/research" },
    robots: { index: true, follow: true },
  },
});

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {supabaseUrl && (
        <>
          <link rel="preconnect" href={supabaseUrl} />
          <link rel="dns-prefetch" href={supabaseUrl} />
        </>
      )}
      <link rel="preconnect" href={backendUrl} />
      <link rel="dns-prefetch" href={backendUrl} />
      {children}
    </>
  );
}

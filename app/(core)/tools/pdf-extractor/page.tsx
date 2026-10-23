import { redirect } from "next/navigation";
import PdfExtractorLanding from "@/features/auth/components/module-landing/landings/PdfExtractorLanding";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import PdfDocRedirect from "./PdfDocRedirect";

/**
 * /tools/pdf-extractor — a redirect only. The extractor studio is folded into the PDF workspace
 * (PDF-PLAN U7 to U9): a file opens at /pdf/<fileId>, the document list is the /pdf front door. This route
 * stays because old links exist (the navigation, the surface prefix, saved bookmarks).
 */
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ file?: string; doc?: string }>;
}

export default async function PdfExtractorRedirectPage({ searchParams }: PageProps) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) return <PdfExtractorLanding />;
  const { file, doc } = await searchParams;
  if (file) redirect(`/pdf/${encodeURIComponent(file)}`);
  if (doc) return <PdfDocRedirect documentId={doc} />;
  redirect("/pdf");
}

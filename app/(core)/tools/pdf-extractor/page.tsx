import { Suspense } from "react";
import { redirect } from "next/navigation";
import PdfStudioRouteClient from "./PdfStudioRouteClient";
import PdfExtractorLanding from "@/features/auth/components/module-landing/landings/PdfExtractorLanding";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

/**
 * /tools/pdf-extractor
 *
 * Server-component shell. The actual studio is a client component
 * (`PdfStudioRouteClient`) that picks desktop vs mobile and dynamically
 * imports the heavy reader. This shell exists only to give Next a
 * stable route boundary and a server-rendered frame so there's no CLS
 * while the dynamic import resolves.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  /** `?doc=<processed_documents.id>` opens that document in the PDF tools
   *  (the Source screen's "PDF tools" action); `?file=` extracts a file. */
  searchParams: Promise<{ file?: string; doc?: string }>;
}

export default async function PdfExtractorStudioPage({
  searchParams,
}: PageProps) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) return <PdfExtractorLanding />;
  const { file, doc } = await searchParams;
  // A file opens in the PDF workspace. The studio below stays for processed documents (`?doc=`) and the
  // document list, whose AI clean / chunker / stores / lineage tools are not in the workspace yet.
  if (file && !doc) redirect(`/pdf/${encodeURIComponent(file)}`);
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <Suspense fallback={null}>
        <PdfStudioRouteClient
          initialDocumentId={doc}
          initialSourceFileId={doc ? undefined : file}
        />
      </Suspense>
    </div>
  );
}

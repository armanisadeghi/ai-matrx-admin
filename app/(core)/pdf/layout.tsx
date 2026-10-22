import { FileText } from "lucide-react";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";

/** Guests see the sign-in gate; signed-in people get the PDF pages. */
export default async function PdfLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="PDF"
        route="/pdf"
        description="Read, organize, redact, compress and sign PDFs in one workspace."
        icon={FileText}
      />
    );
  }
  return children;
}

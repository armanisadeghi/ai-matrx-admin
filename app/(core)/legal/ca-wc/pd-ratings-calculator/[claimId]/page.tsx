// record-view: none — a saved-case calculator, not a record page
import { SavedCaseLoader } from "@/features/legal/wc/pd-ratings/SavedCaseLoader";


interface SavedCasePageProps {
  params: Promise<{ claimId: string }>;
}

export default async function SavedCasePage({ params }: SavedCasePageProps) {
  const { claimId } = await params;
  return <SavedCaseLoader claimId={claimId} />;
}

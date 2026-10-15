// app/(core)/data/bases/[homeId]/page.tsx — one Base.
import { BasePage } from "@/features/unified-data/base/BaseScreens";

export default async function BaseRoutePage({ params }: { params: Promise<{ homeId: string }> }) {
  const { homeId } = await params;
  return <BasePage homeId={homeId} />;
}

import { Suspense } from "react";
import { WatchtowerPage } from "@/features/admin/watchtower/WatchtowerPage";

export default function WatchtowerRoute() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">
      <Suspense fallback={null}>
        <WatchtowerPage />
      </Suspense>
    </div>
  );
}

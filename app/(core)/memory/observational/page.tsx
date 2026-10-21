// /memory/observational — the Memory Inspector (observational memory) as a page.
import { Suspense } from "react";
import { ObservationalMemoryPage } from "@/features/memory/pages/ObservationalMemoryPage";

export default function MemoryObservationalRoute() {
  return (
    <Suspense fallback={null}>
      <ObservationalMemoryPage />
    </Suspense>
  );
}

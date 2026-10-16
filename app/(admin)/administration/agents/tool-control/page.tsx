import { Suspense } from "react";
import { ToolControlPage } from "@/features/admin/tool-control/ToolControlPage";

export default function ToolControlRoute() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">
      <Suspense fallback={null}>
        <ToolControlPage />
      </Suspense>
    </div>
  );
}

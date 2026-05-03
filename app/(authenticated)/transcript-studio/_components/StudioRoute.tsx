"use client";

import { useSearchParams } from "next/navigation";
import { StudioView } from "@/features/transcript-studio/components/StudioView";

interface StudioRouteProps {
  defaultColumnLayout?: Record<string, number>;
}

export function StudioRoute({ defaultColumnLayout }: StudioRouteProps) {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("session");

  return (
    <StudioView
      config={{
        containerVariant: "page",
        showSidebar: true,
        showSettings: true,
        initialSessionId,
        defaultColumnLayout,
      }}
    />
  );
}

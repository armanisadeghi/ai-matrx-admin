"use client";

import { ErrorBoundaryView } from "@/components/errors/ErrorBoundaryView";

const ROUTE_CONTEXT = "Replace With Custom Route Name or Context";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryView error={error} reset={reset} context={ROUTE_CONTEXT} />
  );
}

"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentsListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Agents list error:", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center text-center space-y-4 max-w-md">
        <div className="p-3 bg-destructive/10 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Failed to load agents</h2>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}

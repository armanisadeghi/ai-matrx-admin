"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotesError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Notes error:", error);
    }, [error]);

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex items-center justify-center p-8">
            <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
                <div className="p-3 bg-destructive/10 rounded-full">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                    <h2 className="text-base font-semibold mb-1">Failed to load notes</h2>
                    <p className="text-muted-foreground text-xs">{error.message}</p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground/50 mt-1">
                            {error.digest}
                        </p>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                </Button>
            </div>
        </div>
    );
}

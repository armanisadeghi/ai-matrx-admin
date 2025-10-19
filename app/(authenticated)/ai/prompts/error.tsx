"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PromptsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <Card className="h-full w-full bg-textured border-none shadow-lg">
            <div className="p-8 md:p-12">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                        {error.message || "An error occurred while loading prompts"}
                    </p>
                    <Button
                        onClick={reset}
                        className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        </Card>
    );
}


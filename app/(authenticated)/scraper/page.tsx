"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScraperSocket } from "@/lib/redux/socket-io/hooks/useScraperSocket";
import { Globe, Search, Loader2, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectTaskStatus } from "@/lib/redux/socket-io";

export default function Page() {
    const router = useRouter();
    const { quickScrapeUrl } = useScraperSocket();
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get task status from Redux
    const taskStatus = useAppSelector(state => 
        currentTaskId ? selectTaskStatus(state, currentTaskId) : null
    );
    
    const isTaskRunning = taskStatus === "submitted";
    const isTaskCompleted = taskStatus === "completed";

    // Auto-navigate to results page when scraping completes
    useEffect(() => {
        if (isTaskCompleted && currentTaskId) {
            // Add a small delay to show the completed state briefly
            const timer = setTimeout(() => {
                router.push(`/scraper/${currentTaskId}`);
            }, 1500);
            
            return () => clearTimeout(timer);
        }
    }, [isTaskCompleted, currentTaskId, router]);

    const handleScrape = async () => {
        // If task is completed, navigate to results
        if (isTaskCompleted && currentTaskId) {
            router.push(`/scraper/${currentTaskId}`);
            return;
        }

        if (!url.trim()) {
            setError("Please enter a URL");
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError("Please enter a valid URL");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const taskId = await quickScrapeUrl(url);
            setCurrentTaskId(taskId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start scraping");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setCurrentTaskId(null);
        setUrl("");
        setError(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isLoading) {
            handleScrape();
        }
    };

    return (
        <div className="min-h-screen bg-textured">
            {/* Compact Input Row */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-textured">
                <div className="flex gap-3 items-center max-w-6xl mx-auto">
                    <div className="flex-1">
                        <Input
                            type="url"
                            placeholder="Enter URL to scrape..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="text-base"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleScrape}
                        disabled={isLoading || !url.trim()}
                        className={`px-6 transition-all duration-300 ${
                            isTaskCompleted 
                                ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                                : ""
                        }`}
                    >
                        {isLoading || isTaskRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Scraping...
                            </>
                        ) : isTaskCompleted ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                View Results
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2" />
                                Scrape
                            </>
                        )}
                    </Button>
                    {currentTaskId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="text-gray-600 dark:text-gray-400"
                        >
                            Clear
                        </Button>
                    )}
                </div>
                {error && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md max-w-6xl mx-auto">
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* Results will be shown on dedicated results page */}
        </div>
    );
}

"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScraperResultsComponent from "@/features/scraper/ScraperResultsComponent";

export default function ScraperResultPage() {
    const params = useParams();
    const router = useRouter();
    const taskId = params.id as string;

    // TODO: In the future, this could fetch from database if task doesn't exist in Redux
    // const [resultData, setResultData] = useState(null);

    const handleBackToScraper = () => {
        router.push("/scraper");
    };

    const handleNewScrape = () => {
        router.push("/scraper");
    };

    return (
        <div className="min-h-screen bg-textured">
            {/* Header Bar */}
            <div className="p-4 border-b border-border bg-textured">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={handleBackToScraper}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Scraper
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Scraper Results
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Task ID: {taskId}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const url = window.location.href;
                                navigator.clipboard.writeText(url);
                                // Could add toast notification here
                            }}
                            className="flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Copy Link
                        </Button>
                        <Button
                            onClick={handleNewScrape}
                            className="flex items-center gap-2"
                        >
                            New Scrape
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Section - Full Width */}
            <div className="w-full">
                <ScraperResultsComponent taskId={taskId} />
            </div>
        </div>
    );
}

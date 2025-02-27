"use client";
import React, { useEffect, useState } from "react";
import { PageTemplate, Card, FileTextIcon } from "@/features/scraper/parts/reusable/PageTemplate";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { RecipeTaskData } from "@/lib/redux/socket/recipe-class/RecipeTaskData";
import { RecipeTaskManager } from "@/lib/redux/socket/recipe-class/RecipeTaskManager";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { CheckSquare, AlertTriangle, Table, FileText, ClipboardList, Search, AlertCircle, ListChecks, Star } from "lucide-react";
import { parseFactCheck } from "./fact-check-parsing-util";

interface FactCheckerPageProps {
    value: string;
    overview?: any;
}

const FactCheckerPage: React.FC<FactCheckerPageProps> = ({ value, overview = {} }) => {
    const [streamingResponse, setStreamingResponse] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const recipeIdFactChecker = "07e85962-71c8-4a2d-acb0-80d1771a4594";
    const brokerId = "59dd12d8-8bec-40ae-af24-09d2cf28a806";
    const taskManager = new RecipeTaskManager();

    // Get page details from overview if available
    const pageTitle = overview?.page_title || "Content";
    const characterCount = overview?.char_count ? overview.char_count.toLocaleString() : "N/A";
    const pageUrl = overview?.url;

    useEffect(() => {
        let unsubscribe: () => void;

        const runTask = async () => {
            setIsLoading(true);
            setStreamingResponse("");

            try {
                const taskData = new RecipeTaskData(recipeIdFactChecker, 1)
                    .setModelOverride("gpt-4o-mini")
                    .addBroker({ id: brokerId, name: brokerId, value });

                const eventName = await taskManager.runRecipeTask(taskData);
                unsubscribe = taskManager.getSocketManager().subscribeToEvent(eventName, (response: any) => {
                    console.log(`[FactChecker] Response for ${eventName}:`, response);
                    if (response?.data) {
                        setStreamingResponse((prev) => prev + response.data);
                    } else if (typeof response === "string") {
                        setStreamingResponse((prev) => prev + response);
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                console.error("[FactChecker] Task failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Only run if value is a non-empty string
        if (value && value.trim().length > 0) {
            console.log("[FactChecker] value:", value);
            runTask();
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [value]);

    // Parse the full response once and use the parsed content
    const parsedContent = React.useMemo(() => {
        if (!streamingResponse) return null;
        return parseFactCheck(streamingResponse);
    }, [streamingResponse]);

    // Get the trustworthiness rating for stats
    const rating = parsedContent?.ratingValue || 0;

    // Loading state component
    const LoadingState = ({ title }: { title: string }) => (
        <Card title={title}>
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        </Card>
    );

    // Error state component
    const ErrorState = () => (
        <Card title="Error">
            <div className="text-red-500 p-4">Error: {error}</div>
        </Card>
    );

    // Empty state component
    const EmptyState = ({ message }: { message: string }) => <p className="text-gray-500 dark:text-gray-400 text-center py-8">{message}</p>;

    // Full analysis component
    const FullAnalysisContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Checking Facts" />;

        return (
            <Card title="Complete Fact Check Analysis">
                <MarkdownRenderer
                    content={streamingResponse || "Analysis will appear here..."}
                    type="message"
                    fontSize={18}
                    role="assistant"
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                />
            </Card>
        );
    };

    // Summary component
    const SummaryContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Generating Summary" />;

        return (
            <Card title="Fact Check Summary">
                <div className="p-4">
                    {parsedContent?.summary ? (
                        <MarkdownRenderer
                            content={parsedContent.summary}
                            type="message"
                            fontSize={18}
                            role="assistant"
                            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-300 dark:border-gray-700"
                        />
                    ) : (
                        <EmptyState message={streamingResponse ? "No summary found" : "Summary will appear here..."} />
                    )}

                    {parsedContent?.overallRating && (
                        <MarkdownRenderer
                            content={parsedContent.overallRating}
                            type="message"
                            fontSize={18}
                            role="assistant"
                            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                        />
                    )}
                </div>
            </Card>
        );
    };

    // General Observations component
    const GeneralObservationsContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Analyzing Content" />;

        return (
            <Card title="General Observations">
                {parsedContent?.generalObservations ? (
                    <MarkdownRenderer
                        content={parsedContent.generalObservations}
                        type="message"
                        fontSize={18}
                        role="assistant"
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                    />
                ) : (
                    <EmptyState message={streamingResponse ? "No general observations found" : "Observations will appear here..."} />
                )}
            </Card>
        );
    };

    // Specific Claims Analysis component
    const SpecificClaimsContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Analyzing Claims" />;

        return (
            <Card title="Specific Claims Analysis">
                {parsedContent?.specificClaimsAnalysis ? (
                    <MarkdownRenderer
                        content={parsedContent.specificClaimsAnalysis}
                        type="message"
                        fontSize={18}
                        role="assistant"
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                    />
                ) : (
                    <EmptyState message={streamingResponse ? "No claims analysis found" : "Claims analysis will appear here..."} />
                )}
            </Card>
        );
    };

    // Potential Concerns component
    const ConcernsContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Identifying Concerns" />;

        return (
            <Card title="Potential Concerns">
                {parsedContent?.potentialConcerns ? (
                    <MarkdownRenderer
                        content={parsedContent.potentialConcerns}
                        type="message"
                        fontSize={18}
                        role="assistant"
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                    />
                ) : (
                    <EmptyState message={streamingResponse ? "No concerns identified" : "Concerns will appear here..."} />
                )}
            </Card>
        );
    };

    // Recommendations component
    const RecommendationsContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Generating Recommendations" />;

        return (
            <Card title="Recommendations">
                {parsedContent?.recommendations ? (
                    <MarkdownRenderer
                        content={parsedContent.recommendations}
                        type="message"
                        fontSize={18}
                        role="assistant"
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700"
                    />
                ) : (
                    <EmptyState message={streamingResponse ? "No recommendations found" : "Recommendations will appear here..."} />
                )}
            </Card>
        );
    };

    // Claims table component
    const ClaimsTableContent = () => {
        if (error) return <ErrorState />;
        if (isLoading && !streamingResponse) return <LoadingState title="Generating Claims Table" />;

        const tableData = parsedContent?.factCheckTable ? parseMarkdownTable(parsedContent.factCheckTable) : null;

        return (
            <Card title="Claims Assessment Table">
                {tableData ? (
                    <MarkdownTable data={tableData} />
                ) : (
                    <EmptyState message={streamingResponse ? "No table data found in the analysis" : "Claims table will appear here..."} />
                )}
            </Card>
        );
    };

    // Create a text representation of the rating
    const getRatingText = (rating: number): string => {
        if (rating === 0) return "Pending";
        if (rating === 1) return "Very Low";
        if (rating === 2) return "Low";
        if (rating === 3) return "Moderate";
        if (rating === 4) return "High";
        if (rating === 5) return "Very High";
        return "Unknown";
    };

    // Stats for the hero section
    const statsItems = [
        { label: "Content Source", value: overview?.website || "Unknown" },
        { label: "Character Count", value: characterCount || "N/A" },
        { label: "Trustworthiness", value: getRatingText(rating) },
    ];

    // Define the tabs
    const tabs = [
        {
            id: "summary",
            label: "Summary",
            icon: AlertTriangle,
            content: <SummaryContent />,
        },
        {
            id: "observations",
            label: "Observations",
            icon: Search,
            content: <GeneralObservationsContent />,
        },
        {
            id: "claims",
            label: "Claims Analysis",
            icon: ClipboardList,
            content: <SpecificClaimsContent />,
        },
        {
            id: "concerns",
            label: "Concerns",
            icon: AlertCircle,
            content: <ConcernsContent />,
        },
        {
            id: "recommendations",
            label: "Recommendations",
            icon: ListChecks,
            content: <RecommendationsContent />,
        },
        {
            id: "table",
            label: "Claims Table",
            icon: Table,
            content: <ClaimsTableContent />,
        },
        {
            id: "full-report",
            label: "Full Report",
            icon: FileText,
            content: <FullAnalysisContent />,
        },
    ];

    return (
        <PageTemplate
            title="Fact Checker"
            subtitle={pageTitle}
            url={pageUrl}
            statsItems={statsItems}
            tabs={tabs}
            defaultActiveTab="summary"
            heroSize="xs"
        />
    );
};

export default FactCheckerPage;

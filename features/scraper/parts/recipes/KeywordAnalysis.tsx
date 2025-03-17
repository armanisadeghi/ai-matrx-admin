"use client";
import React, { useEffect, useState } from "react";
import { PageTemplate, Card, FileTextIcon } from "@/features/scraper/parts/reusable/PageTemplate";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { RecipeTaskData } from "@/lib/redux/socket/recipe-class/RecipeTaskData";
import { RecipeTaskManager } from "@/lib/redux/socket/recipe-class/RecipeTaskManager";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { Columns2 } from "lucide-react";

interface KeywordAnalysisPageProps {
    value: string;
    overview: any;
}

const KeywordAnalysisPage: React.FC<KeywordAnalysisPageProps> = ({ value, overview }) => {
    const [streamingResponse, setStreamingResponse] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const recipeId = "0288e091-6252-4cca-b140-7ba94b4eb206";
    const brokerId = "86c303c3-e10f-4426-b739-f20172a4d754";
    const taskManager = new RecipeTaskManager();

    const pageTitle = overview?.page_title;

    const characterCount = overview?.char_count.toLocaleString();
    const pageUrl = overview?.url;

    useEffect(() => {
        let unsubscribe: () => void;

        const runTask = async () => {
            setIsLoading(true);
            setStreamingResponse("");

            try {
                const taskData = new RecipeTaskData(recipeId, 0)
                    .setModelOverride("gpt-4o-mini")
                    .addBroker({ id: brokerId, name: brokerId, value });

                const eventName = await taskManager.runRecipeTask(taskData);
                unsubscribe = taskManager.getSocketManager().subscribeToEvent(eventName, (response: any) => {
                    console.log(`[KeywordAnalysis] Response for ${eventName}:`, response);
                    if (response?.data) {
                        setStreamingResponse((prev) => prev + response.data);
                    } else if (typeof response === "string") {
                        setStreamingResponse((prev) => prev + response);
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                console.error("[KeywordAnalysis] Task failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Only run if value is a non-empty string
        if (value && value.trim().length > 0) {
            console.log("[KeywordAnalysis] value:", value);
            runTask();
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [value]);

    // Create keyword analysis content component
    const KeywordAnalysisContent = () => {
        if (error) {
            return (
                <Card title="Error">
                    <div className="text-red-500">Error: {error}</div>
                </Card>
            );
        }

        if (isLoading && !streamingResponse) {
            return (
                <Card title="Analyzing Keywords">
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                </Card>
            );
        }

        return (
            <Card title="Keyword Analysis Results">
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

    const ContentComparisonTable = () => {
        const tableData = parseMarkdownTable(streamingResponse);

        return <Card title="Content Comparison">{tableData && <MarkdownTable data={tableData} />}</Card>;
    };

    const tabs = [
        {
            id: "analysis",
            label: "Keyword Analysis",
            icon: FileTextIcon,
            content: <KeywordAnalysisContent />,
        },
        {
            id: "comparison",
            label: "Content Comparison",
            icon: Columns2,
            content: <ContentComparisonTable />,
        },
    ];

    const statsItems = [
        { label: "Website", value: overview?.website || 0 },
        { label: "Character Count", value: characterCount || 0 },
    ];

    return (
        <PageTemplate
            title="Keyword Analysis"
            subtitle={pageTitle}
            url={pageUrl}
            statsItems={statsItems}
            tabs={tabs}
            defaultActiveTab="analysis"
            heroSize="xs"
        />
    );
};

export default KeywordAnalysisPage;

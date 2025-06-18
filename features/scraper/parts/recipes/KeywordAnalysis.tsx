"use client";
import React, { useEffect } from "react";
import { Columns2 } from "lucide-react";
import { parseMarkdownTable } from "@/components/mardown-display/markdown-classification/processors/bock-processors/parse-markdown-table";
import { PageTemplate, Card, FileTextIcon } from "../reusable/PageTemplate";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { useRunQuickRecipe } from "./useRenQuickRecipe";

interface KeywordAnalysisPageProps {
    value: string;
    overview?: {
        page_title?: string;
        char_count?: number;
        url?: string;
        website?: string;
    };
}

const KeywordAnalysisPage: React.FC<KeywordAnalysisPageProps> = ({ value, overview }) => {
    const { runRecipe, isLoading, error, streamingResponse } = useRunQuickRecipe();

    const recipeId = "0288e091-6252-4cca-b140-7ba94b4eb206";
    const brokerId = "86c303c3-e10f-4426-b739-f20172a4d754";

    const pageTitle = overview?.page_title;
    const characterCount = overview?.char_count?.toLocaleString();
    const pageUrl = overview?.url;

    useEffect(() => {
        if (!value || value.trim().length === 0) {
            return;
        }

        const brokerValues = [
            {
                id: brokerId,
                name: brokerId,
                value: value,
            },
        ];

        runRecipe({
            recipeId,
            brokerValues,
        });
    }, [value, runRecipe, recipeId, brokerId]);

    // Create keyword analysis content component
    const KeywordAnalysisContent = () => {
        if (error) {
            return (
                <Card title="Error">
                    <div className="text-red-500 p-4">Error: {error}</div>
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

        return <Card title="Content Comparison">{tableData && <MarkdownTable data={tableData.markdown} />}</Card>;
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
        { label: "Website", value: overview?.website || "Unknown" },
        { label: "Character Count", value: characterCount || "N/A" },
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

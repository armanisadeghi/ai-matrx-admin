"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Columns2 } from "lucide-react";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import { PageTemplate, Card, FileTextIcon } from "../reusable/PageTemplate";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createTask, submitTask } from "@/lib/redux/socket-io/thunks";
import { setTaskFields } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { 
    selectTaskFirstListenerId,
    selectResponseDataByListenerId,
    selectPrimaryResponseEndedByTaskId,
    selectTaskStatus
} from "@/lib/redux/socket-io";

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
    const dispatch = useAppDispatch();
    const [taskId, setTaskId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const recipeId = "0288e091-6252-4cca-b140-7ba94b4eb206";
    const brokerId = "86c303c3-e10f-4426-b739-f20172a4d754";

    // Redux selectors
    const taskStatus = useAppSelector(state => taskId ? selectTaskStatus(state, taskId) : null);
    const isTaskCompleted = useAppSelector(state => taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : false);
    const firstListenerId = useAppSelector(state => taskId ? selectTaskFirstListenerId(state, taskId) : "");
    const responseData = useAppSelector(selectResponseDataByListenerId(firstListenerId || ""));

    const isLoading = taskStatus === "submitted" && !isTaskCompleted;

    // Extract streaming response from response data
    const streamingResponse = useMemo(() => {
        if (!responseData || !Array.isArray(responseData)) return "";
        
        // Combine all text responses
        return responseData
            .filter(item => typeof item === 'string')
            .join('');
    }, [responseData]);

    const pageTitle = overview?.page_title;
    const characterCount = overview?.char_count?.toLocaleString();
    const pageUrl = overview?.url;

    useEffect(() => {
        const runTask = async () => {
            if (!value || value.trim().length === 0) {
                return;
            }

            setError(null);
            console.log("[KeywordAnalysis] value:", value);

            try {
                // Create the task
                const newTaskId = await dispatch(createTask({
                    service: "ai_chat_service",
                    taskName: "run_recipe_to_chat"
                })).unwrap();

                setTaskId(newTaskId);

                // Prepare task data in the new format
                const taskData = {
                    chat_config: {
                        recipe_id: recipeId,
                        version: "0",
                        prepare_for_next_call: false,
                        save_new_conversation: false,
                        include_classified_output: false,
                        tools_override: [],
                        allow_default_values: true,
                        allow_removal_of_unmatched: true,
                        model_override: "gpt-4o-mini"
                    },
                    broker_values: [
                        {
                            id: brokerId,
                            name: brokerId,
                            value: value
                        }
                    ]
                };

                // Set the task data
                dispatch(setTaskFields({
                    taskId: newTaskId,
                    fields: taskData
                }));

                // Submit the task
                dispatch(submitTask({ taskId: newTaskId }));

            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                console.error("[KeywordAnalysis] Task failed:", err);
            }
        };

        runTask();
    }, [value, dispatch]);

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

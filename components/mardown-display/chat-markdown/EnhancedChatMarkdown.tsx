"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/markdown-classification/processors/bock-processors/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import ThinkingVisualization from "../blocks/thinking-reasoning/ThinkingVisualization";
import BasicMarkdownContent from "./BasicMarkdownContent";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";
import ImageBlock from "@/components/mardown-display/blocks/images/ImageBlock";
import TranscriptBlock from "@/components/mardown-display/blocks/transcripts/TranscriptBlock";
import TasksBlock from "@/components/mardown-display/blocks/tasks/TasksBlock";
import { ContentBlock, splitContentIntoBlocks } from "../markdown-classification/processors/utils/content-splitter";
import StructuredPlanBlock from "@/components/mardown-display/blocks/plan/StructuredPlanBlock";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import MatrxBrokerBlock from "../blocks/brokers/MatrxBrokerBlock";
import QuestionnaireRenderer from "../QuestionnaireRenderer";
import { separatedMarkdownParser } from "../markdown-classification/processors/custom/parser-separated";
import { QuestionnaireProvider } from "../context/QuestionnaireContext";
import FlashcardsBlock from "@/components/mardown-display/blocks/flashcards/FlashcardsBlock";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import MultipleChoiceQuiz from "@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz";
import QuizLoadingVisualization from "../blocks/quiz/QuizLoadingVisualization";
import Slideshow from "@/components/mardown-display/blocks/presentations/Slideshow";
import PresentationLoadingVisualization from "../blocks/presentations/PresentationLoadingVisualization";
import RecipeViewer from "../blocks/cooking-recipes/cookingRecipeDisplay";
import RecipeLoadingVisualization from "../blocks/cooking-recipes/RecipeLoadingVisualization";
import { parseRecipeMarkdown } from "../blocks/cooking-recipes/parseRecipeMarkdown";
import TimelineBlock from "../blocks/timeline/TimelineBlock";
import TimelineLoadingVisualization from "../blocks/timeline/TimelineLoadingVisualization";
import { parseTimelineMarkdown } from "../blocks/timeline/parseTimelineMarkdown";
import ResearchBlock from "../blocks/research/ResearchBlock";
import ResearchLoadingVisualization from "../blocks/research/ResearchLoadingVisualization";
import { parseResearchMarkdown } from "../blocks/research/parseResearchMarkdown";
import ResourceCollectionBlock from "../blocks/resources/ResourceCollectionBlock";
import ResourcesLoadingVisualization from "../blocks/resources/ResourcesLoadingVisualization";
import { parseResourcesMarkdown } from "../blocks/resources/parseResourcesMarkdown";
import ProgressTrackerBlock from "../blocks/progress/ProgressTrackerBlock";
import ProgressLoadingVisualization from "../blocks/progress/ProgressLoadingVisualization";
import { parseProgressMarkdown } from "../blocks/progress/parseProgressMarkdown";
import ComparisonTableBlock from "../blocks/comparison/ComparisonTableBlock";
import ComparisonLoadingVisualization from "../blocks/comparison/ComparisonLoadingVisualization";
import { parseComparisonJSON } from "../blocks/comparison/parseComparisonJSON";
import TroubleshootingBlock from "../blocks/troubleshooting/TroubleshootingBlock";
import TroubleshootingLoadingVisualization from "../blocks/troubleshooting/TroubleshootingLoadingVisualization";
import { parseTroubleshootingMarkdown } from "../blocks/troubleshooting/parseTroubleshootingMarkdown";
import DecisionTreeBlock from "../blocks/decision-tree/DecisionTreeBlock";
import DecisionTreeLoadingVisualization from "../blocks/decision-tree/DecisionTreeLoadingVisualization";
import { parseDecisionTreeJSON } from "../blocks/decision-tree/parseDecisionTreeJSON";
import InteractiveDiagramBlock from "../blocks/diagram/InteractiveDiagramBlock";
import DiagramLoadingVisualization from "../blocks/diagram/DiagramLoadingVisualization";
import { parseDiagramJSON } from "../blocks/diagram/parseDiagramJSON";
import ReasoningVisualization from "../blocks/thinking-reasoning/ReasoningVisualization";
import ToolCallVisualization from "@/features/chat/components/response/assistant-message/stream/ToolCallVisualization";
import { useAppSelector } from "@/lib/redux";
import { createTaskResponseSelectors } from "@/lib/redux/socket-io";


interface ChatMarkdownDisplayProps {
    content: string;
    taskId?: string;
    type?: "flashcard" | "message" | "text" | "image" | "audio" | "video" | "file" | string;
    role?: "user" | "assistant" | "system" | "tool" | string;
    className?: string;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    analysisData?: any;
    messageId?: string;
    allowFullScreenEditor?: boolean;
    hideCopyButton?: boolean;
}

const EnhancedChatMarkdown: React.FC<ChatMarkdownDisplayProps> = ({
    content,
    taskId,
    type = "message",
    role = "assistant",
    className,
    isStreamActive,
    onContentChange,
    analysisData,
    messageId,
    allowFullScreenEditor = true,
    hideCopyButton = false,
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState(content);

    // Check if we should show loading state (taskId exists but no content yet)
    const isWaitingForContent = taskId && !content.trim();

    // Get tool updates if taskId is provided
    const responseSelectors = useMemo(() => 
        taskId ? createTaskResponseSelectors(taskId) : null, 
        [taskId]
    );
    
    const toolUpdates = useAppSelector((state) => 
        responseSelectors ? responseSelectors.selectToolUpdates(state) : []
    );

    // Update internal content when prop changes - but prevent infinite loops
    useEffect(() => {
        if (content !== currentContent) {
            setCurrentContent(content);
        }
    }, [content, currentContent]);

    // Memoize the content splitting to avoid unnecessary re-processing
    // Skip expensive processing if we're in loading state
    const blocks = useMemo(() => {
        if (isWaitingForContent) return [];
        return splitContentIntoBlocks(currentContent);
    }, [currentContent, isWaitingForContent]);

    // Memoize parsed table data to prevent infinite loops from new object references
    // Skip expensive processing if we're in loading state
    const parsedTableData = useMemo(() => {
        if (isWaitingForContent) return new Map();

        const tableDataMap = new Map<number, any>();

        blocks.forEach((block, index) => {
            if (block.type === "table") {
                const tableData = parseMarkdownTable(block.content, isStreamActive);
                if (tableData.markdown && tableData.markdown.headers.length > 0 && tableData.markdown.rows.length > 0) {
                    // Create a stable cache key based on table structure, not full content
                    const rowCount = tableData.markdown.rows.length;
                    const headerHash = tableData.markdown.headers.join("|");
                    const stableKey = `table-${index}-${headerHash}-${rowCount}`;

                    // Store both the parsed data and the key for easy lookup
                    tableDataMap.set(index, {
                        stableKey,
                        data: {
                            ...tableData.markdown,
                            normalizedData: tableData.data,
                        },
                    });
                }
            }
        });

        return tableDataMap;
    }, [blocks, isStreamActive, isWaitingForContent]);

    // Handler for code changes within CodeBlock components
    const handleCodeChange = useCallback(
        (newCode: string, originalCode: string) => {
            // Replace the original code with new code in the full content
            const updatedContent = currentContent.replace(originalCode, newCode);
            setCurrentContent(updatedContent);
            onContentChange?.(updatedContent);
        },
        [currentContent, onContentChange]
    );

    // Handler for table changes
    const handleTableChange = useCallback(
        (updatedTableMarkdown: string, originalBlockContent: string) => {
            // We need to find the original table in the markdown and replace it
            if (onContentChange) {
                try {
                    // This is a simplified approach - in a real implementation, you might need more sophisticated
                    // parsing to correctly locate and replace the table in the full markdown content
                    const updatedContent = currentContent.replace(originalBlockContent, updatedTableMarkdown);
                    setCurrentContent(updatedContent);
                    onContentChange(updatedContent);
                } catch (error) {
                    console.error("Error updating table content:", error);
                }
            }
        },
        [currentContent, onContentChange]
    );

    const handleMatrxBrokerChange = useCallback(
        (updatedBrokerContent: string, originalBrokerContent: string) => {
            const updatedContent = currentContent.replace(originalBrokerContent, updatedBrokerContent);
            setCurrentContent(updatedContent);
            onContentChange?.(updatedContent);
        },
        [currentContent, onContentChange]
    );

    const handleOpenEditor = useCallback(() => {
        if (isStreamActive) return;
        setIsEditorOpen(true);
    }, [isStreamActive]);

    const handleCancelEdit = useCallback(() => {
        setIsEditorOpen(false);
    }, []);

    const handleSaveEdit = useCallback(
        (newContent: string) => {
            setCurrentContent(newContent);
            onContentChange?.(newContent);
            setIsEditorOpen(false);
        },
        [onContentChange]
    );

    // const preprocessContent = (mdContent: string): string => {
    //     // Match the format [Image URL: https://example.com/image.png]
    //     const imageUrlRegex = /\[Image URL: (https?:\/\/[^\s\]]+)\]/g;
    //     return mdContent.replace(imageUrlRegex, "![Image]($1)");
    // };

    // const processedContent = preprocessContent(currentContent);

    // Memoize the render block function to prevent unnecessary re-renders
    const renderBlock = useCallback(
        (block: ContentBlock, index: number) => {
            switch (block.type) {
                case "image":
                    return <ImageBlock key={index} src={block.src!} alt={block.alt} />;
                case "thinking":
                    return <ThinkingVisualization key={index} thinkingText={block.content} showThinking={true} />;
                case "reasoning":
                    return <ReasoningVisualization key={index} reasoningText={block.content} showReasoning={true} />;
                case "code":
                    return (
                        <CodeBlock
                            key={index}
                            code={block.content}
                            language={block.language}
                            fontSize={16}
                            className="my-3"
                            onCodeChange={isStreamActive ? undefined : (newCode) => handleCodeChange(newCode, block.content)}
                            isStreamActive={isStreamActive}
                        />
                    );
                case "table":
                    const tableInfo = parsedTableData.get(index);
                    if (!tableInfo) {
                        if (!isStreamActive && process.env.NODE_ENV === "development") {
                            console.warn("Skipping invalid or empty table:", block.content);
                        }
                        return null;
                    }

                    return (
                        <MarkdownTable
                            key={tableInfo.stableKey}
                            data={tableInfo.data}
                            content={block.content}
                            onContentChange={onContentChange ? (updatedTable) => handleTableChange(updatedTable, block.content) : undefined}
                            isStreamActive={isStreamActive}
                        />
                    );
                case "transcript":
                    return <TranscriptBlock key={index} content={block.content} />;
                case "tasks":
                    return <TasksBlock key={index} content={block.content} />;
                case "structured_info":
                    return <StructuredPlanBlock key={index} content={block.content} />;
                case "matrxBroker":
                    return (
                        <MatrxBrokerBlock
                            key={index}
                            content={block.content}
                            metadata={block.metadata}
                            onUpdate={handleMatrxBrokerChange}
                        />
                    );
                case "questionnaire":
                    const parsedContent = separatedMarkdownParser(block.content);
                    return (
                        <QuestionnaireProvider key={index}>
                            <QuestionnaireRenderer data={parsedContent} questionnaireId={`questionnaire-${messageId}-${index}`} />
                        </QuestionnaireProvider>
                    );
                case "flashcards":
                    return <FlashcardsBlock key={index} content={block.content} />;
                case "quiz":
                    // Check if quiz is complete
                    const isQuizComplete = block.metadata?.isComplete;
                    
                    if (!isQuizComplete) {
                        // Show loading state while quiz is streaming
                        return <QuizLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete quiz JSON
                    try {
                        const quizData = JSON.parse(block.content);
                        
                        // Validate quiz structure: { quiz_title, category?, multiple_choice }
                        if (quizData.quiz_title && Array.isArray(quizData.multiple_choice) && quizData.multiple_choice.length > 0) {
                            return <MultipleChoiceQuiz key={index} quizData={quizData} />;
                        }
                        
                        // If not valid quiz structure, fall back to code block
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse quiz JSON:", error);
                        // Fall back to showing as code block if parsing fails
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    }
                case "presentation":
                    // Check if presentation is complete
                    const isPresentationComplete = block.metadata?.isComplete;
                    
                    if (!isPresentationComplete) {
                        // Show loading state while presentation is streaming
                        return <PresentationLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete presentation JSON
                    try {
                        const presentationData = JSON.parse(block.content);
                        if (presentationData.presentation && 
                            presentationData.presentation.slides && 
                            Array.isArray(presentationData.presentation.slides)) {
                            return (
                                <Slideshow 
                                    key={index} 
                                    slides={presentationData.presentation.slides}
                                    theme={presentationData.presentation.theme || {
                                        primaryColor: "#2563eb",
                                        secondaryColor: "#1e40af",
                                        accentColor: "#60a5fa",
                                        backgroundColor: "#ffffff",
                                        textColor: "#1f2937"
                                    }}
                                />
                            );
                        }
                        // If parsing failed or no presentation, fall back to code block
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse presentation JSON:", error);
                        // Fall back to showing as code block if parsing fails
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    }
                case "cooking_recipe":
                    // Check if recipe is complete
                    const isRecipeComplete = block.metadata?.isComplete !== false;
                    
                    if (!isRecipeComplete) {
                        // Show loading state while recipe is streaming
                        return <RecipeLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete recipe markdown
                    try {
                        const recipeData = parseRecipeMarkdown(block.content);
                        if (recipeData) {
                            return <RecipeViewer key={index} recipe={recipeData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse recipe markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }
                case "timeline":
                    // Check if timeline is complete
                    const isTimelineComplete = block.metadata?.isComplete !== false;
                    
                    if (!isTimelineComplete) {
                        // Show loading state while timeline is streaming
                        return <TimelineLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete timeline markdown
                    try {
                        const timelineData = parseTimelineMarkdown(block.content);
                        if (timelineData) {
                            return <TimelineBlock key={index} timeline={timelineData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse timeline markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }
                case "research":
                    // Check if research is complete
                    const isResearchComplete = block.metadata?.isComplete !== false;
                    
                    if (!isResearchComplete) {
                        // Show loading state while research is streaming
                        return <ResearchLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete research markdown
                    try {
                        const researchData = parseResearchMarkdown(block.content);
                        if (researchData) {
                            return <ResearchBlock key={index} research={researchData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse research markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }

                case "resources":
                    // Check if resources are complete
                    const isResourcesComplete = block.metadata?.isComplete !== false;
                    
                    if (!isResourcesComplete) {
                        // Show loading state while resources are streaming
                        return <ResourcesLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete resources markdown
                    try {
                        const resourcesData = parseResourcesMarkdown(block.content);
                        if (resourcesData) {
                            return <ResourceCollectionBlock key={index} collection={resourcesData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse resources markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }

                case "progress_tracker":
                    // Check if progress tracker is complete
                    const isProgressComplete = block.metadata?.isComplete !== false;
                    
                    if (!isProgressComplete) {
                        // Show loading state while progress tracker is streaming
                        return <ProgressLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete progress markdown
                    try {
                        const progressData = parseProgressMarkdown(block.content);
                        if (progressData) {
                            return <ProgressTrackerBlock key={index} tracker={progressData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse progress tracker markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }

                case "comparison_table":
                    // Check if comparison table is complete
                    const isComparisonComplete = block.metadata?.isComplete !== false;
                    
                    if (!isComparisonComplete) {
                        // Show loading state while comparison is streaming
                        return <ComparisonLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete comparison JSON
                    try {
                        const comparisonData = parseComparisonJSON(block.content);
                        if (comparisonData) {
                            return <ComparisonTableBlock key={index} comparison={comparisonData} />;
                        }
                        // If parsing failed, fall back to code block
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse comparison table JSON:", error);
                        // Fall back to showing as code block if parsing fails
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    }

                case "troubleshooting":
                    // Check if troubleshooting guide is complete
                    const isTroubleshootingComplete = block.metadata?.isComplete !== false;
                    
                    if (!isTroubleshootingComplete) {
                        // Show loading state while troubleshooting is streaming
                        return <TroubleshootingLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete troubleshooting markdown
                    try {
                        const troubleshootingData = parseTroubleshootingMarkdown(block.content);
                        if (troubleshootingData) {
                            return <TroubleshootingBlock key={index} troubleshooting={troubleshootingData} />;
                        }
                        // If parsing failed, fall back to basic markdown
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse troubleshooting markdown:", error);
                        // Fall back to showing as basic markdown if parsing fails
                        return (
                            <BasicMarkdownContent
                                key={index}
                                content={block.content}
                                isStreamActive={isStreamActive}
                                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                                messageId={messageId}
                                showCopyButton={false}
                            />
                        );
                    }

                case "decision_tree":
                    // Check if decision tree is complete
                    const isDecisionTreeComplete = block.metadata?.isComplete !== false;
                    
                    if (!isDecisionTreeComplete) {
                        // Show loading state while decision tree is streaming
                        return <DecisionTreeLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete decision tree JSON
                    try {
                        const decisionTreeData = parseDecisionTreeJSON(block.content);
                        if (decisionTreeData) {
                            return <DecisionTreeBlock key={index} decisionTree={decisionTreeData} />;
                        }
                        // If parsing failed, fall back to code block
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse decision tree JSON:", error);
                        // Fall back to showing as code block if parsing fails
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    }

                case "diagram":
                    // Check if diagram is complete
                    const isDiagramComplete = block.metadata?.isComplete !== false;
                    
                    if (!isDiagramComplete) {
                        // Show loading state while diagram is streaming
                        return <DiagramLoadingVisualization key={index} />;
                    }
                    
                    // Parse the complete diagram JSON
                    try {
                        const diagramData = parseDiagramJSON(block.content);
                        if (diagramData) {
                            return <InteractiveDiagramBlock key={index} diagram={diagramData} />;
                        }
                        // If parsing failed, fall back to code block
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    } catch (error) {
                        console.error("Failed to parse diagram JSON:", error);
                        // Fall back to showing as code block if parsing fails
                        return (
                            <CodeBlock
                                key={index}
                                code={block.content}
                                language="json"
                                fontSize={16}
                                className="my-3"
                                isStreamActive={isStreamActive}
                            />
                        );
                    }

                case "text":
                case "info":
                case "task":
                case "database":
                case "private":
                case "plan":
                case "event":
                case "tool":
                    return block.content ? (
                        <BasicMarkdownContent
                            key={index}
                            content={block.content}
                            isStreamActive={isStreamActive}
                            onEditRequest={onContentChange ? handleOpenEditor : undefined}
                            messageId={messageId}
                            showCopyButton={false}
                        />
                    ) : null;
                default:
                    // Default to rendering as markdown for unrecognized block types
                    return block.content ? (
                        <BasicMarkdownContent
                            key={index}
                            content={block.content}
                            isStreamActive={isStreamActive}
                            onEditRequest={onContentChange ? handleOpenEditor : undefined}
                            messageId={messageId}
                            showCopyButton={false}
                        />
                    ) : null;
            }
        },
        [
            currentContent,
            isStreamActive,
            onContentChange,
            messageId,
            handleCodeChange,
            handleTableChange,
            handleMatrxBrokerChange,
            handleOpenEditor,
            parsedTableData,
        ]
    );

    const containerStyles = cn(
        "py-3 px-0 space-y-4 font-sans text-md antialiased leading-relaxed tracking-wide",
        type === "flashcard"
            ? "text-left mb-1 text-white"
            : `block rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-textured"
              }`,
        className
    );

    // Show loading state if we have a taskId but no content yet
    if (isWaitingForContent && toolUpdates.length === 0) {
        return (
            <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
                <div className={containerStyles}>
                    <div className="flex items-center justify-start py-10">
                        <MatrxMiniLoader />
                        {/* Original loader - commented out for comparison */}
                        {/* <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Initializing Matrx...</span>
                        </div> */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            {/* Tool Call Visualization - show if we have tool updates */}
            {toolUpdates.length > 0 && (
                <ToolCallVisualization 
                    toolUpdates={toolUpdates} 
                    hasContent={!!content.trim()}
                    className="mb-3"
                />
            )}
            
            <div className={containerStyles}>{blocks.map((block, index) => renderBlock(block, index))}</div>
            {!hideCopyButton && <InlineCopyButton markdownContent={currentContent} size="xs" position="center-right" isMarkdown={true} />}

            {allowFullScreenEditor && (
                <FullScreenMarkdownEditor
                    isOpen={isEditorOpen}
                    initialContent={currentContent}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    analysisData={analysisData}
                    messageId={messageId}
                />
            )}
        </div>
    );
};

export default EnhancedChatMarkdown;

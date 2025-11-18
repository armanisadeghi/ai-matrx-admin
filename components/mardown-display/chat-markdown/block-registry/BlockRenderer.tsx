"use client";
import React, { useCallback } from "react";
import { BlockComponents, LoadingComponents } from "./BlockComponentRegistry";
import { ContentBlock } from "@/components/mardown-display/markdown-classification/processors/utils/content-splitter-v2";

interface BlockRendererProps {
    block: ContentBlock;
    index: number;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    messageId?: string;
    // Handlers
    handleCodeChange: (newCode: string, originalCode: string) => void;
    handleTableChange: (updatedTableMarkdown: string, originalBlockContent: string) => void;
    handleMatrxBrokerChange: (updatedBrokerContent: string, originalBrokerContent: string) => void;
    handleOpenEditor: () => void;
}

/**
 * Renders individual content blocks with lazy-loaded components
 * Extracted from EnhancedChatMarkdown for better code splitting
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
    block,
    index,
    isStreamActive,
    onContentChange,
    messageId,
    handleCodeChange,
    handleTableChange,
    handleMatrxBrokerChange,
    handleOpenEditor,
}) => {
    const renderFallbackContent = useCallback((content: string, language: string = "json") => {
        return (
            <BlockComponents.CodeBlock
                key={index}
                code={content}
                language={language}
                fontSize={16}
                className="my-3"
                isStreamActive={isStreamActive}
            />
        );
    }, [index, isStreamActive]);

    const renderBasicMarkdown = useCallback((content: string) => {
        return (
            <BlockComponents.BasicMarkdownContent
                key={index}
                content={content}
                isStreamActive={isStreamActive}
                onEditRequest={onContentChange ? handleOpenEditor : undefined}
                messageId={messageId}
                showCopyButton={false}
            />
        );
    }, [index, isStreamActive, onContentChange, handleOpenEditor, messageId]);

    switch (block.type) {
        case "image":
            return (
                <BlockComponents.ImageBlock 
                    key={index} 
                    src={block.src!} 
                    alt={block.alt} 
                />
            );

        case "thinking":
            return (
                <BlockComponents.ThinkingVisualization 
                    key={index} 
                    thinkingText={block.content} 
                    showThinking={true} 
                />
            );

        case "reasoning":
            return (
                <BlockComponents.ReasoningVisualization 
                    key={index} 
                    reasoningText={block.content} 
                    showReasoning={true} 
                />
            );

        case "code":
            return (
                <BlockComponents.CodeBlock
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
            return (
                <BlockComponents.StreamingTableRenderer
                    key={index}
                    content={block.content}
                    metadata={block.metadata}
                    isStreamActive={isStreamActive}
                    onContentChange={isStreamActive ? undefined : (updatedTable) => handleTableChange(updatedTable, block.content)}
                />
            );

        case "transcript":
            return <BlockComponents.TranscriptBlock key={index} content={block.content} />;

        case "tasks":
            return <BlockComponents.TasksBlock key={index} content={block.content} />;

        case "structured_info":
            return <BlockComponents.StructuredPlanBlock key={index} content={block.content} />;

        case "matrxBroker":
            return (
                <BlockComponents.MatrxBrokerBlock
                    key={index}
                    content={block.content}
                    metadata={block.metadata}
                    onUpdate={handleMatrxBrokerChange}
                />
            );

        case "questionnaire":
            // Dynamic import the parser
            const QuestionnaireWithParser = React.lazy(async () => {
                const { separatedMarkdownParser } = await import("../../markdown-classification/processors/custom/parser-separated");
                const parsedContent = separatedMarkdownParser(block.content);
                
                return {
                    default: () => (
                        <BlockComponents.QuestionnaireRenderer
                            data={parsedContent}
                            questionnaireId={`questionnaire-${messageId}-${index}`}
                        />
                    )
                };
            });
            
            return (
                <React.Suspense key={index} fallback={null}>
                    <QuestionnaireWithParser />
                </React.Suspense>
            );

        case "flashcards":
            return <BlockComponents.FlashcardsBlock key={index} content={block.content} />;

        case "quiz":
            if (!block.metadata?.isComplete) {
                return <LoadingComponents.QuizLoading key={index} />;
            }
            try {
                const quizData = JSON.parse(block.content);
                if (quizData.quiz_title && Array.isArray(quizData.multiple_choice) && quizData.multiple_choice.length > 0) {
                    return <BlockComponents.MultipleChoiceQuiz key={index} quizData={quizData} />;
                }
                return renderFallbackContent(block.content);
            } catch (error) {
                console.error("Failed to parse quiz JSON:", error);
                return renderFallbackContent(block.content);
            }

        case "presentation":
            if (!block.metadata?.isComplete) {
                return <LoadingComponents.PresentationLoading key={index} />;
            }
            try {
                const presentationData = JSON.parse(block.content);
                if (presentationData.presentation?.slides && Array.isArray(presentationData.presentation.slides)) {
                    return (
                        <BlockComponents.Slideshow
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
                return renderFallbackContent(block.content);
            } catch (error) {
                console.error("Failed to parse presentation JSON:", error);
                return renderFallbackContent(block.content);
            }

        case "cooking_recipe":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.RecipeLoading key={index} />;
            }
            // Dynamic parser + renderer
            const RecipeWithParser = React.lazy(async () => {
                const { parseRecipeMarkdown } = await import("../../blocks/cooking-recipes/parseRecipeMarkdown");
                const recipeData = parseRecipeMarkdown(block.content);
                
                if (!recipeData) {
                    throw new Error("Failed to parse recipe");
                }
                
                return {
                    default: () => <BlockComponents.RecipeViewer recipe={recipeData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <RecipeWithParser />
                </React.Suspense>
            );

        case "timeline":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.TimelineLoading key={index} />;
            }
            const TimelineWithParser = React.lazy(async () => {
                const { parseTimelineMarkdown } = await import("../../blocks/timeline/parseTimelineMarkdown");
                const timelineData = parseTimelineMarkdown(block.content);
                
                if (!timelineData) {
                    throw new Error("Failed to parse timeline");
                }
                
                return {
                    default: () => <BlockComponents.TimelineBlock timeline={timelineData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <TimelineWithParser />
                </React.Suspense>
            );

        case "research":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.ResearchLoading key={index} />;
            }
            const ResearchWithParser = React.lazy(async () => {
                const { parseResearchMarkdown } = await import("../../blocks/research/parseResearchMarkdown");
                const researchData = parseResearchMarkdown(block.content);
                
                if (!researchData) {
                    throw new Error("Failed to parse research");
                }
                
                return {
                    default: () => <BlockComponents.ResearchBlock research={researchData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <ResearchWithParser />
                </React.Suspense>
            );

        case "resources":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.ResourcesLoading key={index} />;
            }
            const ResourcesWithParser = React.lazy(async () => {
                const { parseResourcesMarkdown } = await import("../../blocks/resources/parseResourcesMarkdown");
                const resourcesData = parseResourcesMarkdown(block.content);
                
                if (!resourcesData) {
                    throw new Error("Failed to parse resources");
                }
                
                return {
                    default: () => <BlockComponents.ResourceCollectionBlock collection={resourcesData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <ResourcesWithParser />
                </React.Suspense>
            );

        case "progress_tracker":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.ProgressLoading key={index} />;
            }
            const ProgressWithParser = React.lazy(async () => {
                const { parseProgressMarkdown } = await import("../../blocks/progress/parseProgressMarkdown");
                const progressData = parseProgressMarkdown(block.content);
                
                if (!progressData) {
                    throw new Error("Failed to parse progress");
                }
                
                return {
                    default: () => <BlockComponents.ProgressTrackerBlock tracker={progressData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <ProgressWithParser />
                </React.Suspense>
            );

        case "comparison_table":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.ComparisonLoading key={index} />;
            }
            const ComparisonWithParser = React.lazy(async () => {
                const { parseComparisonJSON } = await import("../../blocks/comparison/parseComparisonJSON");
                const comparisonData = parseComparisonJSON(block.content);
                
                if (!comparisonData) {
                    throw new Error("Failed to parse comparison");
                }
                
                return {
                    default: () => <BlockComponents.ComparisonTableBlock comparison={comparisonData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderFallbackContent(block.content)}>
                    <ComparisonWithParser />
                </React.Suspense>
            );

        case "troubleshooting":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.TroubleshootingLoading key={index} />;
            }
            const TroubleshootingWithParser = React.lazy(async () => {
                const { parseTroubleshootingMarkdown } = await import("../../blocks/troubleshooting/parseTroubleshootingMarkdown");
                const troubleshootingData = parseTroubleshootingMarkdown(block.content);
                
                if (!troubleshootingData) {
                    throw new Error("Failed to parse troubleshooting");
                }
                
                return {
                    default: () => <BlockComponents.TroubleshootingBlock troubleshooting={troubleshootingData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderBasicMarkdown(block.content)}>
                    <TroubleshootingWithParser />
                </React.Suspense>
            );

        case "decision_tree":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.DecisionTreeLoading key={index} />;
            }
            const DecisionTreeWithParser = React.lazy(async () => {
                const { parseDecisionTreeJSON } = await import("../../blocks/decision-tree/parseDecisionTreeJSON");
                const decisionTreeData = parseDecisionTreeJSON(block.content);
                
                if (!decisionTreeData) {
                    throw new Error("Failed to parse decision tree");
                }
                
                return {
                    default: () => <BlockComponents.DecisionTreeBlock decisionTree={decisionTreeData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderFallbackContent(block.content)}>
                    <DecisionTreeWithParser />
                </React.Suspense>
            );

        case "diagram":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.DiagramLoading key={index} />;
            }
            const DiagramWithParser = React.lazy(async () => {
                const { parseDiagramJSON } = await import("../../blocks/diagram/parseDiagramJSON");
                const diagramData = parseDiagramJSON(block.content);
                
                if (!diagramData) {
                    throw new Error("Failed to parse diagram");
                }
                
                return {
                    default: () => <BlockComponents.InteractiveDiagramBlock diagram={diagramData} />
                };
            });
            
            return (
                <React.Suspense key={index} fallback={renderFallbackContent(block.content)}>
                    <DiagramWithParser />
                </React.Suspense>
            );

        case "math_problem":
            if (block.metadata?.isComplete === false) {
                return <LoadingComponents.MathProblemLoading key={index} />;
            }
            try {
                const mathProblemData = JSON.parse(block.content);
                if (mathProblemData?.math_problem) {
                    return <BlockComponents.MathProblemBlock key={index} problemData={mathProblemData} />;
                }
                return renderFallbackContent(block.content);
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Math problem JSON parsing failed:", {
                        error: error instanceof Error ? error.message : String(error),
                        contentPreview: block.content.substring(0, 100) + '...'
                    });
                }
                return renderFallbackContent(block.content);
            }

        case "text":
        case "info":
        case "task":
        case "database":
        case "private":
        case "plan":
        case "event":
        case "tool":
            return block.content ? renderBasicMarkdown(block.content) : null;

        default:
            return block.content ? renderBasicMarkdown(block.content) : null;
    }
};


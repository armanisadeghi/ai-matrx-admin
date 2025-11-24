"use client";

import React, { Suspense, lazy } from "react";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import BasicMarkdownContent from "../BasicMarkdownContent";

// Lazy-load CodeBlock to avoid circular dependency with Redux store
const CodeBlock = lazy(() => import("@/features/code-editor/components/code-block/CodeBlock"));

// Static imports for frequently used, lightweight components
import { QuestionnaireProvider } from "../../blocks/questionnaire/QuestionnaireContext";

// Lazy load heavier/less common block components
const ThinkingVisualization = lazy(() => import("../../blocks/thinking-reasoning/ThinkingVisualization"));
const ReasoningVisualization = lazy(() => import("../../blocks/thinking-reasoning/ReasoningVisualization"));
const ImageBlock = lazy(() => import("../../blocks/images/ImageBlock"));
const TranscriptBlock = lazy(() => import("../../blocks/transcripts/TranscriptBlock"));
const TasksBlock = lazy(() => import("../../blocks/tasks/TasksBlock"));
const StructuredPlanBlock = lazy(() => import("../../blocks/plan/StructuredPlanBlock"));
const MatrxBrokerBlock = lazy(() => import("../../blocks/brokers/MatrxBrokerBlock"));
const FlashcardsBlock = lazy(() => import("../../blocks/flashcards/FlashcardsBlock"));
const MultipleChoiceQuiz = lazy(() => import("../../blocks/quiz/MultipleChoiceQuiz"));
const Slideshow = lazy(() => import("../../blocks/presentations/Slideshow"));
const RecipeViewer = lazy(() => import("../../blocks/cooking-recipes/cookingRecipeDisplay"));
const TimelineBlock = lazy(() => import("../../blocks/timeline/TimelineBlock"));
const ResearchBlock = lazy(() => import("../../blocks/research/ResearchBlock"));
const ResourceCollectionBlock = lazy(() => import("../../blocks/resources/ResourceCollectionBlock"));
const ProgressTrackerBlock = lazy(() => import("../../blocks/progress/ProgressTrackerBlock"));
const ComparisonTableBlock = lazy(() => import("../../blocks/comparison/ComparisonTableBlock"));
const TroubleshootingBlock = lazy(() => import("../../blocks/troubleshooting/TroubleshootingBlock"));
const DecisionTreeBlock = lazy(() => import("../../blocks/decision-tree/DecisionTreeBlock"));
const InteractiveDiagramBlock = lazy(() => import("../../blocks/diagram/InteractiveDiagramBlock"));
const MathProblemBlock = lazy(() => import("../../blocks/math/MathProblemBlock"));
const QuestionnaireRenderer = lazy(() => import("../../blocks/questionnaire/QuestionnaireRenderer"));
const MarkdownTable = lazy(() => import("../../tables/MarkdownTable"));
const StreamingTableRenderer = lazy(() => import("../../blocks/table/StreamingTableRenderer").then(m => ({ default: m.StreamingTableRenderer })));
const StreamingDiffBlock = lazy(() => import("../diff-blocks/StreamingDiffBlock").then(m => ({ default: m.StreamingDiffBlock })));

// Lazy load loading visualizations (lightweight but rarely all needed at once)
const QuizLoadingVisualization = lazy(() => import("../../blocks/quiz/QuizLoadingVisualization"));
const PresentationLoadingVisualization = lazy(() => import("../../blocks/presentations/PresentationLoadingVisualization"));
const RecipeLoadingVisualization = lazy(() => import("../../blocks/cooking-recipes/RecipeLoadingVisualization"));
const TimelineLoadingVisualization = lazy(() => import("../../blocks/timeline/TimelineLoadingVisualization"));
const ResearchLoadingVisualization = lazy(() => import("../../blocks/research/ResearchLoadingVisualization"));
const ResourcesLoadingVisualization = lazy(() => import("../../blocks/resources/ResourcesLoadingVisualization"));
const ProgressLoadingVisualization = lazy(() => import("../../blocks/progress/ProgressLoadingVisualization"));
const ComparisonLoadingVisualization = lazy(() => import("../../blocks/comparison/ComparisonLoadingVisualization"));
const TroubleshootingLoadingVisualization = lazy(() => import("../../blocks/troubleshooting/TroubleshootingLoadingVisualization"));
const DecisionTreeLoadingVisualization = lazy(() => import("../../blocks/decision-tree/DecisionTreeLoadingVisualization"));
const DiagramLoadingVisualization = lazy(() => import("../../blocks/diagram/DiagramLoadingVisualization"));
const MathProblemLoadingVisualization = lazy(() => import("../../blocks/math/MathProblemLoadingVisualization"));

// Note: Parsers are loaded dynamically within BlockRenderer.tsx when needed
// They cannot be lazy-loaded here as they are not React components

/**
 * Wrapper component that provides Suspense boundary for lazy-loaded blocks
 */
interface LazyBlockWrapperProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const LazyBlockWrapper: React.FC<LazyBlockWrapperProps> = ({ children, fallback }) => (
    <Suspense fallback={fallback || <MatrxMiniLoader />}>
        {children}
    </Suspense>
);

/**
 * Export wrapped components for use in MarkdownStream
 */
export const BlockComponents = {
    // Lightweight components
    BasicMarkdownContent,
    
    // CodeBlock is lazy-loaded to avoid circular dependency with Redux
    CodeBlock: (props: any) => (
        <LazyBlockWrapper>
            <CodeBlock {...props} />
        </LazyBlockWrapper>
    ),
    
    // Wrapped lazy components
    ThinkingVisualization: (props: any) => (
        <LazyBlockWrapper>
            <ThinkingVisualization {...props} />
        </LazyBlockWrapper>
    ),
    ReasoningVisualization: (props: any) => (
        <LazyBlockWrapper>
            <ReasoningVisualization {...props} />
        </LazyBlockWrapper>
    ),
    ImageBlock: (props: any) => (
        <LazyBlockWrapper>
            <ImageBlock {...props} />
        </LazyBlockWrapper>
    ),
    TranscriptBlock: (props: any) => (
        <LazyBlockWrapper>
            <TranscriptBlock {...props} />
        </LazyBlockWrapper>
    ),
    TasksBlock: (props: any) => (
        <LazyBlockWrapper>
            <TasksBlock {...props} />
        </LazyBlockWrapper>
    ),
    StructuredPlanBlock: (props: any) => (
        <LazyBlockWrapper>
            <StructuredPlanBlock {...props} />
        </LazyBlockWrapper>
    ),
    MatrxBrokerBlock: (props: any) => (
        <LazyBlockWrapper>
            <MatrxBrokerBlock {...props} />
        </LazyBlockWrapper>
    ),
    FlashcardsBlock: (props: any) => (
        <LazyBlockWrapper>
            <FlashcardsBlock {...props} />
        </LazyBlockWrapper>
    ),
    MultipleChoiceQuiz: (props: any) => (
        <LazyBlockWrapper>
            <MultipleChoiceQuiz {...props} />
        </LazyBlockWrapper>
    ),
    Slideshow: (props: any) => (
        <LazyBlockWrapper>
            <Slideshow {...props} />
        </LazyBlockWrapper>
    ),
    RecipeViewer: (props: any) => (
        <LazyBlockWrapper>
            <RecipeViewer {...props} />
        </LazyBlockWrapper>
    ),
    TimelineBlock: (props: any) => (
        <LazyBlockWrapper>
            <TimelineBlock {...props} />
        </LazyBlockWrapper>
    ),
    ResearchBlock: (props: any) => (
        <LazyBlockWrapper>
            <ResearchBlock {...props} />
        </LazyBlockWrapper>
    ),
    ResourceCollectionBlock: (props: any) => (
        <LazyBlockWrapper>
            <ResourceCollectionBlock {...props} />
        </LazyBlockWrapper>
    ),
    ProgressTrackerBlock: (props: any) => (
        <LazyBlockWrapper>
            <ProgressTrackerBlock {...props} />
        </LazyBlockWrapper>
    ),
    ComparisonTableBlock: (props: any) => (
        <LazyBlockWrapper>
            <ComparisonTableBlock {...props} />
        </LazyBlockWrapper>
    ),
    TroubleshootingBlock: (props: any) => (
        <LazyBlockWrapper>
            <TroubleshootingBlock {...props} />
        </LazyBlockWrapper>
    ),
    DecisionTreeBlock: (props: any) => (
        <LazyBlockWrapper>
            <DecisionTreeBlock {...props} />
        </LazyBlockWrapper>
    ),
    InteractiveDiagramBlock: (props: any) => (
        <LazyBlockWrapper>
            <InteractiveDiagramBlock {...props} />
        </LazyBlockWrapper>
    ),
    MathProblemBlock: (props: any) => (
        <LazyBlockWrapper>
            <MathProblemBlock {...props} />
        </LazyBlockWrapper>
    ),
    QuestionnaireRenderer: (props: any) => (
        <LazyBlockWrapper>
            <QuestionnaireProvider>
                <QuestionnaireRenderer {...props} />
            </QuestionnaireProvider>
        </LazyBlockWrapper>
    ),
    MarkdownTable: (props: any) => (
        <LazyBlockWrapper>
            <MarkdownTable {...props} />
        </LazyBlockWrapper>
    ),
    StreamingTableRenderer: (props: any) => (
        <LazyBlockWrapper>
            <StreamingTableRenderer {...props} />
        </LazyBlockWrapper>
    ),
    StreamingDiffBlock: (props: any) => (
        <LazyBlockWrapper>
            <StreamingDiffBlock {...props} />
        </LazyBlockWrapper>
    ),
};

/**
 * Export wrapped loading visualization components
 */
export const LoadingComponents = {
    QuizLoading: () => (
        <LazyBlockWrapper>
            <QuizLoadingVisualization />
        </LazyBlockWrapper>
    ),
    PresentationLoading: () => (
        <LazyBlockWrapper>
            <PresentationLoadingVisualization />
        </LazyBlockWrapper>
    ),
    RecipeLoading: () => (
        <LazyBlockWrapper>
            <RecipeLoadingVisualization />
        </LazyBlockWrapper>
    ),
    TimelineLoading: () => (
        <LazyBlockWrapper>
            <TimelineLoadingVisualization />
        </LazyBlockWrapper>
    ),
    ResearchLoading: () => (
        <LazyBlockWrapper>
            <ResearchLoadingVisualization />
        </LazyBlockWrapper>
    ),
    ResourcesLoading: () => (
        <LazyBlockWrapper>
            <ResourcesLoadingVisualization />
        </LazyBlockWrapper>
    ),
    ProgressLoading: () => (
        <LazyBlockWrapper>
            <ProgressLoadingVisualization />
        </LazyBlockWrapper>
    ),
    ComparisonLoading: () => (
        <LazyBlockWrapper>
            <ComparisonLoadingVisualization />
        </LazyBlockWrapper>
    ),
    TroubleshootingLoading: () => (
        <LazyBlockWrapper>
            <TroubleshootingLoadingVisualization />
        </LazyBlockWrapper>
    ),
    DecisionTreeLoading: () => (
        <LazyBlockWrapper>
            <DecisionTreeLoadingVisualization />
        </LazyBlockWrapper>
    ),
    DiagramLoading: () => (
        <LazyBlockWrapper>
            <DiagramLoadingVisualization />
        </LazyBlockWrapper>
    ),
    MathProblemLoading: () => (
        <LazyBlockWrapper>
            <MathProblemLoadingVisualization />
        </LazyBlockWrapper>
    ),
};


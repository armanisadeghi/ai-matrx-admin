import { BreakConfig } from "./combined-processor-config-system/break-config-processor";
import { MarkdownConfig } from "./json-config-system/config-processor";
import { getConfigObject } from "./json-config-system/config-registry";
import { AstNode } from "./types";

// Lazy-loaded processor functions
const getIntroOutroListProcessor = () => import("./custom/intro-outro-list").then(mod => mod.default);
const getProcessMarkdownWithConfig = () => import("./json-config-system/config-processor").then(mod => mod.default);
const getIntroOutroNestedListProcessor = () => import("./custom/intro-outro-nested-list").then(mod => mod.default);
const getHeadingListProcessor = () => import("./custom/heading-list-processor").then(mod => mod.default);
const getSectionedListProcessor = () => import("./custom/sectioned-list-processor").then(mod => mod.default);
const getCombinedProcessor = () => import("./custom/combined-processor").then(mod => mod.default);
const getCombinedProcessorWithConfig = () => import("./combined-processor-config-system/break-config-processor").then(mod => mod.default);
const getStructuredASTWithConfig = () => import("./structured-ast-config-system/structured-ast-processor").then(mod => mod.default);

export interface Position {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
}

export interface ContentItem {
    id: number;
    title: string;
    text: string;
}

export interface ContentSection {
    title: string;
    text: string;
}

export interface OutputContent {
    intro: ContentSection;
    items: ContentItem[];
    outro: ContentSection;
}

// Updated interface with a generic type parameter for config
export interface MarkdownProcessor<T = any> {
    ast: AstNode;
    config: T;
}

export interface MarkdownProcessorResult {
    extracted: Record<string, any>;
    miscellaneous: string[];
}

// Individual processor definitions
const INTRO_OUTRO_LIST_DEFINITION = {
    id: "intro-outro-list",
    label: "Intro Outro List",
    description:
        "Designed to process something very simple with just an intro, a list of items with bold labels/text and then an outro, with an optional bold start and text.",
    processor: getIntroOutroListProcessor,
    input: "ast",
    output: "introOutroList",
    config: "noConfig",
};

const AST_TO_JSON_WITH_CONFIG_DEFINITION = {
    id: "ast-to-json-with-config",
    label: "Markdown to JSON with Config",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getProcessMarkdownWithConfig,
    input: "ast",
    output: "markdownProcessorResult",
    config: "jsonConfigSystemRegistry",
};

const COMBINED_PROCESSOR_WITH_CONFIG_DEFINITION = {
    id: "combined-processor-with-config",
    label: "Combined Processor with Config",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getCombinedProcessorWithConfig,
    input: "ast",
    output: "combinedProcessorWithConfig",
    config: "combinedProcessorConfigRegistry",
};


const STRUCTURED_AST_WITH_CONFIG_DEFINITION = {
    id: "structured-ast-with-config",
    label: "Structured AST with Config",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getStructuredASTWithConfig,
    input: "ast",
    output: "structuredASTWithConfig",
    config: "structuredASTConfigRegistry",
};


const INTRO_OUTRO_NESTED_LIST_DEFINITION = {
    id: "intro-outro-nested-list",
    label: "Intro Outro Nested List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getIntroOutroNestedListProcessor,
    input: "ast",
    output: "introOutroNestedList",
    config: "noConfig",
};


const SECTIONED_LIST_DEFINITION = {
    id: "sectioned-list",
    label: "Sectioned List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getSectionedListProcessor,
    input: "ast",
    output: "sectionedList",
    config: "noConfig",
};

const HEADING_LIST_DEFINITION = {
    id: "heading-list",
    label: "Heading List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getHeadingListProcessor,
    input: "ast",
    output: "headingList",
    config: "noConfig",
};

const COMBINED_PROCESSOR_DEFINITION = {
    id: "combined-processor",
    label: "Combined Processor",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getCombinedProcessor,
    input: "ast",
    output: "combinedProcessor",
    config: "noConfig",
};


// Processor registry as an array
export const PROCESSOR_REGISTRY = [
    INTRO_OUTRO_LIST_DEFINITION,
    AST_TO_JSON_WITH_CONFIG_DEFINITION,
    INTRO_OUTRO_NESTED_LIST_DEFINITION,
    HEADING_LIST_DEFINITION,
    SECTIONED_LIST_DEFINITION,
    COMBINED_PROCESSOR_DEFINITION,
    COMBINED_PROCESSOR_WITH_CONFIG_DEFINITION,
    STRUCTURED_AST_WITH_CONFIG_DEFINITION,
];


// Map processor IDs to required config types
export const PROCESSOR_CONFIG_TYPE_MAP: Record<string, string> = {
    "ast-to-json-with-config": "jsonConfig",
    "combined-processor-with-config": "breakConfig",
    "structured-ast-with-config": "structuredAst"
};


// Utility functions
export const getProcessorSelectOptions = () => {
    return PROCESSOR_REGISTRY.map(processor => ({
        value: processor.id,
        label: processor.label,
        description: processor.description
    }));
};

export const getProcessorEntry = (processorId: string) => {
    return PROCESSOR_REGISTRY.find(p => p.id === processorId) || null;
};

export const hasProcessor = (processorId: string) => {
    return PROCESSOR_REGISTRY.some(p => p.id === processorId);
};

export const getProcessorFunction = (processorId: string) => {
    const processorEntry = getProcessorEntry(processorId);
    if (!processorEntry) return null;
    
    // Return a function that handles the dynamic import and calling internally
    return async (input: MarkdownProcessor<any>) => {
        const processorModule = await processorEntry.processor();
        return processorModule(input);
    };
};

export const executeProcessor = async <T = any>(
    processorId: string, 
    ast: AstNode, 
    config: any
): Promise<T | null> => {
    const processorFunction = getProcessorFunction(processorId);
    if (!processorFunction) return null;
    
    return processorFunction({ ast, config }) as Promise<T>;
};

export const executeProcessorWithConfigId = async <T = any>(
    processorId: string, 
    ast: AstNode, 
    configId: string
): Promise<T | null> => {
    const config = getConfigObject(configId);
    if (!config) return null;
    const processorFunction = getProcessorFunction(processorId);
    if (!processorFunction) return null;
    
    return processorFunction({ ast, config }) as Promise<T>;
};


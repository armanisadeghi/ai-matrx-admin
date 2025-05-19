import { MarkdownConfig } from "./json-config-system/config-processor";
import { AstNode } from "./types";

// Lazy-loaded processor functions
const getIntroOutroListProcessor = () => import("./custom/intro-outro-list").then(mod => mod.default);
const getProcessMarkdownWithConfig = () => import("./json-config-system/config-processor").then(mod => mod.default);
const getIntroOutroNestedListProcessor = () => import("./custom/intro-outro-nested-list").then(mod => mod.default);
const getHeadingListProcessor = () => import("./custom/heading-list-processor").then(mod => mod.default);
const getSectionedListProcessor = () => import("./custom/sectioned-list-processor").then(mod => mod.default);

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

export interface MarkdownProcessor {
    ast: AstNode;
    config: MarkdownConfig;
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
    config: null,
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

const INTRO_OUTRO_NESTED_LIST_DEFINITION = {
    id: "intro-outro-nested-list",
    label: "Intro Outro Nested List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getIntroOutroNestedListProcessor,
    input: "ast",
    output: "introOutroNestedList",
    config: null,
};


const SECTIONED_LIST_DEFINITION = {
    id: "sectioned-list",
    label: "Sectioned List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getSectionedListProcessor,
    input: "ast",
    output: "sectionedList",
    config: null,
};

const HEADING_LIST_DEFINITION = {
    id: "heading-list",
    label: "Heading List",
    description: "Designed to process a markdown file into a JSON object using a custom config.",
    processor: getHeadingListProcessor,
    input: "ast",
    output: "headingList",
    config: null,
};






// Processor registry as an array
export const PROCESSOR_REGISTRY = [
    INTRO_OUTRO_LIST_DEFINITION,
    AST_TO_JSON_WITH_CONFIG_DEFINITION,
    INTRO_OUTRO_NESTED_LIST_DEFINITION,
    HEADING_LIST_DEFINITION,
    SECTIONED_LIST_DEFINITION,
];

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
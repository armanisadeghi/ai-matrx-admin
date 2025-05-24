import { separatedMarkdownParser } from "./markdown-classification/processors/custom/parser-separated";
import { enhancedMarkdownParser } from "./markdown-classification/processors/custom/enhanced-parser";
import { parseMarkdownSimple } from "./markdown-classification/processors/custom/simple-markdown-parser";

export type LayoutType =
    | "raw"
    | "rendered"
    | "sectionCards"
    | "enhancedSectionCards"
    | "multiSectionCards"
    | "questionnaire"
    | "parsedAsJson"
    | "structured";

const parseMarkdown = (markdown: string, layoutMode: LayoutType) => {
    switch (layoutMode) {
        case "raw":
        case "rendered":
            return markdown;
        case "enhancedSectionCards":
            return enhancedMarkdownParser(markdown);
        case "multiSectionCards":
            return separatedMarkdownParser(markdown);
        case "sectionCards":
            return parseMarkdownSimple(markdown);
        case "questionnaire":
            return separatedMarkdownParser(markdown);
        case "structured":
            return separatedMarkdownParser(markdown);
        case "parsedAsJson":
            return parseMarkdownSimple(markdown);
        default:
            return parseMarkdownSimple(markdown);
    }
};

export const PARSER_OPTIONS = {
    parser: parseMarkdownSimple,
    enhanced: enhancedMarkdownParser,
    separated: separatedMarkdownParser,
};

export type ParserOption = keyof typeof PARSER_OPTIONS;

export default parseMarkdown;

import { separatedMarkdownParser } from "./parser-separated";
import { enhancedMarkdownParser } from "./enhanced-parser";
import { parseMarkdownContent } from "../brokers/output/markdown-utils";

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
            return parseMarkdownContent(markdown);
        case "questionnaire":
            return separatedMarkdownParser(markdown);
        case "structured":
            return separatedMarkdownParser(markdown);
        case "parsedAsJson":
            return parseMarkdownContent(markdown);
        default:
            return parseMarkdownContent(markdown);
    }
};

export const PARSER_OPTIONS = {
    parser: parseMarkdownContent,
    enhanced: enhancedMarkdownParser,
    separated: separatedMarkdownParser,
};

export type ParserOption = keyof typeof PARSER_OPTIONS;

export default parseMarkdown;

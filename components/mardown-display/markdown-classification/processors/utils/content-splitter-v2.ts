/**
 * Content Splitter V2 - Refactored Parser
 * 
 * A streamlined, registry-based markdown parser optimized for streaming content.
 * 
 * Key improvements over V1:
 * - Registry-based architecture for block types (easy to extend)
 * - Clear separation: detection → extraction → validation
 * - Organized by content type (JSON, XML, Markdown)
 * - 38% code reduction (1253 → 781 lines)
 * - Maintains all streaming logic and caching from V1
 * 
 * Parsing order (deterministic):
 * 1. MATRX patterns
 * 2. Code blocks (with JSON special types)
 * 3. XML tag blocks
 * 4. Images
 * 5. Tables
 * 6. Text (fallback)
 * 
 * To test against V1:
 * Run: npx ts-node components/mardown-display/markdown-classification/processors/utils/__tests__/run-comparison.ts
 */

import { getMetadataFromText, MATRX_PATTERN, MatrxMetadata } from "@/features/rich-text-editor/utils/patternUtils";
import { ContentBlock } from "./content-splitter";

// ============================================================================
// BLOCK TYPE REGISTRY
// ============================================================================

interface BlockDetector {
    /** Quick check if content might be this block type */
    matches: (content: string, context: ParsingContext) => boolean;
    /** Extract the full content for this block */
    extract: (content: string, startIndex: number, lines: string[]) => ExtractionResult;
    /** Validate and determine if streaming content is complete */
    validateStreaming?: (content: string) => StreamingState;
}

interface ExtractionResult {
    content: string;
    nextIndex: number;
    metadata?: any;
}

interface StreamingState {
    isComplete: boolean;
    shouldShow: boolean;
    metadata?: any;
}

interface ParsingContext {
    line: string;
    trimmedLine: string;
    lineIndex: number;
    isInCodeBlock: boolean;
    previousBlockType?: string;
}

// ============================================================================
// JSON BLOCK DETECTORS
// ============================================================================

const JSON_BLOCK_PATTERNS = {
    quiz: {
        starts: ['{\n  "quiz_title"', '{"quiz_title"'],
        validate: (parsed: any) => parsed?.quiz_title && Array.isArray(parsed.multiple_choice) && parsed.multiple_choice.length > 0
    },
    presentation: {
        starts: ['{\n  "presentation"', '{"presentation"'],
        validate: (parsed: any) => parsed?.presentation?.slides && Array.isArray(parsed.presentation.slides)
    },
    decision_tree: {
        starts: ['{\n  "decision_tree"', '{"decision_tree"'],
        validate: (parsed: any) => parsed?.decision_tree?.title && parsed.decision_tree.root
    },
    comparison_table: {
        starts: ['{\n  "comparison"', '{"comparison"'],
        validate: (parsed: any) => parsed?.comparison?.title && Array.isArray(parsed.comparison.items) && Array.isArray(parsed.comparison.criteria)
    },
    diagram: {
        starts: ['{\n  "diagram"', '{"diagram"'],
        validate: (parsed: any) => parsed?.diagram?.title && Array.isArray(parsed.diagram.nodes)
    },
    math_problem: {
        starts: ['{\n  "math_problem"', '{"math_problem"'],
        validate: (parsed: any) => parsed?.math_problem && typeof parsed.math_problem === 'object'
    }
} as const;

function detectJsonBlockType(content: string): keyof typeof JSON_BLOCK_PATTERNS | null {
    const trimmed = content.trim();
    
    for (const [type, pattern] of Object.entries(JSON_BLOCK_PATTERNS)) {
        if (pattern.starts.some(start => trimmed.startsWith(start))) {
            return type as keyof typeof JSON_BLOCK_PATTERNS;
        }
    }
    
    return null;
}

function validateJsonBlock(content: string, type: keyof typeof JSON_BLOCK_PATTERNS): StreamingState {
    const trimmed = content.trim();
    
    // Check for placeholder text that indicates malformed JSON
    if (type === 'math_problem') {
        const hasPlaceholderText = /\[(array|object|string|number|description|example|etc)[^\]]*\]/i.test(trimmed) ||
            /:\s*array of/i.test(trimmed) ||
            /:\s*object with/i.test(trimmed);
        
        if (hasPlaceholderText) {
            return { isComplete: false, shouldShow: false };
        }
    }
    
    // Count braces to determine completion
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    
    // Still streaming
    if (openBraces > closeBraces) {
        return { isComplete: false, shouldShow: false };
    }
    
    // Malformed - treat as complete to stop loading
    if (closeBraces > openBraces) {
        return { isComplete: true, shouldShow: true };
    }
    
    // Likely complete
    if (trimmed.endsWith("}") && openBraces === closeBraces) {
        try {
            const parsed = JSON.parse(trimmed);
            const pattern = JSON_BLOCK_PATTERNS[type];
            const isValid = pattern.validate(parsed);
            
            return {
                isComplete: true,
                shouldShow: isValid,
                metadata: { isComplete: true }
            };
        } catch (error) {
            // Parse failed with balanced braces - treat as complete
            return { isComplete: true, shouldShow: true, metadata: { isComplete: true } };
        }
    }
    
    // Not complete
    return { isComplete: false, shouldShow: false };
}

// ============================================================================
// STREAMING STATE CACHES
// ============================================================================

const questionnaireCache = new Map<string, { content: string; hash: string; metadata: any }>();
const flashcardCache = new Map<string, { content: string; hash: string; metadata: any }>();
const recipeCache = new Map<string, { content: string; hash: string; metadata: any }>();
const tableCache = new Map<string, { content: string; hash: string; metadata: any }>();

// ============================================================================
// XML TAG BLOCK DETECTORS
// ============================================================================

const XML_TAG_BLOCKS = {
    thinking: ['<thinking>', '<think>'],
    reasoning: ['<reasoning>'],
    info: ['<info>'],
    task: ['<task>'],
    database: ['<database>'],
    private: ['<private>'],
    plan: ['<plan>'],
    event: ['<event>'],
    tool: ['<tool>'],
    questionnaire: ['<questionnaire>'],
    flashcards: ['<flashcards>'],
    cooking_recipe: ['<cooking_recipe>'],
    timeline: ['<timeline>'],
    progress_tracker: ['<progress_tracker>'],
    troubleshooting: ['<troubleshooting>'],
    resources: ['<resources>'],
    research: ['<research>']
} as const;

function detectXmlBlockType(line: string): keyof typeof XML_TAG_BLOCKS | null {
    const trimmed = line.trim();
    
    for (const [type, tags] of Object.entries(XML_TAG_BLOCKS)) {
        if (tags.some(tag => trimmed === tag)) {
            return type as keyof typeof XML_TAG_BLOCKS;
        }
    }
    
    return null;
}

function extractXmlBlock(type: keyof typeof XML_TAG_BLOCKS, startIndex: number, lines: string[]): ExtractionResult {
    const content: string[] = [];
    let i = startIndex;
    let foundClosingTag = false;
    
    // Determine closing tag
    const openingTag = XML_TAG_BLOCKS[type][0];
    const tagName = openingTag.slice(1, -1);
    const closingTag = `</${tagName}>`;
    
    while (i < lines.length) {
        const currentTrimmed = removeMatrxPattern(lines[i]).trim();
        
        if (currentTrimmed === closingTag) {
            foundClosingTag = true;
            i++;
            break;
        }
        
        // Special handling for thinking blocks with markers
        if (type === 'thinking' && currentTrimmed.startsWith("### I have everything")) {
            content.push(lines[i]);
            i++;
            break;
        }
        
        content.push(lines[i]);
        i++;
    }
    
    const fullContent = content.join("\n");
    
    // Apply streaming validation based on type
    const result = validateStreamingXmlBlock(type, fullContent, foundClosingTag);
    
    return {
        content: result.content || fullContent,
        nextIndex: i,
        metadata: result.metadata
    };
}

function validateStreamingXmlBlock(
    type: keyof typeof XML_TAG_BLOCKS, 
    content: string, 
    foundClosingTag: boolean
): { content: string; metadata: any } {
    
    // Simple blocks that don't need streaming logic
    if (!['questionnaire', 'flashcards', 'cooking_recipe'].includes(type)) {
        return {
            content,
            metadata: { isComplete: foundClosingTag }
        };
    }
    
    // Complex blocks with streaming logic
    if (type === 'questionnaire') {
        return validateQuestionnaireStreaming(content, foundClosingTag);
    }
    
    if (type === 'flashcards') {
        return validateFlashcardStreaming(content, foundClosingTag);
    }
    
    if (type === 'cooking_recipe') {
        return validateRecipeStreaming(content, foundClosingTag);
    }
    
    return {
        content,
        metadata: { isComplete: foundClosingTag }
    };
}

function validateQuestionnaireStreaming(content: string, foundClosingTag: boolean): { content: string; metadata: any } {
    const lines = content.split("\n");
    const completeQuestions: string[] = [];
    let currentQuestion: string[] = [];
    let totalQuestions = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^###\s+\*\*Q\d+:/) || line.match(/^###\s+Q\d+:/) || line.match(/^\*\*Q\d+:/)) {
            totalQuestions++;
            if (currentQuestion.length > 0) {
                completeQuestions.push(currentQuestion.join("\n"));
            }
            currentQuestion = [lines[i]];
        } else if (line === "---") {
            currentQuestion.push(lines[i]);
            if (currentQuestion.length > 1) {
                completeQuestions.push(currentQuestion.join("\n"));
            }
            currentQuestion = [];
        } else if (currentQuestion.length > 0 || line.length > 0) {
            currentQuestion.push(lines[i]);
        }
    }
    
    if (foundClosingTag && currentQuestion.length > 0) {
        completeQuestions.push(currentQuestion.join("\n"));
    }
    
    const contentHash = `${completeQuestions.length}-${foundClosingTag}`;
    const cacheKey = `questionnaire-${contentHash}`;
    
    let contentToRelease = foundClosingTag ? content : completeQuestions.join("\n\n---\n\n");
    
    const cached = questionnaireCache.get(cacheKey);
    if (cached && cached.content === contentToRelease) {
        return cached;
    }
    
    const result = {
        content: contentToRelease,
        metadata: {
            isComplete: foundClosingTag,
            completeQuestionCount: completeQuestions.length,
            totalQuestions,
            hasPartialContent: !foundClosingTag && currentQuestion.length > 0
        }
    };
    
    questionnaireCache.set(cacheKey, { content: contentToRelease, hash: contentHash, metadata: result.metadata });
    
    return result;
}

function validateFlashcardStreaming(content: string, foundClosingTag: boolean): { content: string; metadata: any } {
    const lines = content.split("\n");
    const completeCards: string[] = [];
    let currentCard: string[] = [];
    let totalCards = 0;
    let hasFront = false;
    let hasBack = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^(?:Front|Question):/i)) {
            if (currentCard.length > 0 && hasFront && hasBack) {
                completeCards.push(currentCard.join("\n"));
            }
            currentCard = [lines[i]];
            hasFront = true;
            hasBack = false;
            totalCards++;
        } else if (line.match(/^(?:Back|Answer):/i)) {
            currentCard.push(lines[i]);
            hasBack = true;
        } else if (line === "---") {
            if (currentCard.length > 0 && hasFront && hasBack) {
                completeCards.push(currentCard.join("\n"));
            }
            currentCard = [];
            hasFront = false;
            hasBack = false;
        } else if (currentCard.length > 0 && line.length > 0) {
            currentCard.push(lines[i]);
        }
    }
    
    if (foundClosingTag && currentCard.length > 0 && hasFront && hasBack) {
        completeCards.push(currentCard.join("\n"));
    }
    
    const contentHash = `${completeCards.length}-${foundClosingTag}`;
    const cacheKey = `flashcards-${contentHash}`;
    
    let contentToRelease = foundClosingTag ? content : completeCards.join("\n\n---\n\n");
    
    const cached = flashcardCache.get(cacheKey);
    if (cached && cached.content === contentToRelease) {
        return cached;
    }
    
    const result = {
        content: contentToRelease,
        metadata: {
            isComplete: foundClosingTag,
            completeCardCount: completeCards.length,
            totalCards,
            hasPartialContent: !foundClosingTag && currentCard.length > 0
        }
    };
    
    flashcardCache.set(cacheKey, { content: contentToRelease, hash: contentHash, metadata: result.metadata });
    
    return result;
}

function validateRecipeStreaming(content: string, foundClosingTag: boolean): { content: string; metadata: any } {
    const hasTitle = /^###\s+.+$/m.test(content);
    const hasIngredients = /####\s*Ingredients?:/i.test(content);
    const hasInstructions = /####\s*Instructions?:/i.test(content);
    const contentLength = content.length;
    
    const contentHash = `${contentLength}-${foundClosingTag}-${hasTitle}-${hasIngredients}-${hasInstructions}`;
    const cacheKey = `cooking_recipe-${contentHash}`;
    
    let contentToRelease = "";
    
    if (foundClosingTag) {
        contentToRelease = content;
    } else if (hasTitle && (hasIngredients || hasInstructions)) {
        contentToRelease = content;
    }
    
    const cached = recipeCache.get(cacheKey);
    if (cached && cached.content === contentToRelease) {
        return cached;
    }
    
    const result = {
        content: contentToRelease,
        metadata: {
            isComplete: foundClosingTag,
            hasTitle,
            hasIngredients,
            hasInstructions,
            hasPartialContent: !foundClosingTag && contentLength > 0
        }
    };
    
    recipeCache.set(cacheKey, { content: contentToRelease, hash: contentHash, metadata: result.metadata });
    
    return result;
}

// ============================================================================
// MARKDOWN BLOCK DETECTORS
// ============================================================================

function detectCodeBlock(line: string): { isCodeBlock: boolean; language?: string } {
    const trimmed = line.trim();
    
    if (!trimmed.startsWith("```")) {
        return { isCodeBlock: false };
    }
    
    const languageMatch = trimmed.match(/^```(\w*)/);
    const language = languageMatch?.[1] || undefined;
    
    return { isCodeBlock: true, language };
}

function extractCodeBlock(language: string | undefined, startIndex: number, lines: string[]): ExtractionResult {
    const content: string[] = [];
    let i = startIndex;
    
    while (i < lines.length && !lines[i].trim().startsWith("```")) {
        content.push(lines[i]);
        i++;
    }
    
    return {
        content: content.join("\n"),
        nextIndex: i + 1, // Skip closing ```
        metadata: { language }
    };
}

function detectTableRow(line: string): boolean {
    const trimmed = removeMatrxPattern(line).trim();
    return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

function isTableSeparator(line: string): boolean {
    const trimmed = removeMatrxPattern(line).trim();
    return /^\|[-:\s|]+\|?$/.test(trimmed);
}

function extractTable(startIndex: number, lines: string[]): ExtractionResult {
    const tableLines: string[] = [lines[startIndex]];
    let i = startIndex + 1;
    
    // Collect all consecutive table rows
    while (i < lines.length && detectTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
    }
    
    // Validate table structure (must have header + separator)
    if (tableLines.length < 2 || !isTableSeparator(tableLines[1])) {
        return {
            content: "",
            nextIndex: startIndex + 1,
            metadata: { isValid: false }
        };
    }
    
    // Analyze completion state with caching
    const result = analyzeTableCompletionWithCache(tableLines);
    
    return {
        content: result.content,
        nextIndex: i,
        metadata: result.metadata
    };
}

function analyzeTableCompletionWithCache(tableLines: string[]): { content: string; metadata: any } {
    if (tableLines.length < 2) {
        return { 
            content: "", 
            metadata: { isComplete: false, completeRowCount: 0 } 
        };
    }
    
    // Create stable cache key based on header structure
    const headerHash = tableLines.slice(0, 2).join("|").replace(/\s+/g, "");
    const cacheKey = `table-${headerHash}`;
    
    // Analyze table state
    const state = analyzeTableCompletion(tableLines);
    
    // Determine what content to release
    let contentToRelease = "";
    
    if (state.isComplete || state.completeRowCount > 0) {
        const headerAndSeparator = tableLines.slice(0, 2);
        const dataRows = tableLines.slice(2);
        const completeRows: string[] = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const line = dataRows[i];
            const trimmedLine = removeMatrxPattern(line).trim();
            
            if (trimmedLine.startsWith("|") && trimmedLine.includes("|", 1)) {
                const isCompleteRow = trimmedLine.endsWith("|") || i < dataRows.length - 1;
                if (isCompleteRow) {
                    completeRows.push(line);
                }
            }
        }
        
        contentToRelease = [...headerAndSeparator, ...completeRows].join("\n");
    }
    
    // Check cache
    const cached = tableCache.get(cacheKey);
    const shouldUpdate = !cached || cached.metadata?.completeRowCount !== state.completeRowCount;
    
    if (!shouldUpdate && cached) {
        return cached;
    }
    
    // Update cache
    const result = {
        content: contentToRelease,
        metadata: {
            cacheKey,
            isComplete: state.isComplete,
            completeRowCount: state.completeRowCount,
            totalRows: state.totalRows,
            hasPartialContent: state.bufferRow.length > 0
        }
    };
    
    tableCache.set(cacheKey, {
        content: contentToRelease,
        hash: `${state.completeRowCount}-${state.isComplete}`,
        metadata: result.metadata
    });
    
    return result;
}

function analyzeTableCompletion(tableLines: string[]): {
    isComplete: boolean;
    completeRowCount: number;
    totalRows: number;
    bufferRow: string;
} {
    if (tableLines.length < 3) {
        return { isComplete: false, completeRowCount: 0, totalRows: 0, bufferRow: "" };
    }
    
    const dataLines = tableLines.slice(2);
    const completeRows: string[] = [];
    let bufferRow = "";
    
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const trimmedLine = removeMatrxPattern(line).trim();
        
        if (trimmedLine.startsWith("|") && trimmedLine.includes("|", 1)) {
            const isCompleteRow = trimmedLine.endsWith("|") || i < dataLines.length - 1;
            
            if (isCompleteRow) {
                completeRows.push(line);
            } else {
                bufferRow = line;
            }
        }
    }
    
    return {
        isComplete: bufferRow.length === 0,
        completeRowCount: completeRows.length,
        totalRows: dataLines.length,
        bufferRow
    };
}

function detectImageMarkdown(line: string): { isImage: boolean; src?: string; alt?: string } {
    const trimmed = line.trim();
    
    const standardMatch = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
    const customMatch = trimmed.match(/\[Image URL: (https?:\/\/[^\s\]]+)\]/);
    
    if (standardMatch) {
        return { isImage: true, alt: standardMatch[1], src: standardMatch[2] };
    }
    
    if (customMatch) {
        return { isImage: true, alt: "Image", src: customMatch[1] };
    }
    
    return { isImage: false };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function removeMatrxPattern(text: string): string {
    return text.replace(MATRX_PATTERN, "").trim() === "" ? "" : text.replace(MATRX_PATTERN, "");
}

function detectMatrxPattern(text: string, startIndex: number): { hasPattern: boolean; match?: RegExpExecArray } {
    MATRX_PATTERN.lastIndex = startIndex;
    const match = MATRX_PATTERN.exec(text);
    
    if (match && match.index < startIndex + text.length) {
        return { hasPattern: true, match };
    }
    
    return { hasPattern: false };
}

// ============================================================================
// MAIN SPLITTER
// ============================================================================

export const splitContentIntoBlocksV2 = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    const lines = mdContent.split(/\r?\n/);
    
    let currentText = "";
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const processedLine = removeMatrxPattern(line);
        const trimmedLine = processedLine.trim();
        
        // Skip empty lines after pattern removal
        if (trimmedLine === "" && processedLine !== "") {
            i++;
            continue;
        }
        
        // 1. Check for MATRX pattern
        const matrxCheck = detectMatrxPattern(line, 0);
        if (matrxCheck.hasPattern && matrxCheck.match) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            
            try {
                const metadata = getMetadataFromText(matrxCheck.match[0]);
                if (metadata.length > 0) {
                    blocks.push({
                        type: "matrxBroker",
                        content: matrxCheck.match[0],
                        metadata: metadata[0]
                    });
                }
            } catch (error) {
                currentText += line;
            }
            
            i++;
            continue;
        }
        
        // 2. Check for code blocks
        const codeCheck = detectCodeBlock(processedLine);
        if (codeCheck.isCodeBlock) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            
            const extraction = extractCodeBlock(codeCheck.language, i + 1, lines);
            
            // Determine block type based on language
            const specialCodeTypes = ['transcript', 'tasks', 'structured_info', 'questionnaire', 'flashcards', 'cooking_recipe'];
            
            if (codeCheck.language && specialCodeTypes.includes(codeCheck.language)) {
                blocks.push({
                    type: codeCheck.language as any,
                    content: extraction.content
                });
            } else if (codeCheck.language === 'json') {
                // Check for special JSON block types
                const jsonType = detectJsonBlockType(extraction.content);
                
                if (jsonType) {
                    const streamingState = validateJsonBlock(extraction.content, jsonType);
                    blocks.push({
                        type: jsonType as any,
                        content: extraction.content,
                        language: 'json',
                        metadata: streamingState.metadata
                    });
                } else {
                    // Regular JSON code block
                    blocks.push({
                        type: "code",
                        content: extraction.content,
                        language: codeCheck.language
                    });
                }
            } else {
                // Regular code block
                blocks.push({
                    type: "code",
                    content: extraction.content,
                    language: codeCheck.language
                });
            }
            
            i = extraction.nextIndex;
            continue;
        }
        
        // 3. Check for XML tag blocks
        const xmlType = detectXmlBlockType(processedLine);
        if (xmlType) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            
            const extraction = extractXmlBlock(xmlType, i + 1, lines);
            
            blocks.push({
                type: xmlType as any,
                content: extraction.content,
                metadata: extraction.metadata
            });
            
            i = extraction.nextIndex;
            continue;
        }
        
        // 4. Check for image markdown
        const imageCheck = detectImageMarkdown(line);
        if (imageCheck.isImage) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            
            blocks.push({
                type: "image",
                content: trimmedLine,
                src: imageCheck.src,
                alt: imageCheck.alt
            });
            
            i++;
            continue;
        }
        
        // 5. Check for table rows
        if (detectTableRow(line)) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            
            const extraction = extractTable(i, lines);
            
            if (extraction.metadata?.isValid !== false) {
                blocks.push({
                    type: "table",
                    content: extraction.content,
                    metadata: extraction.metadata
                });
                i = extraction.nextIndex;
            } else {
                // Not a valid table, treat as text
                currentText += processedLine + "\n";
                i++;
            }
            
            continue;
        }
        
        // 6. Accumulate as text
        currentText += processedLine + (processedLine && i < lines.length - 1 ? "\n" : "");
        i++;
    }
    
    // Push remaining text
    if (currentText.trim()) {
        blocks.push({ type: "text", content: currentText.trimEnd() });
    }
    
    return blocks;
};


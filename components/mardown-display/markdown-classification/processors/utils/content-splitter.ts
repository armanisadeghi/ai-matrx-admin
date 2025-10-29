import { getMetadataFromText, MATRX_PATTERN, MatrxMetadata } from "@/features/rich-text-editor/utils/patternUtils";

export interface ContentBlock {
    type: "text" | "code" | "table" | "thinking" | "reasoning" | "image" | "tasks" | "transcript" | "structured_info" | "matrxBroker" | "questionnaire" | "flashcards" | "quiz" | "presentation" | "cooking_recipe" | "timeline" | "progress_tracker" | "comparison_table" | "troubleshooting" | "resources" | "decision_tree" | "research" | "diagram" | "math_problem" | string;
    content: string;
    language?: string;
    src?: string;
    alt?: string;
    metadata?: any;
}

interface QuestionnaireState {
    isComplete: boolean;
    completeQuestions: string[];
    bufferContent: string;
    totalQuestions: number;
    completeQuestionCount: number;
}

interface FlashcardState {
    isComplete: boolean;
    completeCards: string[];
    bufferContent: string;
    totalCards: number;
    completeCardCount: number;
}

// Cache for questionnaire content to prevent unnecessary updates
const questionnaireCache = new Map<string, { content: string; hash: string; metadata: any }>();

// Cache for flashcard content to prevent unnecessary updates during streaming
const flashcardCache = new Map<string, { content: string; hash: string; metadata: any }>();

// Cache for cooking recipe content to prevent unnecessary updates during streaming
const recipeCache = new Map<string, { content: string; hash: string; metadata: any }>();

// Cache for table content to prevent unnecessary updates during streaming
const tableCache = new Map<string, { content: string; hash: string; metadata: any }>();

interface TableState {
    isComplete: boolean;
    completeRows: string[];
    bufferRow: string;
    totalRows: number;
    completeRowCount: number;
}

interface RecipeState {
    isComplete: boolean;
    hasTitle: boolean;
    hasIngredients: boolean;
    hasInstructions: boolean;
    contentLength: number;
}

export const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentText = "";
    let insideMarkdownBlock = false;
    let currentIndex = 0;
    
    // Table streaming buffer
    let potentialTableLines: string[] = [];
    let inPotentialTable = false;

    // List of special tags to handle
    const specialTags = ["info", "task", "database", "private", "plan", "event", "tool", "questionnaire", "flashcards", "cooking_recipe", "timeline", "progress_tracker", "troubleshooting", "resources", "research"];

    // Helper function to check if a line looks like a table row
    const looksLikeTableRow = (line: string): boolean => {
        const trimmed = removeMatrxPattern(line).trim();
        return trimmed.startsWith("|") && trimmed.includes("|", 1);
    };

    // Helper function to check if a line is a table separator
    const isTableSeparator = (line: string): boolean => {
        const trimmed = removeMatrxPattern(line).trim();
        return trimmed.match(/^\|[-:\s|]+\|?$/) !== null;
    };

    // Helper function to process potential table buffer
    const processPotentialTable = (): boolean => {
        if (potentialTableLines.length < 2) return false;
        
        // Check if we have header + separator pattern
        const hasValidSeparator = potentialTableLines.length >= 2 && 
                                 isTableSeparator(potentialTableLines[1]);
        
        if (hasValidSeparator) {
            // This is a confirmed table, process it with controlled release
            const tableState = analyzeTableCompletion(potentialTableLines);
            
            // Create a stable cache key based on table header structure, not row count
            const headerHash = potentialTableLines.slice(0, 2).join('|').replace(/\s+/g, '');
            const cacheKey = `table-${headerHash}`;
            
            // Check if we should release new content
            const cached = tableCache.get(cacheKey);
            let contentToRelease = "";
            let shouldUpdate = false;
            
            if (tableState.isComplete || tableState.completeRowCount > 0) {
                // Build content with header, separator, and complete rows only
                const headerAndSeparator = potentialTableLines.slice(0, 2);
                const completeRowsContent = tableState.completeRows;
                contentToRelease = [...headerAndSeparator, ...completeRowsContent].join("\n");
                
                // Check if we have new complete rows (compare row count, not content)
                shouldUpdate = !cached || cached.metadata?.completeRowCount !== tableState.completeRowCount;
            } else {
                // No complete rows yet, don't create a table block
                return true; // Keep buffering
            }
            
            // Update cache if content changed
            if (shouldUpdate) {
                // Remove any existing table block with the same cache key
                const existingBlockIndex = blocks.findIndex(block => 
                    block.type === "table" && block.metadata?.cacheKey === cacheKey
                );
                
                if (existingBlockIndex !== -1) {
                    // Update existing block instead of creating new one
                    blocks[existingBlockIndex] = {
                        type: "table",
                        content: contentToRelease,
                        metadata: {
                            cacheKey,
                            isComplete: tableState.isComplete,
                            completeRowCount: tableState.completeRowCount,
                            totalRows: tableState.totalRows,
                            hasPartialContent: tableState.bufferRow.length > 0
                        }
                    };
                } else {
                    // Create new table block
                    blocks.push({
                        type: "table",
                        content: contentToRelease,
                        metadata: {
                            cacheKey,
                            isComplete: tableState.isComplete,
                            completeRowCount: tableState.completeRowCount,
                            totalRows: tableState.totalRows,
                            hasPartialContent: tableState.bufferRow.length > 0
                        }
                    });
                }
                
                // Update cache
                tableCache.set(cacheKey, {
                    content: contentToRelease,
                    hash: `${tableState.completeRowCount}-${tableState.isComplete}`,
                    metadata: {
                        cacheKey,
                        isComplete: tableState.isComplete,
                        completeRowCount: tableState.completeRowCount,
                        totalRows: tableState.totalRows,
                        hasPartialContent: tableState.bufferRow.length > 0
                    }
                });
            }
            
            return true; // Table processed
        } else {
            // Not a table, flush buffer to text
            currentText += potentialTableLines.join("\n") + "\n";
            return false;
        }
    };

    // Function to analyze table completion state for controlled row release
    const analyzeTableCompletion = (tableLines: string[]): TableState => {
        if (tableLines.length < 3) {
            return { isComplete: false, completeRows: [], bufferRow: "", totalRows: 0, completeRowCount: 0 };
        }

        // Skip header and separator, process data rows
        const dataLines = tableLines.slice(2);
        const completeRows: string[] = [];
        let bufferRow = "";
        let totalRows = 0;

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            const trimmedLine = removeMatrxPattern(line).trim();
            
            if (trimmedLine.startsWith("|") && trimmedLine.includes("|", 1)) {
                totalRows++;
                
                // Check if this looks like a complete row
                const isCompleteRow = trimmedLine.endsWith("|") || i < dataLines.length - 1;
                
                if (isCompleteRow) {
                    completeRows.push(line);
                } else {
                    // This is an incomplete row, buffer it
                    bufferRow = line;
                }
            }
        }

        // Table is complete if we have no buffered incomplete row
        const isComplete = bufferRow.length === 0;

        return {
            isComplete,
            completeRows,
            bufferRow,
            totalRows,
            completeRowCount: completeRows.length
        };
    };

    // Function to analyze questionnaire completion state
    const analyzeQuestionnaireCompletion = (content: string): QuestionnaireState => {
        const lines = content.split('\n');
        const completeQuestions: string[] = [];
        let currentQuestion: string[] = [];
        let totalQuestions = 0;
        let isComplete = false;
        
        // Check if questionnaire is fully complete (has closing tag)
        isComplete = content.includes('</questionnaire>');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detect start of new question
            if (line.match(/^###\s+\*\*Q\d+:/) || line.match(/^###\s+Q\d+:/) || line.match(/^\*\*Q\d+:/)) {
                totalQuestions++;
                
                // Save previous question if it was complete
                if (currentQuestion.length > 0) {
                    completeQuestions.push(currentQuestion.join('\n'));
                }
                currentQuestion = [lines[i]];
            } 
            // Detect question separator (end of current question)
            else if (line === '---') {
                currentQuestion.push(lines[i]);
                if (currentQuestion.length > 1) { // Must have more than just the separator
                    completeQuestions.push(currentQuestion.join('\n'));
                }
                currentQuestion = [];
            } 
            // Accumulate question content
            else if (currentQuestion.length > 0 || line.length > 0) {
                currentQuestion.push(lines[i]);
            }
        }
        
        // If questionnaire is complete, include the final question even without separator
        if (isComplete && currentQuestion.length > 0) {
            completeQuestions.push(currentQuestion.join('\n'));
        }
        
        return {
            isComplete,
            completeQuestions,
            bufferContent: isComplete ? '' : currentQuestion.join('\n'),
            totalQuestions,
            completeQuestionCount: completeQuestions.length
        };
    };

    // Function to analyze flashcard completion state
    const analyzeFlashcardCompletion = (content: string): FlashcardState => {
        const lines = content.split('\n');
        const completeCards: string[] = [];
        let currentCard: string[] = [];
        let totalCards = 0;
        let isComplete = false;
        let hasFront = false;
        let hasBack = false;
        
        // Check if flashcard block is fully complete (has closing tag)
        isComplete = content.includes('</flashcards>');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detect start of new flashcard (Front: or Question:)
            if (line.match(/^(?:Front|Question):/i)) {
                // Save previous card if it was complete
                if (currentCard.length > 0 && hasFront && hasBack) {
                    completeCards.push(currentCard.join('\n'));
                }
                currentCard = [lines[i]];
                hasFront = true;
                hasBack = false;
                totalCards++;
            }
            // Detect back of flashcard (Back: or Answer:)
            else if (line.match(/^(?:Back|Answer):/i)) {
                currentCard.push(lines[i]);
                hasBack = true;
            }
            // Detect card separator (end of current card)
            else if (line === '---') {
                if (currentCard.length > 0 && hasFront && hasBack) {
                    completeCards.push(currentCard.join('\n'));
                }
                currentCard = [];
                hasFront = false;
                hasBack = false;
            }
            // Accumulate card content
            else if (currentCard.length > 0 && line.length > 0) {
                currentCard.push(lines[i]);
            }
        }
        
        // If flashcard block is complete, include the final card even without separator
        if (isComplete && currentCard.length > 0 && hasFront && hasBack) {
            completeCards.push(currentCard.join('\n'));
        }
        
        return {
            isComplete,
            completeCards,
            bufferContent: isComplete ? '' : currentCard.join('\n'),
            totalCards,
            completeCardCount: completeCards.length
        };
    };

    // Function to analyze recipe completion state
    const analyzeRecipeCompletion = (content: string): RecipeState => {
        const hasTitle = /^###\s+.+$/m.test(content);
        const hasIngredients = /####\s*Ingredients?:/i.test(content);
        const hasInstructions = /####\s*Instructions?:/i.test(content);
        const isComplete = content.includes('</cooking_recipe>');
        const contentLength = content.length;

        return {
            isComplete,
            hasTitle,
            hasIngredients,
            hasInstructions,
            contentLength
        };
    };

    // Function to handle special tags
    const handleSpecialTags = (tag: string, startIndex: number, lines: string[]): { content: string; newIndex: number; metadata?: any } => {
        const content: string[] = [];
        let i = startIndex;
        let foundClosingTag = false;
        const closingTag = `</${tag}>`;

        while (i < lines.length) {
            const currentTrimmedLine = lines[i].trim();
            if (currentTrimmedLine === closingTag) {
                foundClosingTag = true;
                i++; // Skip the closing tag
                break;
            }
            content.push(lines[i]);
            i++;
        }

        const fullContent = content.join("\n");
        
        // Special handling for questionnaire tags
        if (tag === "questionnaire") {
            const questionnaireState = analyzeQuestionnaireCompletion(fullContent);
            
            // Override isComplete based on whether we found the closing tag
            const actuallyComplete = foundClosingTag;
            
            // Create a unique cache key based on the content hash
            const contentHash = `${questionnaireState.completeQuestionCount}-${actuallyComplete}`;
            const cacheKey = `questionnaire-${contentHash}`;
            
            // Check if we should release new content
            const cached = questionnaireCache.get(cacheKey);
            let contentToRelease = "";
            let shouldUpdate = false;
            
            if (actuallyComplete) {
                // If questionnaire is complete, release all content
                contentToRelease = fullContent;
                shouldUpdate = true;
            } else {
                // Only release complete questions
                contentToRelease = questionnaireState.completeQuestions.join('\n\n---\n\n');
                
                // Check if we have new complete questions
                shouldUpdate = !cached || cached.content !== contentToRelease;
            }
            
            // Update cache if content changed
            if (shouldUpdate) {
                questionnaireCache.set(cacheKey, {
                    content: contentToRelease,
                    hash: contentHash,
                    metadata: {
                        isComplete: actuallyComplete,
                        completeQuestionCount: questionnaireState.completeQuestionCount,
                        totalQuestions: questionnaireState.totalQuestions,
                        hasPartialContent: !actuallyComplete && questionnaireState.bufferContent.length > 0
                    }
                });
            }
            
            // Return cached content if no update needed
            const finalCache = questionnaireCache.get(cacheKey);
            return {
                content: finalCache?.content || contentToRelease,
                newIndex: i,
                metadata: finalCache?.metadata || {
                    isComplete: actuallyComplete,
                    completeQuestionCount: questionnaireState.completeQuestionCount,
                    totalQuestions: questionnaireState.totalQuestions,
                    hasPartialContent: !actuallyComplete && questionnaireState.bufferContent.length > 0
                }
            };
        }

        // Special handling for flashcard tags
        if (tag === "flashcards") {
            const flashcardState = analyzeFlashcardCompletion(fullContent);
            
            // Override isComplete based on whether we found the closing tag
            const actuallyComplete = foundClosingTag;
            
            // Create a unique cache key based on the content hash
            const contentHash = `${flashcardState.completeCardCount}-${actuallyComplete}`;
            const cacheKey = `flashcards-${contentHash}`;
            
            // Check if we should release new content
            const cached = flashcardCache.get(cacheKey);
            let contentToRelease = "";
            let shouldUpdate = false;
            
            if (actuallyComplete) {
                // If flashcard block is complete, release all content
                contentToRelease = fullContent;
                shouldUpdate = true;
            } else {
                // Only release complete flashcards
                contentToRelease = flashcardState.completeCards.join('\n\n---\n\n');
                
                // Check if we have new complete flashcards
                shouldUpdate = !cached || cached.content !== contentToRelease;
            }
            
            // Update cache if content changed
            if (shouldUpdate) {
                flashcardCache.set(cacheKey, {
                    content: contentToRelease,
                    hash: contentHash,
                    metadata: {
                        isComplete: actuallyComplete,
                        completeCardCount: flashcardState.completeCardCount,
                        totalCards: flashcardState.totalCards,
                        hasPartialContent: !actuallyComplete && flashcardState.bufferContent.length > 0
                    }
                });
            }
            
            // Return cached content if no update needed
            const finalCache = flashcardCache.get(cacheKey);
            return {
                content: finalCache?.content || contentToRelease,
                newIndex: i,
                metadata: finalCache?.metadata || {
                    isComplete: actuallyComplete,
                    completeCardCount: flashcardState.completeCardCount,
                    totalCards: flashcardState.totalCards,
                    hasPartialContent: !actuallyComplete && flashcardState.bufferContent.length > 0
                }
            };
        }

        // Special handling for cooking_recipe tags
        if (tag === "cooking_recipe") {
            const recipeState = analyzeRecipeCompletion(fullContent);
            
            // Override isComplete based on whether we found the closing tag
            const actuallyComplete = foundClosingTag;
            
            // Create a unique cache key based on the content state
            const contentHash = `${recipeState.contentLength}-${actuallyComplete}-${recipeState.hasTitle}-${recipeState.hasIngredients}-${recipeState.hasInstructions}`;
            const cacheKey = `cooking_recipe-${contentHash}`;
            
            // Check if we should release new content
            const cached = recipeCache.get(cacheKey);
            let contentToRelease = "";
            let shouldUpdate = false;
            
            if (actuallyComplete) {
                // If recipe block is complete, release all content
                contentToRelease = fullContent;
                shouldUpdate = true;
            } else {
                // For streaming recipes, show content if we have meaningful structure
                if (recipeState.hasTitle && (recipeState.hasIngredients || recipeState.hasInstructions)) {
                    contentToRelease = fullContent;
                } else {
                    contentToRelease = ""; // Don't show incomplete structure
                }
                
                // Check if content changed
                shouldUpdate = !cached || cached.content !== contentToRelease;
            }
            
            // Update cache if content changed
            if (shouldUpdate) {
                recipeCache.set(cacheKey, {
                    content: contentToRelease,
                    hash: contentHash,
                    metadata: {
                        isComplete: actuallyComplete,
                        hasTitle: recipeState.hasTitle,
                        hasIngredients: recipeState.hasIngredients,
                        hasInstructions: recipeState.hasInstructions,
                        hasPartialContent: !actuallyComplete && recipeState.contentLength > 0
                    }
                });
            }
            
            // Return cached content if no update needed
            const finalCache = recipeCache.get(cacheKey);
            return {
                content: finalCache?.content || contentToRelease,
                newIndex: i,
                metadata: finalCache?.metadata || {
                    isComplete: actuallyComplete,
                    hasTitle: recipeState.hasTitle,
                    hasIngredients: recipeState.hasIngredients,
                    hasInstructions: recipeState.hasInstructions,
                    hasPartialContent: !actuallyComplete && recipeState.contentLength > 0
                }
            };
        }

        return {
            content: fullContent,
            newIndex: i,
        };
    };

    // Function to detect if JSON content is a quiz
    const isQuizJson = (jsonContent: string): { isQuiz: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with quiz_title
        const hasQuizFormat = trimmed.startsWith('{\n  "quiz_title"') || trimmed.startsWith('{"quiz_title"');
        
        if (!hasQuizFormat) {
            return { isQuiz: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with quiz structure
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                
                // Must have quiz_title and multiple_choice array
                const isValidQuiz = parsed && 
                    parsed.quiz_title && 
                    Array.isArray(parsed.multiple_choice) &&
                    parsed.multiple_choice.length > 0;
                
                return { isQuiz: isValidQuiz, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid quiz
                return { isQuiz: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isQuiz: true, isComplete: false };
    };

    // Function to detect if JSON content is a presentation
    const isPresentationJson = (jsonContent: string): { isPresentation: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for presentation
        // This prevents false positives and doesn't delay normal JSON display
        if (!trimmed.startsWith('{\n  "presentation"') && !trimmed.startsWith('{"presentation"')) {
            return { isPresentation: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with presentation object
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                const hasPresentation = parsed && parsed.presentation && 
                                       parsed.presentation.slides && 
                                       Array.isArray(parsed.presentation.slides);
                return { isPresentation: hasPresentation, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid presentation
                return { isPresentation: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isPresentation: true, isComplete: false };
    };

    // Function to detect if JSON content is a decision tree
    const isDecisionTreeJson = (jsonContent: string): { isDecisionTree: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for decision tree
        // This prevents false positives and doesn't delay normal JSON display
        if (!trimmed.startsWith('{\n  "decision_tree"') && !trimmed.startsWith('{"decision_tree"')) {
            return { isDecisionTree: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with decision_tree object
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                const hasDecisionTree = parsed && parsed.decision_tree && 
                                       parsed.decision_tree.title && 
                                       parsed.decision_tree.root;
                return { isDecisionTree: hasDecisionTree, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid decision tree
                return { isDecisionTree: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isDecisionTree: true, isComplete: false };
    };

    // Function to detect if JSON content is a comparison table
    const isComparisonTableJson = (jsonContent: string): { isComparisonTable: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for comparison table
        // This prevents false positives and doesn't delay normal JSON display
        if (!trimmed.startsWith('{\n  "comparison"') && !trimmed.startsWith('{"comparison"')) {
            return { isComparisonTable: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with comparison object
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                const hasComparison = parsed && parsed.comparison && 
                                     parsed.comparison.title && 
                                     Array.isArray(parsed.comparison.items) &&
                                     Array.isArray(parsed.comparison.criteria);
                return { isComparisonTable: hasComparison, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid comparison table
                return { isComparisonTable: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isComparisonTable: true, isComplete: false };
    };

    // Function to detect if JSON content is a diagram
    const isDiagramJson = (jsonContent: string): { isDiagram: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for diagram
        // This prevents false positives and doesn't delay normal JSON display
        if (!trimmed.startsWith('{\n  "diagram"') && !trimmed.startsWith('{"diagram"')) {
            return { isDiagram: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with diagram object
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                const hasDiagram = parsed && parsed.diagram && 
                                 parsed.diagram.title && 
                                 Array.isArray(parsed.diagram.nodes);
                return { isDiagram: hasDiagram, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid diagram
                return { isDiagram: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isDiagram: true, isComplete: false };
    };

    // Function to detect if JSON content is a math problem
    const isMathProblemJson = (jsonContent: string): { isMathProblem: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for math_problem
        if (!trimmed.startsWith('{\n  "math_problem"') && !trimmed.startsWith('{"math_problem"')) {
            return { isMathProblem: false, isComplete: false };
        }
        
        // Check for obvious placeholder text that indicates malformed JSON
        // Common patterns: "array of s...", "[description]", etc.
        const hasPlaceholderText = /\[(array|object|string|number|description|example|etc)[^\]]*\]/i.test(trimmed) ||
                                   /:\s*array of/i.test(trimmed) ||
                                   /:\s*object with/i.test(trimmed);
        
        if (hasPlaceholderText) {
            // This is not valid JSON - it's a template or example with placeholders
            return { isMathProblem: false, isComplete: false };
        }
        
        // More resilient completion check - look for closing braces that suggest completion
        // Count opening and closing braces to determine if JSON might be complete
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        
        // If we have more open than close braces, definitely streaming
        if (openBraces > closeBraces) {
            return { isMathProblem: true, isComplete: false };
        }
        
        // If we have more close than open, something is wrong - treat as complete to stop loading
        if (closeBraces > openBraces) {
            console.warn('[Math Problem Detection] Mismatched braces - treating as complete');
            return { isMathProblem: true, isComplete: true };
        }
        
        // If braces are balanced and ends with }, likely complete
        const isLikelyComplete = trimmed.endsWith("}") && openBraces === closeBraces;
        
        // Only validate if we're confident it's complete
        if (isLikelyComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                // More lenient validation - just check for math_problem key and basic structure
                const hasMathProblem = parsed && parsed.math_problem && typeof parsed.math_problem === 'object';
                
                if (hasMathProblem) {
                    // Validate minimum required fields
                    const problem = parsed.math_problem;
                    const hasMinimumFields = problem.title && problem.problem_statement;
                    
                    if (!hasMinimumFields) {
                        console.warn('[Math Problem Detection] Missing required fields, but JSON is valid - treating as complete');
                    }
                    
                    return { isMathProblem: true, isComplete: true };
                } else {
                    // Has math_problem structure but invalid - treat as complete to avoid infinite loading
                    console.warn('[Math Problem Detection] Invalid math_problem structure - treating as complete');
                    return { isMathProblem: true, isComplete: true };
                }
            } catch (error) {
                // Parse failed - if braces are balanced, treat as complete to stop infinite loading
                console.warn('[Math Problem Detection] JSON parse failed with balanced braces - treating as complete', error);
                return { isMathProblem: true, isComplete: true };
            }
        }
        
        // Not complete but has the correct structure start - keep streaming
        return { isMathProblem: true, isComplete: false };
    };

    // Function to remove MATRX_PATTERN matches from a string
    const removeMatrxPattern = (text: string): string => {
        return text.replace(MATRX_PATTERN, "").trim() === "" ? "" : text.replace(MATRX_PATTERN, "");
    };

    // Process content sequentially
    MATRX_PATTERN.lastIndex = 0;
    const lines = mdContent.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const lineStartIndex = currentIndex;
        currentIndex += line.length + (i < lines.length - 1 ? 1 : 0); // Account for newline

        // Check for MATRX pattern at the current position
        MATRX_PATTERN.lastIndex = lineStartIndex;
        const match = MATRX_PATTERN.exec(mdContent);
        if (match && match.index < currentIndex) {
            const fullMatch = match[0];
            const startIndex = match.index;
            const endIndex = startIndex + fullMatch.length;

            // Add text before the pattern, if any
            if (startIndex > lineStartIndex) {
                const beforeText = mdContent.slice(lineStartIndex, startIndex);
                currentText += removeMatrxPattern(beforeText);
            }

            // Process the MATRX pattern
            try {
                const metadata: MatrxMetadata[] = getMetadataFromText(fullMatch);
                if (metadata.length > 0) {
                    if (currentText.trim()) {
                        blocks.push({ type: "text", content: currentText.trimEnd() });
                        currentText = "";
                    }
                    blocks.push({
                        type: "matrxBroker",
                        content: fullMatch,
                        metadata: metadata[0],
                    });
                } else {
                    currentText += fullMatch; // Fallback to text if metadata extraction fails
                }
            } catch (error) {
                currentText += fullMatch; // Fallback to text if an error occurs
            }

            // Update currentIndex to skip the pattern
            currentIndex = endIndex;
            MATRX_PATTERN.lastIndex = endIndex;

            // Move i to the line containing endIndex
            let charsCounted = 0;
            i = 0;
            while (i < lines.length) {
                charsCounted += lines[i].length + (i < lines.length - 1 ? 1 : 0);
                if (charsCounted > endIndex) {
                    // Adjust currentText to include the rest of the current line, removing MATRX patterns
                    const lineOffset = charsCounted - lines[i].length - (i < lines.length - 1 ? 1 : 0);
                    const remainingLine = mdContent.slice(endIndex, lineOffset + lines[i].length);
                    currentText += removeMatrxPattern(remainingLine);
                    break;
                }
                i++;
            }
            continue;
        }

        // Apply MATRX_PATTERN removal for all other processors
        const processedLine = removeMatrxPattern(line);
        const processedTrimmedLine = processedLine.trim();

        // Skip empty lines after MATRX_PATTERN removal
        if (processedTrimmedLine === "" && processedLine !== "") {
            i++;
            continue;
        }

        // Handle ```markdown opening marker
        // if (processedTrimmedLine === "```markdown") {
        //     insideMarkdownBlock = true;
        //     i++;
        //     continue;
        // }

        // Handle closing ``` when inside a markdown block
        if (processedTrimmedLine === "```" && insideMarkdownBlock) {
            insideMarkdownBlock = false;
            i++;
            continue;
        }

        // Process code, transcript, and tasks blocks if not inside markdown block
        if (processedTrimmedLine.startsWith("```") && !insideMarkdownBlock) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const languageMatch = processedTrimmedLine.match(/^```(\w*)/);
            const languageOrType = languageMatch && languageMatch[1] ? languageMatch[1] : undefined;
            const blockContent: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                blockContent.push(lines[i]); // Keep original lines for code content
                i++;
            }
            const contentString = blockContent.join("\n");

            if (languageOrType === "transcript") {
                blocks.push({
                    type: "transcript",
                    content: contentString,
                });
            } else if (languageOrType === "tasks") {
                blocks.push({
                    type: "tasks",
                    content: contentString,
                });
            } else if (languageOrType === "structured_info") {
                blocks.push({
                    type: "structured_info",
                    content: contentString,
                });
            } else if (languageOrType === "questionnaire") {
                blocks.push({
                    type: "questionnaire",
                    content: contentString,
                });
            } else if (languageOrType === "flashcards") {
                blocks.push({
                    type: "flashcards",
                    content: contentString,
                });
            } else if (languageOrType === "cooking_recipe") {
                blocks.push({
                    type: "cooking_recipe",
                    content: contentString,
                });
            } else if (languageOrType === "json") {
                // Check if this JSON is a quiz
                const quizCheck = isQuizJson(contentString);
                if (quizCheck.isQuiz) {
                    blocks.push({
                        type: "quiz",
                        content: contentString,
                        language: "json",
                        metadata: {
                            isComplete: quizCheck.isComplete
                        }
                    });
                } else {
                    // Check if this JSON is a presentation
                    const presentationCheck = isPresentationJson(contentString);
                    if (presentationCheck.isPresentation) {
                        blocks.push({
                            type: "presentation",
                            content: contentString,
                            language: "json",
                            metadata: {
                                isComplete: presentationCheck.isComplete
                            }
                        });
                    } else {
                        // Check if this JSON is a decision tree
                        const decisionTreeCheck = isDecisionTreeJson(contentString);
                        if (decisionTreeCheck.isDecisionTree) {
                            blocks.push({
                                type: "decision_tree",
                                content: contentString,
                                language: "json",
                                metadata: {
                                    isComplete: decisionTreeCheck.isComplete
                                }
                            });
                        } else {
                            // Check if this JSON is a comparison table
                            const comparisonTableCheck = isComparisonTableJson(contentString);
                            if (comparisonTableCheck.isComparisonTable) {
                                blocks.push({
                                    type: "comparison_table",
                                    content: contentString,
                                    language: "json",
                                    metadata: {
                                        isComplete: comparisonTableCheck.isComplete
                                    }
                                });
                            } else {
                                // Check if this JSON is a diagram
                                const diagramCheck = isDiagramJson(contentString);
                                if (diagramCheck.isDiagram) {
                                    blocks.push({
                                        type: "diagram",
                                        content: contentString,
                                        language: "json",
                                        metadata: {
                                            isComplete: diagramCheck.isComplete
                                        }
                                    });
                                } else {
                                    // Check if this JSON is a math problem
                                    const mathProblemCheck = isMathProblemJson(contentString);
                                    if (mathProblemCheck.isMathProblem) {
                                        blocks.push({
                                            type: "math_problem",
                                            content: contentString,
                                            language: "json",
                                            metadata: {
                                                isComplete: mathProblemCheck.isComplete
                                            }
                                        });
                                    } else {
                                        // Regular JSON code block
                                        blocks.push({
                                            type: "code",
                                            content: contentString,
                                            language: languageOrType,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                blocks.push({
                    type: "code",
                    content: contentString,
                    language: languageOrType,
                });
            }
            i++;
            continue;
        }

        // Detect image markdown syntax (e.g., <image-card alt="alt" src="url" ></image-card> or [Image URL: url])
        const imageMatch =
            trimmedLine.match(/^!$$ (.*?) $$$$ (https?:\/\/[^\s)]+) $$/) || // Standard Markdown
            trimmedLine.match(/$$ Image URL: (https?:\/\/[^\s $$]+)\]/); // Custom format

        if (imageMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }

            let src, alt;
            if (imageMatch[0].startsWith("![")) {
                [, alt, src] = imageMatch;
            } else {
                src = imageMatch[1];
                alt = "Image";
            }

            blocks.push({
                type: "image",
                content: trimmedLine,
                src,
                alt: alt || "Image",
            });
            i++;
            continue;
        }

        // Detect special tags (info, task, database, private, plan, event, tool, questionnaire)
        const specialTagMatch = specialTags.find((tag) => processedTrimmedLine === `<${tag}>`);
        if (specialTagMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const { content, newIndex, metadata } = handleSpecialTags(specialTagMatch, i + 1, lines);
            blocks.push({
                type: specialTagMatch,
                content,
                metadata,
            });
            i = newIndex;
            continue;
        }

        // Detect thinking blocks (<thinking> or <think>)
        if (processedTrimmedLine === "<thinking>" || processedTrimmedLine === "<think>") {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const thinkingContent: string[] = [];
            i++;
            let foundMarker = false;
            let foundClosingTag = false;

            while (i < lines.length) {
                const currentTrimmedLine = removeMatrxPattern(lines[i]).trim();
                if (currentTrimmedLine === "</thinking>" || currentTrimmedLine === "</think>") {
                    foundClosingTag = true;
                    break;
                }
                if (currentTrimmedLine.startsWith("### I have everything")) {
                    foundMarker = true;
                    thinkingContent.push(lines[i]);
                    i++;
                    break;
                }
                thinkingContent.push(lines[i]);
                i++;
            }

            blocks.push({
                type: "thinking",
                content: thinkingContent.join("\n"),
            });

            if (foundClosingTag) {
                i++; // Skip the closing tag
            } else if (foundMarker) {
                let hasSkippedEmptyLine = false;
                while (i < lines.length) {
                    const remainingLine = removeMatrxPattern(lines[i]).trim();
                    if (remainingLine === "</thinking>" || remainingLine === "</think>") {
                        i++;
                        break;
                    }
                    if (!hasSkippedEmptyLine && remainingLine === "") {
                        hasSkippedEmptyLine = true;
                        i++;
                        continue;
                    }
                    break;
                }
            }
            continue;
        }

        // Detect reasoning blocks (<reasoning>)
        if (processedTrimmedLine === "<reasoning>") {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const reasoningContent: string[] = [];
            i++;
            let foundClosingTag = false;

            while (i < lines.length) {
                const currentTrimmedLine = removeMatrxPattern(lines[i]).trim();
                if (currentTrimmedLine === "</reasoning>") {
                    foundClosingTag = true;
                    break;
                }
                reasoningContent.push(lines[i]);
                i++;
            }

            blocks.push({
                type: "reasoning",
                content: reasoningContent.join("\n"),
            });

            if (foundClosingTag) {
                i++; // Skip the closing tag
            }
            continue;
        }

        // Enhanced table detection with streaming buffer support
        if (looksLikeTableRow(line)) {
            // Potential table row detected
            if (!inPotentialTable) {
                // Starting a potential table, flush current text
                if (currentText.trim()) {
                    blocks.push({ type: "text", content: currentText.trimEnd() });
                    currentText = "";
                }
                inPotentialTable = true;
                potentialTableLines = [];
            }
            
            // Add to potential table buffer
            potentialTableLines.push(line);
            
            // Try to process the buffer (will return true if table confirmed or keep buffering)
            const processed = processPotentialTable();
            
            if (processed && potentialTableLines.length >= 2 && isTableSeparator(potentialTableLines[1])) {
                // Table confirmed and processed, continue collecting rows
                while (
                    i + 1 < lines.length &&
                    looksLikeTableRow(lines[i + 1])
                ) {
                    i++;
                    potentialTableLines.push(lines[i]);
                    processPotentialTable(); // Update table with new row
                }
                
                // Reset buffer
                inPotentialTable = false;
                potentialTableLines = [];
            }
            
            i++;
            continue;
        } else if (inPotentialTable) {
            // We were in a potential table but this line doesn't look like a table row
            // Process what we have in the buffer
            const processed = processPotentialTable();
            
            if (!processed) {
                // Buffer was flushed to text, continue with current line as text
                inPotentialTable = false;
                potentialTableLines = [];
                // Don't increment i, let this line be processed normally
            } else {
                // Table was processed, reset buffer and continue
                inPotentialTable = false;
                potentialTableLines = [];
                i++;
                continue;
            }
        }

        // Accumulate text content
        currentText += processedLine + (processedLine && i < lines.length - 1 ? "\n" : "");
        i++;
    }

    // Handle any remaining potential table buffer
    if (inPotentialTable && potentialTableLines.length > 0) {
        const processed = processPotentialTable();
        if (!processed) {
            // Buffer wasn't processed as table, add to text
            currentText += potentialTableLines.join("\n");
        }
    }

    if (currentText.trim()) {
        blocks.push({ type: "text", content: currentText.trimEnd() });
    }

    return blocks;
};
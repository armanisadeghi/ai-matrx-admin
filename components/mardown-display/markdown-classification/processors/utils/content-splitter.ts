import { getMetadataFromText, MATRX_PATTERN, MatrxMetadata } from "@/features/rich-text-editor/utils/patternUtils";

export interface ContentBlock {
    type: "text" | "code" | "table" | "thinking" | "reasoning" | "image" | "tasks" | "transcript" | "structured_info" | "matrxBroker" | "questionnaire" | "flashcards" | "quiz" | string;
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

// Cache for table content to prevent unnecessary updates during streaming
const tableCache = new Map<string, { content: string; hash: string; metadata: any }>();

interface TableState {
    isComplete: boolean;
    completeRows: string[];
    bufferRow: string;
    totalRows: number;
    completeRowCount: number;
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
    const specialTags = ["info", "task", "database", "private", "plan", "event", "tool", "questionnaire", "flashcards"];

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

        return {
            content: fullContent,
            newIndex: i,
        };
    };

    // Function to detect if JSON content is a quiz
    const isQuizJson = (jsonContent: string): { isQuiz: boolean; isComplete: boolean } => {
        const trimmed = jsonContent.trim();
        
        // Fast check: Must start with exact pattern for quiz
        // This prevents false positives and doesn't delay normal JSON display
        if (!trimmed.startsWith('{\n  "multiple_choice"') && !trimmed.startsWith('{"multiple_choice"')) {
            return { isQuiz: false, isComplete: false };
        }
        
        // Check if JSON is complete (has closing brace)
        const isComplete = trimmed.endsWith("}");
        
        // If complete, verify it's valid JSON with multiple_choice array
        if (isComplete) {
            try {
                const parsed = JSON.parse(trimmed);
                const hasMultipleChoice = parsed && Array.isArray(parsed.multiple_choice);
                return { isQuiz: hasMultipleChoice, isComplete: true };
            } catch (error) {
                // Parse failed, not a valid quiz
                return { isQuiz: false, isComplete: false };
            }
        }
        
        // Not complete but has the correct structure start - it's streaming
        return { isQuiz: true, isComplete: false };
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
        if (processedTrimmedLine === "```markdown") {
            insideMarkdownBlock = true;
            i++;
            continue;
        }

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
                    // Regular JSON code block
                    blocks.push({
                        type: "code",
                        content: contentString,
                        language: languageOrType,
                    });
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
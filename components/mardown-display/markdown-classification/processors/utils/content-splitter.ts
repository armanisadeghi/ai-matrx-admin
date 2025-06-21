import { getMetadataFromText, MATRX_PATTERN, MatrxMetadata } from "@/features/rich-text-editor/utils/patternUtils";

export interface ContentBlock {
    type: "text" | "code" | "table" | "thinking" | "image" | "tasks" | "transcript" | "structured_info" | "matrxBroker" | string;
    content: string;
    language?: string;
    src?: string;
    alt?: string;
    metadata?: any;
}

export const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentText = "";
    let insideMarkdownBlock = false;
    let currentIndex = 0;

    // List of special tags to handle
    const specialTags = ["info", "task", "database", "private", "plan", "event", "tool"];

    // Function to handle special tags
    const handleSpecialTags = (tag: string, startIndex: number, lines: string[]): { content: string; newIndex: number } => {
        const content: string[] = [];
        let i = startIndex;
        const closingTag = `</${tag}>`;

        while (i < lines.length) {
            const currentTrimmedLine = lines[i].trim();
            if (currentTrimmedLine === closingTag) {
                i++; // Skip the closing tag
                break;
            }
            content.push(lines[i]);
            i++;
        }

        return {
            content: content.join("\n"),
            newIndex: i,
        };
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

        // Detect special tags (info, task, database, private, plan, event, tool)
        const specialTagMatch = specialTags.find((tag) => processedTrimmedLine === `<${tag}>`);
        if (specialTagMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const { content, newIndex } = handleSpecialTags(specialTagMatch, i + 1, lines);
            blocks.push({
                type: specialTagMatch,
                content,
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

        // Table detection
        if (
            processedTrimmedLine.startsWith("|") &&
            processedTrimmedLine.endsWith("|") &&
            processedTrimmedLine.includes("|", 1) &&
            i + 1 < lines.length &&
            removeMatrxPattern(lines[i + 1]).trim().match(/^\|[-:\s|]+$/m)
        ) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const tableContent: string[] = [];
            tableContent.push(lines[i]);
            i++;
            tableContent.push(lines[i]);
            i++;
            while (
                i < lines.length &&
                removeMatrxPattern(lines[i]).trim().startsWith("|") &&
                removeMatrxPattern(lines[i]).trim().endsWith("|") &&
                removeMatrxPattern(lines[i]).trim().includes("|", 1)
            ) {
                tableContent.push(lines[i]);
                i++;
            }
            blocks.push({
                type: "table",
                content: tableContent.join("\n"),
            });
            continue;
        }

        // Accumulate text content
        currentText += processedLine + (processedLine && i < lines.length - 1 ? "\n" : "");
        i++;
    }

    if (currentText.trim()) {
        blocks.push({ type: "text", content: currentText.trimEnd() });
    }

    return blocks;
};
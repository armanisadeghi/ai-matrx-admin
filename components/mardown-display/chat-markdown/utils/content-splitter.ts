import { ContentBlock } from "../EnhancedChatMarkdown";

export const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentText = "";
    const lines = mdContent.split(/\r?\n/);
    let insideMarkdownBlock = false;

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

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Handle ```markdown opening marker
        if (trimmedLine === "```markdown") {
            insideMarkdownBlock = true;
            i++; // Skip the marker
            continue;
        }

        // Handle closing ``` when inside a markdown block
        if (trimmedLine === "```" && insideMarkdownBlock) {
            insideMarkdownBlock = false;
            i++; // Skip the marker
            continue;
        }

        // Process code, transcript, and tasks blocks if not inside markdown block
        if (trimmedLine.startsWith("```") && !insideMarkdownBlock) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const languageMatch = trimmedLine.match(/^```(\w*)/);
            const languageOrType = languageMatch && languageMatch[1] ? languageMatch[1] : undefined;
            const blockContent: string[] = [];
            i++; // Move past opening ```
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                blockContent.push(lines[i]);
                i++;
            }
            const contentString = blockContent.join("\n");

            // Determine block type based on languageOrType
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
            i++; // Move past closing ```
            continue;
        }

        // Detect image markdown syntax (e.g., ![alt](url))
        const imageMatch =
            trimmedLine.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/) || trimmedLine.match(/\[Image URL: (https?:\/\/[^\s\]]+)\]/);

        if (imageMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }

            let src, alt;

            if (imageMatch[0].startsWith("![")) {
                // Standard markdown format: ![alt](url)
                [, alt, src] = imageMatch;
            } else {
                // [Image URL: url] format
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
        const specialTagMatch = specialTags.find((tag) => trimmedLine === `<${tag}>`);
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
        if (trimmedLine === "<thinking>" || trimmedLine === "<think>") {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const thinkingContent: string[] = [];
            i++;
            let foundMarker = false;
            let foundClosingTag = false;

            while (i < lines.length) {
                const currentTrimmedLine = lines[i].trim();
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
                    const remainingLine = lines[i].trim();
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
            trimmedLine.startsWith("|") &&
            trimmedLine.endsWith("|") &&
            trimmedLine.includes("|", 1) &&
            i + 1 < lines.length &&
            lines[i + 1].trim().match(/^\|[-:\s|]+$/m)
        ) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const tableContent: string[] = [];
            tableContent.push(lines[i]); // Header row
            i++;
            tableContent.push(lines[i]); // Separator row
            i++;
            while (
                i < lines.length &&
                lines[i].trim().startsWith("|") &&
                lines[i].trim().endsWith("|") &&
                lines[i].trim().includes("|", 1)
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
        currentText += line + "\n";
        i++;
    }

    if (currentText.trim()) {
        blocks.push({ type: "text", content: currentText.trimEnd() });
    }

    return blocks;
};

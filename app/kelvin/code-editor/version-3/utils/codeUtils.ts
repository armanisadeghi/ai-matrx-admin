import * as monaco from "monaco-editor";

export interface IParentStructure {
    type: "htmlTag" | "function" | "class" | "object" | "other" | "unknown";
    name: string;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    innerContent: string;
    language?: string;
}

export const findParentStructure = (
    editor: monaco.editor.IStandaloneCodeEditor,
    position: monaco.Position,
): IParentStructure | null => {
    const model = editor.getModel();
    if (!model) return null;

    const lineNumber = position.lineNumber;
    const language = model.getLanguageId();

    // HTML-specific detection
    if (language === "html") {
        return findHtmlTagStructure(model, lineNumber);
    }

    // General code structure detection
    return findCodeStructure(model, lineNumber, language);
};

export const findHtmlTagStructure = (model: monaco.editor.ITextModel, lineNumber: number): IParentStructure | null => {
    let currentLine = lineNumber;
    let openTag = null;
    let closeTag = null;

    const extractTagName = (line: string): string | null => {
        const match = line.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/);
        return match ? match[1] : null;
    };

    // Find opening tag
    while (currentLine > 0) {
        const line = model.getLineContent(currentLine);
        if (line.includes("<") && !line.trim().startsWith("</")) {
            const tagName = extractTagName(line);
            if (tagName) {
                openTag = {
                    name: tagName,
                    line: currentLine,
                    column: line.indexOf("<") + 1,
                };
                break;
            }
        }
        currentLine--;
    }

    // Find closing tag
    currentLine = lineNumber;
    while (currentLine <= model.getLineCount()) {
        const line = model.getLineContent(currentLine);
        if (line.includes("</")) {
            const tagName = extractTagName(line);
            if (tagName && openTag && tagName === openTag.name) {
                closeTag = {
                    line: currentLine,
                    column: line.indexOf("</") + 2 + tagName.length,
                };
                break;
            }
        }
        currentLine++;
    }

    if (openTag && closeTag) {
        let innerContent = "";
        for (let i = openTag.line + 1; i < closeTag.line; i++) {
            innerContent += model.getLineContent(i) + "\n";
        }

        return {
            type: "htmlTag",
            name: openTag.name,
            startLine: openTag.line,
            endLine: closeTag.line,
            startColumn: openTag.column,
            endColumn: closeTag.column,
            innerContent: innerContent.trim(),
            language: "html",
        };
    }

    return null;
};

export const findCodeStructure = (
    model: monaco.editor.ITextModel,
    lineNumber: number,
    language: string,
): IParentStructure | null => {
    let currentLine = lineNumber;
    let structureStart = -1;
    let structureEnd = -1;
    let indentationLevel = -1;
    let structureType: IParentStructure["type"] = "other";
    let structureName = "";

    // Find the structure's start
    while (currentLine > 0) {
        const line = model.getLineContent(currentLine).trim();
        const lineIndentation = model.getLineFirstNonWhitespaceColumn(currentLine) - 1;

        // Language-specific structure detection
        if (language === "javascript" || language === "typescript") {
            if (
                line.match(
                    /^(function\s+(\w+))|(class\s+(\w+))|(const\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\)\s*=>|\{))|(let\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\)\s*=>|\{))|(var\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\)\s*=>|\{))/,
                )
            ) {
                if (indentationLevel === -1 || lineIndentation < indentationLevel) {
                    structureStart = currentLine;
                    indentationLevel = lineIndentation;

                    // Determine structure type and name
                    if (line.startsWith("function")) {
                        structureType = "function";
                        structureName = line.match(/function\s+(\w+)/)?.[1] || "";
                    } else if (line.startsWith("class")) {
                        structureType = "class";
                        structureName = line.match(/class\s+(\w+)/)?.[1] || "";
                    } else if (line.includes("=>")) {
                        structureType = "function";
                        structureName = line.match(/(const|let|var)\s+(\w+)/)?.[2] || "";
                    } else {
                        structureType = "object";
                        structureName = line.match(/(const|let|var)\s+(\w+)/)?.[2] || "";
                    }

                    break;
                }
            }
        }
        // Add more language-specific detection here

        currentLine--;
    }

    // If no structure found, return null
    if (structureStart === -1) return null;

    // Find the structure's end
    let bracketCount = 1;
    currentLine = structureStart;
    while (currentLine <= model.getLineCount()) {
        const line = model.getLineContent(currentLine);
        bracketCount += (line.match(/\{/g) || []).length;
        bracketCount -= (line.match(/\}/g) || []).length;

        if (bracketCount === 0) {
            structureEnd = currentLine;
            break;
        }
        currentLine++;
    }

    // Extract the structure's content
    if (structureStart > 0 && structureEnd > 0) {
        let innerContent = "";
        for (let i = structureStart + 1; i < structureEnd; i++) {
            innerContent += model.getLineContent(i) + "\n";
        }

        return {
            type: structureType,
            name: structureName,
            startLine: structureStart,
            endLine: structureEnd,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(structureEnd),
            innerContent: innerContent.trim(),
            language,
        };
    }

    return null;
};

export const getPlaceholderText = (structure: IParentStructure): string => {
    switch (structure?.type) {
        case "htmlTag":
            return `What should go inside this ${structure.name} tag?`;
        case "function":
            return "What should this function do?";
        case "class":
            return "What properties or methods should this class have?";
        case "object":
            return "What properties should this object have?";
        default:
            return "What content should be generated here?";
    }
};

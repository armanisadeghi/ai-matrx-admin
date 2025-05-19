export type MarkdownConfig = {
    type: string;
    sections: {
        key: string;
        match: {
            type: string;
            depth?: number;
            containsStrong?: boolean;
            text?: string;
            textIncludes?: string;
            textStarts?: string;
            regex?: string;
            follows?: {
                type: string;
                depth?: number;
                textStarts?: string;
                regex?: string;
            };
        };
        extraction: {
            type: "text" | "list" | "nested" | "next_node" | "lines";
            target?: string;
            matchNext?: {
                type: string;
                depth?: number;
                text?: string;
                textIncludes?: string;
                textStarts?: string;
                containsStrong?: boolean;
                regex?: string;
            };
            structure?: {
                [key: string]: {
                    match: {
                        type: string;
                        depth?: number;
                        text?: string;
                        textIncludes?: string;
                        textStarts?: string;
                        regex?: string;
                        containsStrong?: boolean;
                        follows?: {
                            type: string;
                            depth?: number;
                            textStarts?: string;
                            regex?: string;
                        };
                    };
                    extract: {
                        key: string;
                        type: "text" | "list" | "lines";
                        target?: string;
                        matchNext?: {
                            type: string;
                            depth?: number;
                            text?: string;
                            textIncludes?: string;
                            textStarts?: string;
                            containsStrong?: boolean;
                            regex?: string;
                        };
                    }[];
                };
            };
            stopConditions?: {
                type: string;
                depth?: number;
                textIncludes?: string;
                containsStrong?: boolean;
                textStarts?: string;
                regex?: string;
            }[];
        };
    }[];
    fallback: {
        appendTo: string;
    };
};

// Add a type for structure entry
type StructureEntry = {
    match: {
        type: string;
        depth?: number;
        text?: string;
        textIncludes?: string;
        textStarts?: string;
        regex?: string;
        containsStrong?: boolean;
        follows?: {
            type: string;
            depth?: number;
            textStarts?: string;
            regex?: string;
        };
    };
    extract: {
        key: string;
        type: "text" | "list" | "lines";
        target?: string;
        matchNext?: {
            type: string;
            depth?: number;
            text?: string;
            textIncludes?: string;
            textStarts?: string;
            containsStrong?: boolean;
            regex?: string;
        };
    }[];
};

// Create a consistent type for match criteria
type NodeMatchCriteria = {
    type?: string;
    depth?: number;
    text?: string;
    textIncludes?: string;
    textStarts?: string;
    regex?: string;
    containsStrong?: boolean;
};

export interface MarkdownProcessor {
    ast: any;
    config: MarkdownConfig;
}

export interface MarkdownProcessorResult {
    extracted: Record<string, any>;
    miscellaneous: string[];
}

function extractTextFromNode(node: any): string {
    if (!node) return "";
    if (node.type === "text") return node.value || "";
    if (node.type === "strong") {
        return node.children.map(extractTextFromNode).join("");
    }
    if (node.children) {
        return node.children.map(extractTextFromNode).join("");
    }
    return "";
}

function nodeMatches(node: any, criteria: NodeMatchCriteria | undefined): boolean {
    if (!node || !criteria) return false;
    if (criteria.type && node.type !== criteria.type) return false;
    if (criteria.depth && node.depth !== criteria.depth) return false;
    const nodeText = extractTextFromNode(node);
    if (criteria.text && nodeText !== criteria.text) return false;
    if (criteria.textIncludes && !nodeText?.includes(criteria.textIncludes)) return false;
    if (criteria.textStarts && !nodeText?.startsWith(criteria.textStarts)) return false;
    if (criteria.containsStrong) {
        if (!node.children?.some((child: any) => child.type === "strong")) return false;
    }
    if (criteria.regex) {
        return new RegExp(criteria.regex).test(nodeText);
    }
    return true;
}

function extractData(node: any, ast: any, index: number, extraction: any, processed: Set<number>): any {
    switch (extraction.type) {
        case "text":
            let text = extractTextFromNode(node).trim();
            if (extraction.target === "strong") {
                const strongNode = node.children.find((child: any) => child.type === "strong");
                return strongNode ? extractTextFromNode(strongNode).trim() : "";
            } else if (extraction.target === "substringAfterColon") {
                const parts = text.split(":", 2);
                return parts.length > 1 ? parts[1].trim() : text;
            } else if (extraction.target === "firstLine") {
                return text.split("\n")[0].trim();
            } else if (extraction.target === "afterFirstLine") {
                const lines = text.split("\n");
                return lines.slice(1).map((line) => line.trim()).filter((line) => line.length > 0);
            }
            return text;

        case "list":
            const nextIndex = extraction.matchNext ? index + 1 : index;
            const targetNode = ast.children[nextIndex];
            if (targetNode && nodeMatches(targetNode, extraction.matchNext || { type: targetNode.type })) {
                processed.add(nextIndex);
                return targetNode.children
                    .map((item: any) => extractTextFromNode(item).trim())
                    .filter((text: string) => text.length > 0);
            }
            return [];

        case "next_node":
            const nextNode = ast.children[index + 1];
            if (nextNode && nodeMatches(nextNode, extraction.matchNext || { type: nextNode.type })) {
                processed.add(index + 1);
                return extractTextFromNode(nextNode).trim();
            }
            return "";

        case "lines":
            const linesText = extractTextFromNode(node).trim();
            const lines = linesText
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            if (extraction.target === "afterFirstLine") {
                return lines.slice(1);
            }
            return lines;

        case "nested":
            const results = [];

            let currentIndex = index + 1; // Start with the next node after the match
            while (currentIndex < ast.children.length) {
                const currNode = ast.children[currentIndex];
                
                // Check stop conditions
                if (extraction.stopConditions?.some((cond: any) => nodeMatches(currNode, cond))) {
                    console.log("Stop condition met, breaking out of nested extraction");
                    break;
                }
                
                // Check each structure definition
                let foundMatch = false;
                for (const [structKey, struct] of Object.entries(extraction.structure || {}) as [string, StructureEntry][]) {
                    // Check if this node matches the structure's match criteria
                    const matchesDirectly = nodeMatches(currNode, struct.match);
                    
                    // Check follows condition if present
                    let matchesFollows = true;
                    if (struct.match.follows) {
                        const prevNode = ast.children[currentIndex - 1];
                        matchesFollows = prevNode && nodeMatches(prevNode, struct.match.follows);
                    }
                    
                    if (matchesDirectly && matchesFollows) {
                        foundMatch = true;
                        
                        // Handle different node types
                        if (currNode.type === "list" && struct.extract.some(ex => ex.matchNext?.type === "listItem")) {
                            // Special handling for list items (app suggestions case)
                            const item: Record<string, any> = {};
                            
                            // Process each list item
                            currNode.children.forEach((listItem: any) => {
                                struct.extract.forEach((ex: any) => {
                                    if (ex.matchNext?.type === "listItem") {
                                        const itemText = extractTextFromNode(listItem).trim();
                                        
                                        // Check if this list item matches all criteria
                                        let matches = true;
                                        
                                        if (ex.matchNext.containsStrong) {
                                            const hasStrong = listItem.children?.some((child: any) => 
                                                child.type === "strong" || 
                                                child.children?.some((c: any) => c.type === "strong"));
                                            matches = matches && hasStrong;
                                        }
                                        
                                        if (ex.matchNext.textIncludes) {
                                            matches = matches && itemText.includes(ex.matchNext.textIncludes);
                                        }
                                        
                                        if (!matches) return;
                                        
                                        // Extract the value
                                        let value = itemText;
                                        if (ex.target === "substringAfterColon") {
                                            const parts = itemText.split(":");
                                            if (parts.length > 1) {
                                                value = parts.slice(1).join(":").trim();
                                            }
                                        }
                                        
                                        item[ex.key] = value;
                                    }
                                });
                            });
                            
                            if (Object.keys(item).length > 0) {
                                results.push(item);
                            }
                        } else {
                            // General node handling (for other config types)
                            const item: Record<string, any> = {};
                            
                            // Process extraction rules
                            for (const ex of struct.extract) {
                                if (ex.type === "text") {
                                    // Extract text directly from this node
                                    let text: string | string[] = extractTextFromNode(currNode).trim();
                                    
                                    if (ex.target === "substringAfterColon") {
                                        const parts = text.split(":");
                                        text = parts.length > 1 ? parts.slice(1).join(":").trim() : text;
                                    } else if (ex.target === "firstLine") {
                                        text = text.split("\n")[0].trim();
                                    } else if (ex.target === "afterFirstLine") {
                                        const lines = text.split("\n");
                                        text = lines.slice(1).map(l => l.trim()).filter(l => l.length > 0);
                                    }
                                    
                                    item[ex.key] = text;
                                } else if (ex.type === "list" && ex.matchNext) {
                                    // Look for a list in the next node
                                    const nextIdx = currentIndex + 1;
                                    const nextNode = ast.children[nextIdx];
                                    
                                    if (nextNode && nodeMatches(nextNode, ex.matchNext)) {
                                        const listItems = nextNode.children.map((item: any) => 
                                            extractTextFromNode(item).trim())
                                            .filter((text: string) => text.length > 0);
                                        
                                        item[ex.key] = listItems;
                                        processed.add(nextIdx);
                                    }
                                } else if (ex.type === "lines" && ex.matchNext) {
                                    // Extract lines from the next node
                                    const nextIdx = currentIndex + 1;
                                    const nextNode = ast.children[nextIdx];
                                    
                                    if (nextNode && nodeMatches(nextNode, ex.matchNext)) {
                                        const text = extractTextFromNode(nextNode).trim();
                                        const lines = text.split("\n")
                                            .map((line: string) => line.trim())
                                            .filter((line: string) => line.length > 0);
                                        
                                        item[ex.key] = lines;
                                        processed.add(nextIdx);
                                    }
                                }
                            }
                            
                            if (Object.keys(item).length > 0) {
                                results.push(item);
                            }
                        }
                        
                        processed.add(currentIndex);
                        break;
                    }
                }
                
                currentIndex++;
            }
            
            return results;

        default:
            return null;
    }
}

export function processMarkdownWithConfig({ ast, config }: MarkdownProcessor): MarkdownProcessorResult {
    const result = {
        extracted: {} as Record<string, any>,
        miscellaneous: [] as string[],
    };

    const processed = new Set<number>();
    let lastSectionKey: string | null = config.fallback?.appendTo || null;

    // Pre-initialize suggestion arrays
    for (const section of config.sections) {
        if (section.extraction.type === "nested") {
            result.extracted[section.key] = [];
        }
    }

    // First pass: Process nodes that match section criteria
    ast.children.forEach((node: any, index: number) => {
        if (node.type === "thematicBreak" || processed.has(index)) {
            return;
        }

        let matched = false;

        for (const section of config.sections) {
            if (nodeMatches(node, section.match)) {
                let contextValid = true;
                if (section.match.follows) {
                    const prevNode = ast.children[index - 1];
                    if (!prevNode || !nodeMatches(prevNode, section.match.follows)) {
                        contextValid = false;
                    }
                }

                if (contextValid) {
                    try {
                        const extractedData = extractData(node, ast, index, section.extraction, processed);
                        
                        // Handle nested extraction results specifically for suggestions
                        if (section.extraction.type === "nested") {
                            if (Array.isArray(extractedData) && extractedData.length > 0) {
                                // If we already have data for this section, append
                                if (!result.extracted[section.key]) {
                                    result.extracted[section.key] = [];
                                }
                                
                                // Make sure the target is an array
                                if (!Array.isArray(result.extracted[section.key])) {
                                    result.extracted[section.key] = [result.extracted[section.key]];
                                }
                                
                                // Add all items from extracted data
                                extractedData.forEach((item: any) => {
                                    result.extracted[section.key].push(item);
                                });
                            }
                        } else {
                            // Handle normal extraction
                            result.extracted[section.key] = extractedData;
                        }
                        
                        lastSectionKey = section.key;
                        processed.add(index);
                        matched = true;
                        break;
                    } catch (error) {
                        console.error(`Error processing section ${section.key}:`, error);
                    }
                }
            }
        }

        // Handle unmatched nodes
        if (!matched) {
            const rawContent = extractTextFromNode(node).trim();
            if (rawContent !== "") {
                if (config.fallback && config.fallback.appendTo) {
                    // Initialize the fallback array if it doesn't exist
                    if (!result.extracted[config.fallback.appendTo]) {
                        result.extracted[config.fallback.appendTo] = [];
                    }
                    
                    // Ensure the fallback target is an array
                    if (!Array.isArray(result.extracted[config.fallback.appendTo])) {
                        result.extracted[config.fallback.appendTo] = [result.extracted[config.fallback.appendTo]];
                    }
                    
                    result.extracted[config.fallback.appendTo].push(rawContent);
                } else {
                    result.miscellaneous.push(rawContent);
                }
            }
            processed.add(index);
        }
    });

    return result;
}
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
            follows?: {
                type: string;
                depth?: number;
            };
        };
        extract: (node: any, ast: any, index: number, processed: Set<number>) => any;
    }[];
    fallback: {
        appendTo: string;
    };
};

// Helper function to recursively extract text from nodes, including strong nodes
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

export const candidateProfileConfig: MarkdownConfig = {
    type: "candidate_profile",
    sections: [
        {
            key: "name",
            match: {
                type: "heading",
                depth: 1,
                containsStrong: true,
            },
            extract: (node) => {
                const strongNode = node.children.find((child: any) => child.type === "strong");
                return strongNode ? extractTextFromNode(strongNode) : "";
            },
        },
        {
            key: "intro",
            match: {
                type: "paragraph",
                follows: { type: "heading", depth: 1 },
            },
            extract: (node) => extractTextFromNode(node),
        },
        {
            key: "key_experiences",
            match: {
                type: "heading",
                depth: 3,
                text: "Key Experience",
            },
            extract: (node, ast, index, processed) => {
                const experiences = [];
                let currentIndex = index + 1;
                let currentExperience = null;

                while (currentIndex < ast.children.length) {
                    const nextNode = ast.children[currentIndex];
                    if (
                        nextNode.type === "thematicBreak" ||
                        (nextNode.type === "heading" && nextNode.depth <= 3) ||
                        (nextNode.type === "paragraph" &&
                            nextNode.children.some((child: any) => child.type === "strong") &&
                            extractTextFromNode(nextNode).includes("Additional Accomplishments"))
                    ) {
                        break;
                    }

                    if (nextNode.type === "paragraph" && nextNode.children.some((child: any) => child.type === "strong")) {
                        if (currentExperience) {
                            experiences.push(currentExperience);
                        }
                        currentExperience = {
                            company: extractTextFromNode(nextNode),
                            details: [],
                        };
                        processed.add(currentIndex);
                    } else if (nextNode.type === "list" && currentExperience && !processed.has(currentIndex)) {
                        const details = nextNode.children
                            .map((item: any) => extractTextFromNode(item))
                            .filter((text: string) => text.trim() !== "");
                        currentExperience.details.push(...details);
                        processed.add(currentIndex);
                    }
                    currentIndex++;
                }

                if (currentExperience) {
                    experiences.push(currentExperience);
                }
                return experiences;
            },
        },
        {
            key: "additional_accomplishments",
            match: {
                type: "paragraph",
                containsStrong: true,
                textIncludes: "Additional Accomplishments",
            },
            extract: (node, ast, index, processed) => {
                const accomplishments = [];
                const nextNode = ast.children[index + 1];
                if (nextNode?.type === "list" && !processed.has(index + 1)) {
                    accomplishments.push(
                        ...nextNode.children
                            .map((item: any) => extractTextFromNode(item))
                            .filter((text: string) => text.trim() !== "")
                    );
                    processed.add(index + 1);
                }
                return accomplishments;
            },
        },
        {
            key: "location",
            match: {
                type: "heading",
                depth: 3,
                text: "Location",
            },
            extract: (node, ast, index, processed) => {
                const locations = [];
                const nextNode = ast.children[index + 1];
                if (nextNode?.type === "list" && !processed.has(index + 1)) {
                    locations.push(
                        ...nextNode.children
                            .map((item: any) => extractTextFromNode(item))
                            .filter((text: string) => text.trim() !== "")
                    );
                    processed.add(index + 1);
                }
                return locations;
            },
        },
        {
            key: "compensation",
            match: {
                type: "heading",
                depth: 3,
                text: "Compensation Expectation",
            },
            extract: (node, ast, index, processed) => {
                const compensation = [];
                const nextNode = ast.children[index + 1];
                if (nextNode?.type === "list" && !processed.has(index + 1)) {
                    compensation.push(
                        ...nextNode.children
                            .map((item: any) => extractTextFromNode(item))
                            .filter((text: string) => text.trim() !== "")
                    );
                    processed.add(index + 1);
                }
                return compensation;
            },
        },
        {
            key: "availability",
            match: {
                type: "heading",
                depth: 3,
                text: "Availability for Interview",
            },
            extract: (node, ast, index, processed) => {
                const availability = [];
                const nextNode = ast.children[index + 1];
                if (nextNode?.type === "list" && !processed.has(index + 1)) {
                    availability.push(
                        ...nextNode.children
                            .map((item: any) => extractTextFromNode(item))
                            .filter((text: string) => text.trim() !== "")
                    );
                    processed.add(index + 1);
                }
                return availability;
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};


export const candidateProfileStructured: MarkdownConfig = {
    type: "candidate_profile",
    sections: [
        // Name section
        {
            key: "name",
            match: {
                type: "heading",
                depth: 3,
                text: "Name",
            },
            extract: (node, ast, index, processed) => {
                // The name is the next paragraph or text node after the heading
                const nextNode = ast.children[index + 1];
                if (nextNode && (nextNode.type === "paragraph" || nextNode.type === "text")) {
                    processed.add(index + 1);
                    return extractTextFromNode(nextNode).trim();
                }
                return "";
            },
        },
        // Intro/Summary section
        {
            key: "intro",
            match: {
                type: "heading",
                depth: 3,
                text: "Summary",
            },
            extract: (node, ast, index, processed) => {
                const nextNode = ast.children[index + 1];
                if (nextNode && nextNode.type === "paragraph") {
                    processed.add(index + 1);
                    return extractTextFromNode(nextNode).trim();
                }
                return "";
            },
        },
        // Key Experiences section (array of experiences)
        {
            key: "key_experiences",
            match: {
                type: "heading",
                depth: 2,
                text: "Key Experience",
            },
            extract: (node, ast, index, processed) => {
                const experiences = [];
                let i = index + 1;
                while (i < ast.children.length) {
                    const curr = ast.children[i];
                    // Stop at next major section
                    if (
                        curr.type === "thematicBreak" ||
                        (curr.type === "heading" && curr.depth <= 2)
                    ) {
                        break;
                    }
                    // Look for company heading (depth 3)
                    if (curr.type === "heading" && curr.depth === 3) {
                        const companyName = extractTextFromNode(curr).trim();
                        let companyLocation = "";
                        let accomplishments: string[] = [];
                        let j = i + 1;
                        // Gather location and accomplishments
                        while (j < ast.children.length) {
                            const next = ast.children[j];
                            if (
                                next.type === "heading" ||
                                next.type === "thematicBreak" ||
                                (next.type === "heading" && next.depth <= 3)
                            ) {
                                break;
                            }
                            // If it's a paragraph and looks like a location, grab it
                            if (
                                next.type === "paragraph" &&
                                /[A-Za-z]+,\s*[A-Z]{2}/.test(extractTextFromNode(next))
                            ) {
                                companyLocation = extractTextFromNode(next).trim();
                                processed.add(j);
                            }
                            // If it's a list, treat as accomplishments
                            if (next.type === "list") {
                                accomplishments = next.children
                                    .map((item: any) => extractTextFromNode(item).trim())
                                    .filter((t: string) => t.length > 0);
                                processed.add(j);
                            }
                            // Sometimes accomplishments are just paragraphs
                            if (next.type === "paragraph" && !companyLocation) {
                                // If not a location, treat as accomplishment
                                const text = extractTextFromNode(next).trim();
                                if (text.length > 0) {
                                    accomplishments.push(text);
                                    processed.add(j);
                                }
                            }
                            j++;
                        }
                        experiences.push({
                            company: companyName,
                            location: companyLocation,
                            accomplishments,
                        });
                        processed.add(i);
                        i = j - 1;
                    }
                    i++;
                }
                return experiences;
            },
        },
        // Additional Accomplishments (not present in this sample, but included for structure)
        {
            key: "additional_accomplishments",
            match: {
                type: "heading",
                depth: 3,
                textIncludes: "Additional Accomplishments",
            },
            extract: (node, ast, index, processed) => {
                const accomplishments: string[] = [];
                const nextNode = ast.children[index + 1];
                if (nextNode?.type === "list" && !processed.has(index + 1)) {
                    accomplishments.push(
                        ...nextNode.children
                            .map((item: any) => extractTextFromNode(item).trim())
                            .filter((text: string) => text.length > 0)
                    );
                    processed.add(index + 1);
                }
                return accomplishments;
            },
        },
        // Location section
        {
            key: "location",
            match: {
                type: "heading",
                depth: 2,
                text: "Location",
            },
            extract: (node, ast, index, processed) => {
                // Next node is a list or paragraphs with locations
                const locations: string[] = [];
                let i = index + 1;
                while (i < ast.children.length) {
                    const curr = ast.children[i];
                    if (
                        curr.type === "heading" ||
                        curr.type === "thematicBreak" ||
                        (curr.type === "heading" && curr.depth <= 2)
                    ) {
                        break;
                    }
                    if (curr.type === "list") {
                        locations.push(
                            ...curr.children
                                .map((item: any) => extractTextFromNode(item).trim())
                                .filter((text: string) => text.length > 0)
                        );
                        processed.add(i);
                    } else if (curr.type === "paragraph") {
                        const text = extractTextFromNode(curr).trim();
                        if (text.length > 0) {
                            locations.push(text);
                            processed.add(i);
                        }
                    }
                    i++;
                }
                return locations;
            },
        },
        // Compensation section
        {
            key: "compensation",
            match: {
                type: "heading",
                depth: 2,
                text: "Compensation Expectation",
            },
            extract: (node, ast, index, processed) => {
                const compensation: string[] = [];
                let i = index + 1;
                while (i < ast.children.length) {
                    const curr = ast.children[i];
                    if (
                        curr.type === "heading" ||
                        curr.type === "thematicBreak" ||
                        (curr.type === "heading" && curr.depth <= 2)
                    ) {
                        break;
                    }
                    if (curr.type === "list") {
                        compensation.push(
                            ...curr.children
                                .map((item: any) => extractTextFromNode(item).trim())
                                .filter((text: string) => text.length > 0)
                        );
                        processed.add(i);
                    } else if (curr.type === "paragraph") {
                        const text = extractTextFromNode(curr).trim();
                        if (text.length > 0) {
                            compensation.push(text);
                            processed.add(i);
                        }
                    }
                    i++;
                }
                return compensation;
            },
        },
        // Availability section
        {
            key: "availability",
            match: {
                type: "heading",
                depth: 2,
                text: "Availability for Interview",
            },
            extract: (node, ast, index, processed) => {
                const availability: string[] = [];
                let i = index + 1;
                while (i < ast.children.length) {
                    const curr = ast.children[i];
                    if (
                        curr.type === "heading" ||
                        curr.type === "thematicBreak" ||
                        (curr.type === "heading" && curr.depth <= 2)
                    ) {
                        break;
                    }
                    if (curr.type === "list") {
                        availability.push(
                            ...curr.children
                                .map((item: any) => extractTextFromNode(item).trim())
                                .filter((text: string) => text.length > 0)
                        );
                        processed.add(i);
                    } else if (curr.type === "paragraph") {
                        const text = extractTextFromNode(curr).trim();
                        if (text.length > 0) {
                            availability.push(text);
                            processed.add(i);
                        }
                    }
                    i++;
                }
                return availability;
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};


export interface MarkdownProcessor {
    ast: any;
    config: MarkdownConfig;
}

export interface MarkdownProcessorResult {
    extracted: Record<string, any>;
    miscellaneous: string[];
}

export function processMarkdownWithConfig({ ast, config }: MarkdownProcessor): MarkdownProcessorResult {
    const result = {
        extracted: {},
        miscellaneous: [],
    };

    function nodeMatches(node: any, criteria: any): boolean {
        if (criteria.type && node.type !== criteria.type) return false;
        if (criteria.depth && node.depth !== criteria.depth) return false;
        if (criteria.text) {
            const nodeText = extractTextFromNode(node);
            if (nodeText !== criteria.text) return false;
        }
        if (criteria.textIncludes) {
            const nodeText = extractTextFromNode(node);
            if (!nodeText?.includes(criteria.textIncludes)) return false;
        }
        if (criteria.containsStrong) {
            if (!node.children?.some((child: any) => child.type === "strong")) return false;
        }
        return true;
    }

    const processed = new Set<number>();
    let lastSectionKey: string | null = null;

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
                    result.extracted[section.key] = section.extract(node, ast, index, processed);
                    lastSectionKey = section.key;
                    processed.add(index);
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            const rawContent = extractTextFromNode(node);
            if (rawContent.trim() !== "") {
                if (lastSectionKey && result.extracted[lastSectionKey] && Array.isArray(result.extracted[lastSectionKey])) {
                    result.extracted[lastSectionKey].push(rawContent);
                } else {
                    result.miscellaneous.push(rawContent);
                }
            }
            processed.add(index);
        }
    });

    return result;
}

export const knownConfigOptions = {
    candidateProfile: {
        config: candidateProfileConfig,
        name: "Candidate Profile",
        type: "candidate_profile",
    },
    candidateProfileStructured: {
        config: candidateProfileStructured,
        name: "Candidate Profile Structured",
        type: "candidate_profile_structured",
    },
};
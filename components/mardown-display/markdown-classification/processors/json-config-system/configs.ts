import { MarkdownConfig } from "./config-processor";


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
            extraction: {
                type: "text",
                target: "strong",
            },
        },
        {
            key: "intro",
            match: {
                type: "paragraph",
                follows: { type: "heading", depth: 1 },
            },
            extraction: {
                type: "text",
            },
        },
        {
            key: "key_experiences",
            match: {
                type: "heading",
                depth: 3,
                text: "Key Experience",
            },
            extraction: {
                type: "nested",
                structure: {
                    experience: {
                        match: {
                            type: "paragraph",
                            containsStrong: true,
                        },
                        extract: [
                            { key: "company", type: "text" },
                            {
                                key: "details",
                                type: "list",
                                matchNext: { type: "list" },
                            },
                        ],
                    },
                },
                stopConditions: [
                    { type: "thematicBreak" },
                    { type: "heading", depth: 3 },
                    {
                        type: "paragraph",
                        containsStrong: true,
                        textIncludes: "Additional Accomplishments",
                    },
                ],
            },
        },
        {
            key: "additional_accomplishments",
            match: {
                type: "paragraph",
                containsStrong: true,
                textIncludes: "Additional Accomplishments",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
        {
            key: "location",
            match: {
                type: "heading",
                depth: 3,
                text: "Location",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
        {
            key: "compensation",
            match: {
                type: "heading",
                depth: 3,
                text: "Compensation Expectation",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
        {
            key: "availability",
            match: {
                type: "heading",
                depth: 3,
                text: "Availability for Interview",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};

export const candidateProfileStructuredConfig: MarkdownConfig = {
    type: "candidate_profile_structured",
    sections: [
        {
            key: "name",
            match: {
                type: "heading",
                depth: 3,
                text: "Name",
            },
            extraction: {
                type: "next_node",
                matchNext: { type: "paragraph" },
            },
        },
        {
            key: "intro",
            match: {
                type: "heading",
                depth: 3,
                text: "Summary",
            },
            extraction: {
                type: "next_node",
                matchNext: { type: "paragraph" },
            },
        },
        {
            key: "key_experiences",
            match: {
                type: "heading",
                depth: 2,
                text: "Key Experience",
            },
            extraction: {
                type: "nested",
                structure: {
                    experience: {
                        match: { type: "heading", depth: 3 },
                        extract: [
                            { key: "company", type: "text" },
                            {
                                key: "accomplishments",
                                type: "list",
                                matchNext: { type: "list" },
                            },
                        ],
                    },
                },
                stopConditions: [{ type: "thematicBreak" }, { type: "heading", depth: 2 }],
            },
        },
        {
            key: "location",
            match: {
                type: "heading",
                depth: 2,
                text: "Location",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
        {
            key: "compensation",
            match: {
                type: "heading",
                depth: 2,
                text: "Compensation Expectation",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
        {
            key: "availability",
            match: {
                type: "heading",
                depth: 2,
                text: "Availability for Interview",
            },
            extraction: {
                type: "list",
                matchNext: { type: "list" },
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};

export const candidateProfileTextConfig: MarkdownConfig = {
    type: "candidate_profile_text",
    sections: [
        {
            key: "name",
            match: {
                type: "paragraph",
                textStarts: "Candidate Profile:",
            },
            extraction: {
                type: "text",
                target: "substringAfterColon",
            },
        },
        {
            key: "intro",
            match: {
                type: "paragraph",
                follows: { type: "paragraph", textStarts: "Candidate Profile:" },
            },
            extraction: {
                type: "text",
            },
        },
        {
            key: "key_experiences",
            match: {
                type: "paragraph",
                textStarts: "Key Experience",
            },
            extraction: {
                type: "nested",
                structure: {
                    experience: {
                        match: {
                            type: "paragraph",
                        },
                        extract: [
                            {
                                key: "company",
                                type: "text",
                                target: "firstLine",
                            },
                            {
                                key: "details",
                                type: "lines",
                                target: "afterFirstLine",
                            },
                        ],
                    },
                },
                stopConditions: [
                    { type: "paragraph", textStarts: "Location:" },
                    { type: "paragraph", textStarts: "Compensation Expectation:" },
                    { type: "paragraph", textStarts: "Availability for Interview:" },
                ],
            },
        },
        {
            key: "location",
            match: {
                type: "paragraph",
                textStarts: "Location:",
            },
            extraction: {
                type: "lines",
                target: "afterFirstLine",
            },
        },
        {
            key: "compensation",
            match: {
                type: "paragraph",
                textStarts: "Compensation Expectation:",
            },
            extraction: {
                type: "lines",
                target: "afterFirstLine",
            },
        },
        {
            key: "availability",
            match: {
                type: "paragraph",
                textStarts: "Availability for Interview:",
            },
            extraction: {
                type: "lines",
                target: "afterFirstLine",
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};

export const appSuggestionsConfig: MarkdownConfig = {
    type: "app_suggestions",
    sections: [
        {
            key: "title",
            match: {
                type: "heading",
                depth: 1,
                text: "App Suggestions",
            },
            extraction: {
                type: "text",
            },
        },
        {
            key: "suggestions",
            match: {
                type: "heading",
                depth: 2,
                regex: "^[0-9]+\\. Suggestion$",
            },
            extraction: {
                type: "nested",
                structure: {
                    suggestion: {
                        match: {
                            type: "list",
                        },
                        extract: [
                            {
                                key: "app_name",
                                type: "text",
                                matchNext: {
                                    type: "listItem",
                                    containsStrong: true,
                                    textIncludes: "App Name:",
                                },
                                target: "substringAfterColon",
                            },
                            {
                                key: "app_description",
                                type: "text",
                                matchNext: {
                                    type: "listItem",
                                    containsStrong: true,
                                    textIncludes: "App Description:",
                                },
                                target: "substringAfterColon",
                            },
                            {
                                key: "image_description",
                                type: "text",
                                matchNext: {
                                    type: "listItem",
                                    containsStrong: true,
                                    textIncludes: "Image Description:",
                                },
                                target: "substringAfterColon",
                            },
                        ],
                    },
                },
                stopConditions: [{ type: "heading", depth: 2 }],
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};

export const googleSeoConfig: MarkdownConfig = {
    type: "seo_tips",
    sections: [
        {
            key: "title",
            match: { type: "paragraph" },
            extraction: { type: "text" },
        },
        {
            key: "tips",
            match: { type: "list" },
            extraction: {
                type: "nested",
                structure: {
                    tip: {
                        match: { type: "listItem" },
                        extract: [
                            { key: "title", type: "text", target: "strong" },
                            { key: "details", type: "text" },
                        ],
                    },
                },
            },
        },
        {
            key: "underlying_principle",
            match: {
                type: "paragraph",
                containsStrong: true,
            },
            extraction: {
                type: "text",
                target: "substringAfterColon",
            },
        },
    ],
    fallback: {
        appendTo: "miscellaneous",
    },
};

// export const jsonConfigSystemRegistry: Record<string, ConfigEntry> = {
//     candidateProfile: {
//         id: "candidateProfile",
//         name: "Candidate Profile",
//         type: "candidate_profile",
//         config: candidateProfileConfig,
//         description: "Standard configuration for parsing candidate profiles",
//     },
//     candidateProfileStructured: {
//         id: "candidateProfileStructured",
//         name: "Candidate Profile Structured",
//         type: "candidate_profile_structured",
//         config: candidateProfileStructuredConfig,
//         description: "Configuration for parsing structured candidate profiles",
//     },
//     candidateProfileText: {
//         id: "candidateProfileText",
//         name: "Candidate Profile Text",
//         type: "candidate_profile_text",
//         config: candidateProfileTextConfig,
//         description: "Configuration for parsing candidate profiles as text",
//     },
//     appSuggestions: {
//         id: "appSuggestions",
//         name: "App Suggestions",
//         type: "app_suggestions",
//         config: appSuggestionsConfig,
//         description: "Configuration for parsing app suggestions",
//     },
//     googleSeo: {
//         id: "googleSeo",
//         name: "Google SEO",
//         type: "google_seo",
//         config: googleSeoConfig,
//         description: "Configuration for parsing Google SEO tips",
//     },
// };

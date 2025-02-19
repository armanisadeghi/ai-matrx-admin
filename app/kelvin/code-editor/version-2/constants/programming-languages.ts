export const LANGUAGE_CATEGORIES = {
    FRONTEND: 'frontend',
    BACKEND: 'backend',
    // BOTH: 'both'
} as const;

export const PROGRAMMING_LANGUAGE_OPTIONS = [
    // Frontend Languages
    {
        language: "html",
        version: "5",
        aliases: ["html5"],
        runtime: "browser",
        category: LANGUAGE_CATEGORIES.FRONTEND
    },
    {
        language: "css",
        version: "3",
        aliases: ["css3"],
        runtime: "browser",
        category: LANGUAGE_CATEGORIES.FRONTEND
    },
    // Backend Languages
    {
        language: "javascript",
        version: "18.15.0",
        aliases: ["node-javascript", "node-js", "javascript", "js"],
        runtime: "node",
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "typescript",
        version: "5.0.3",
        aliases: ["ts", "node-ts", "tsc", "typescript5", "ts5"],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "php",
        version: "8.2.3",
        aliases: [],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "python",
        version: "3.10.0",
        aliases: ["py", "py3", "python3", "python3.10"],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "ruby",
        version: "3.0.1",
        aliases: ["ruby3", "rb"],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "rust",
        version: "1.68.2",
        aliases: ["rs"],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "csharp",
        version: "6.12.0",
        aliases: ["mono", "mono-csharp", "mono-c#", "mono-cs", "c#", "cs"],
        runtime: "mono",
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "c++",
        version: "10.2.0",
        aliases: ["cpp", "g++"],
        runtime: "gcc",
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "go",
        version: "1.16.2",
        aliases: ["go", "golang"],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "java",
        version: "15.0.2",
        aliases: [],
        category: LANGUAGE_CATEGORIES.BACKEND
    },
    {
        language: "c",
        version: "10.2.0",
        aliases: ["gcc"],
        runtime: "gcc",
        category: LANGUAGE_CATEGORIES.BACKEND
    }
];

// Helper function to check if a language is frontend
export const isFrontendLanguage = (language: string): boolean => {
    const langOption = PROGRAMMING_LANGUAGE_OPTIONS.find(lang => lang.language === language);
    return langOption?.category === LANGUAGE_CATEGORIES.FRONTEND
};
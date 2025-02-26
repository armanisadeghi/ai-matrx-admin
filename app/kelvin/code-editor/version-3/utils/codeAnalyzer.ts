import { indexedDBStore } from "./local-indexedDB";
import { IRepoData } from "../types";

interface AnalysisRule {
    name: string;
    test: (content: string) => boolean;
    message: string;
}

interface LanguageConfig {
    name: string;
    extensions: string[];
    rules: AnalysisRule[];
}

interface AnalysisIssue {
    rule: string;
    message: string;
}

interface FileAnalysisResult {
    path: string;
    language: string;
    issues: AnalysisIssue[];
}

class CodeAnalyzer {
    private languageConfigs: LanguageConfig[];

    constructor() {
        this.languageConfigs = [
            {
                name: "JavaScript",
                extensions: [".js", ".jsx", ".ts", ".tsx"],
                rules: [
                    {
                        name: "noConsoleLog",
                        test: (content) => content.includes("console.log"),
                        message: "Avoid using console.log in production code",
                    },
                    {
                        name: "noAlertStatement",
                        test: (content) => content.includes("alert("),
                        message: "Avoid using alert() in production code",
                    },
                    // Add more JavaScript-specific rules
                ],
            },
            {
                name: "HTML",
                extensions: [".html", ".htm"],
                rules: [
                    {
                        name: "noInlineStyles",
                        test: (content) => /<[^>]+style=/.test(content),
                        message: "Avoid using inline styles",
                    },
                    // Add more HTML-specific rules
                ],
            },
            {
                name: "CSS",
                extensions: [".css", ".scss", ".sass"],
                rules: [
                    {
                        name: "noImportant",
                        test: (content) => /!important/.test(content),
                        message: "Avoid using !important",
                    },
                    // Add more CSS-specific rules
                ],
            },
            {
                name: "Python",
                extensions: [".py"],
                rules: [
                    {
                        name: "noGlobalVariables",
                        test: (content) => /^[a-zA-Z_][a-zA-Z0-9_]* = (?!lambda)/.test(content),
                        message: "Avoid using global variables",
                    },
                    // Add more Python-specific rules
                ],
            },
            // Add more language configurations as needed
        ];
    }

    async analyzeRepository(repoName: string): Promise<FileAnalysisResult[]> {
        console.log(`Starting analysis for repository: ${repoName}`);
        const repo = await indexedDBStore.getRepository(repoName);
        if (!repo) {
            console.error(`Repository ${repoName} not found`);
            throw new Error(`Repository ${repoName} not found`);
        }

        console.log(`Repository found: ${repo.name}`);
        console.log(`Number of files: ${Object.keys(repo.files).length}`);

        const results: FileAnalysisResult[] = [];

        for (const [path, content] of Object.entries(repo.files)) {
            console.log(`Analyzing file: ${path}`);
            if (typeof content !== "string") {
                console.warn(`Unexpected content type for file ${path}: ${typeof content}`);
                continue;
            }
            const decodedContent = this.decodeContent(content);
            const languageConfig = this.detectLanguage(path);
            if (languageConfig) {
                const fileResults = this.analyzeFile(path, decodedContent, languageConfig);
                if (fileResults.issues.length > 0) {
                    results.push(fileResults);
                }
            } else {
                console.warn(`Unsupported file type: ${path}`);
            }
        }

        console.log(`Analysis complete. Found issues in ${results.length} files.`);
        return results;
    }

    private decodeContent(content: string): string {
        try {
            return atob(content);
        } catch (error) {
            console.warn(`Failed to decode content: ${error}`);
            return content; // Return original content if decoding fails
        }
    }

    private detectLanguage(filePath: string): LanguageConfig | undefined {
        const extension = filePath.split(".").pop()?.toLowerCase();
        return this.languageConfigs.find((config) => config.extensions.includes(`.${extension}`));
    }

    private analyzeFile(path: string, content: string, languageConfig: LanguageConfig): FileAnalysisResult {
        const issues: AnalysisIssue[] = [];

        for (const rule of languageConfig.rules) {
            if (rule.test(content)) {
                issues.push({ rule: rule.name, message: rule.message });
            }
        }

        console.log(`File ${path}: Found ${issues.length} issues`);
        return { path, language: languageConfig.name, issues };
    }

    // Method to add custom rules for a specific language
    public addRule(languageName: string, rule: AnalysisRule): void {
        const config = this.languageConfigs.find((c) => c.name === languageName);
        if (config) {
            config.rules.push(rule);
        } else {
            console.warn(`Language ${languageName} not found. Rule not added.`);
        }
    }

    // Method to add support for a new language
    public addLanguage(config: LanguageConfig): void {
        this.languageConfigs.push(config);
    }
}

// Usage
const analyzer = new CodeAnalyzer();

async function analyzeRepo(repoName: string): Promise<FileAnalysisResult[]> {
    try {
        console.log(`Analyzing repository: ${repoName}`);
        const results = await analyzer.analyzeRepository(repoName);
        console.log("Analysis results:", results);
        return results;
    } catch (error) {
        console.error("Error during analysis:", error);
        throw error;
    }
}

export { CodeAnalyzer, analyzeRepo };

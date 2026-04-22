import type {
  AgentEntry,
  HookEntry,
  McpServerEntry,
  SectionGroup,
  SkillEntry,
} from "./types";

export const SKILL_GROUPS: SectionGroup<SkillEntry>[] = [
  {
    key: "extensions",
    label: "Extensions",
    items: [
      {
        id: "analyzing-architecture",
        name: "analyzing-architecture",
        description:
          "Runs deep codebase analysis: architecture patterns, tech stack, data models, integration points, and migration risks. Produces research artifacts consumed by creating-implementation-plan and feature-inv…",
      },
      {
        id: "building-java-knowledge-graph",
        name: "building-java-knowledge-graph",
        description:
          "Analyzes JVM projects (Java/Kotlin/Scala/Groovy) and generates knowledge graphs with tree-sitter parsing. Requires Python 3 on the host and a JVM project with Maven/Gradle/Ant/Ivy build files. Skips gra…",
      },
      {
        id: "creating-implementation-plan",
        name: "creating-implementation-plan",
        description:
          "Creates an implementation plan AND task breakdown from a feature spec by consuming design artifacts. Produces plan.md with implementation steps, inline task list with full REQ traceability, and a Require…",
      },
      {
        id: "feature-inventory",
        name: "feature-inventory",
        description:
          "Catalogs existing features from a codebase (API endpoints, user flows, UI screens, observable behaviors) and generates structured feature specs with REQ-XXX IDs, user scenarios, and success criteria.",
      },
      {
        id: "guidelines",
        name: "guidelines",
        description:
          "Collection of framework-to-framework migration rules and transformation patterns (e.g., Struts→Spring MVC, JSP→Thymeleaf, EJB→Spring Boot).",
      },
      {
        id: "implementing-code",
        name: "implementing-code",
        description:
          "Executes a batch of implementation tasks with TDD workflow, source-anchored rewrite for behavioral fidelity, guideline-based code transformation, and full requirement tracing. Returns a structured batch r…",
      },
      {
        id: "modernization-integration-tests",
        name: "modernization-integration-tests",
        description:
          "Run multi-layer integration tests for modernized Java applications. Supports 4 layers -",
      },
      {
        id: "quality-gates",
        name: "quality-gates",
        description:
          "Runs quality gate validation at each workflow stage. Supports 4 gate types: spec-quality, spec-to-plan, plan-to-tasks, completeness. Produces gate pass/fail reports with actionable feedback.",
      },
      {
        id: "runtime-validation",
        name: "runtime-validation",
        description:
          "Runtime validation for migrated applications — covers testing strategy (planning phase)",
      },
      {
        id: "setting-up-constitution",
        name: "setting-up-constitution",
        description:
          "Creates or updates the project constitution that defines migration principles, constraints, and conventions.",
      },
      {
        id: "team-charters",
        name: "team-charters",
        description:
          "Provides role charters (mission, boundaries, ownership) for a multi-agent coding team. Covers roles: architect, backend, dba, devops, frontend, pm, teamlead, security, tester, and ux. Each charter defines t…",
      },
      {
        id: "typescript-setup",
        name: "typescript-setup",
        description: "How to set up a new TypeScript project",
      },
      {
        id: "typescript-upgrade",
        name: "typescript-upgrade",
        description:
          "Upgrade a TypeScript project's npm dependencies to their latest versions and resolve breaking changes. Use this when asked to upgrade, update, or modernize npm packages in a TypeScript project.",
      },
    ],
  },
  {
    key: "built-in",
    label: "Built-In",
    items: [
      {
        id: "agent-customization",
        name: "agent-customization",
        description:
          "**WORKFLOW SKILL** — Create, update, review, fix, or debug VS Code agent customization files (.instructions.md, .prompt.md, .agent.md, SKILL.md, copilot-instructions.md, AGENTS.md). USE FOR: savin…",
      },
      {
        id: "create-agent",
        name: "create-agent",
        description: "Create a custom agent (.agent.md) for a specific job.",
      },
    ],
  },
];

export const HOOK_GROUPS: SectionGroup<HookEntry>[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: [
      {
        id: "workspace-settings-local",
        name: "Settings.Local.Json",
        filename: "settings.local.json",
      },
    ],
  },
  {
    key: "user",
    label: "User",
    items: [
      {
        id: "user-credentials",
        name: ".Credentials.Json",
        filename: ".credentials.json",
      },
      {
        id: "user-mcp-needs-auth-cache",
        name: "Mcp Needs Auth Cache.Json",
        filename: "mcp-needs-auth-cache.json",
      },
      {
        id: "user-settings",
        name: "Settings.Json",
        filename: "settings.json",
      },
      {
        id: "user-settings-local",
        name: "Settings.Local.Json",
        filename: "settings.local.json",
      },
    ],
  },
];

export const MCP_GROUPS: SectionGroup<McpServerEntry>[] = [
  {
    key: "user",
    label: "User",
    items: [
      {
        id: "supabase",
        name: "Supabase",
        description: "MCP server for interacting with the Supabase platform",
        status: "stopped",
      },
      {
        id: "chrome-devtools",
        name: "Chrome DevTools MCP",
        description: "MCP server for Chrome DevTools",
        status: "stopped",
      },
      {
        id: "github",
        name: "GitHub",
        description:
          "Connect AI assistants to GitHub - manage repos, issues, PRs, and workflows through natural language.",
        status: "stopped",
      },
      {
        id: "markitdown",
        name: "Markitdown",
        description:
          "Convert various file formats (PDF, Word, Excel, images, audio) to Markdown.",
        status: "stopped",
      },
      {
        id: "playwright",
        name: "Playwright",
        description:
          "Automate web browsers using accessibility trees for testing and data extraction.",
        status: "stopped",
      },
    ],
  },
  {
    key: "extensions",
    label: "Extensions",
    items: [
      { id: "gitkraken", name: "GitKraken", description: "" },
      {
        id: "gh-copilot-deploy",
        name: "GitHub Copilot modernization Deploy",
        description: "",
      },
      {
        id: "gh-copilot-ts",
        name: "GitHub Copilot modernization - TypeScript",
        description: "",
      },
    ],
  },
];

export const AGENT_ENTRIES: AgentEntry[] = [
  {
    id: "modernize-azure-dotnet",
    name: "modernize-azure-dotnet",
    filename: "modernize-azure-dotnet.agent.md",
    description: "Modernize the .NET application",
  },
];

export const AGENT_FILE_PREVIEW = `---
name: modernize-azure-dotnet
description: Modernize the .NET application
argument-hint: Describe what to modernize (.NET)

Configure Tools...
tools: ['edit', 'search', 'runCommands', 'usages', 'problems', 'changes', 'testFailure', 'fetch', 'githubRepo', 'todos',
  'appmod-completeness-validation',
  'appmod-consistency-validation',
  'appmod-create-migration-summary',
  'appmod-fetch-knowledgebase',
  'appmod-get-vscode-config',
  'appmod-preview-markdown',
  'appmod-run-task',
  'appmod-search-file',
  'appmod-search-knowledgebase',
  'appmod-version-control',
  'appmod-dotnet-build-project',
  'appmod-dotnet-cve-check',
  'appmod-dotnet-run-test']

model: Claude Sonnet 4.6
---

# .NET Modernization agent instructions

## My Role
I am a specialized AI assistant for modernizing .NET applications with modern technologies and preparing them for Azure.

## Migration Context (Injected from run-task)
When you receive the migration context from #appmod-run-task, use these values throughout the migration:
- **Session ID**: \`{{sessionId}}\`
- **Workspace Path**: \`{{workspacePath}}\`
- **Language**: \`{{language}}\`
- **Scenario**: \`{{scenario}}\`
- **KB ID**: \`{{kbId}}\`
- **Task ID**: \`{{taskId}}\`
- **Timestamp**: \`{{timestamp}}\`
- **Target Branch**: \`{{targetBranch}}\`
- **Latest Commit ID**: \`{{latestCommitId}}\`
- **Report Path**: \`{{reportPath}}\`
- **Goal Description**: \`{{goalDescription}}\`
- **Task Instruction**: \`{{taskInstruction}}\`
`;

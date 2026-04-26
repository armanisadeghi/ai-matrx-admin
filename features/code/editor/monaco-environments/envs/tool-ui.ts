import type { MonacoEnvironmentDescriptor } from "../types";

const TOOL_UI_PREFIX = "tool-ui:";

/**
 * Tool-result UI environment — React baseline plus a `ToolResult<TArgs,
 * TResult>` typing utility for tool-call display components stored in
 * `tool_ui_components`.
 */
const TOOL_UI_AMBIENTS = `
declare type ToolResult<TArgs = unknown, TResult = unknown> = {
  toolCallId: string;
  toolName: string;
  status: "in-progress" | "succeeded" | "failed";
  args: TArgs;
  result: TResult | null;
  error: string | null;
  startedAt: string;
  finishedAt?: string;
};

declare type ToolInlineProps<TArgs = unknown, TResult = unknown> = {
  result: ToolResult<TArgs, TResult>;
  expand: () => void;
};

declare type ToolOverlayProps<TArgs = unknown, TResult = unknown> = {
  result: ToolResult<TArgs, TResult>;
  closeOverlay: () => void;
};
`;

export const TOOL_UI_ENVIRONMENT: MonacoEnvironmentDescriptor = {
  id: "tool-ui",
  label: "Tool UI",
  description: "React + ToolResult typing utility for tool_ui_components.",
  applies: (tab) => tab.id.startsWith(TOOL_UI_PREFIX),
  jsxRuntime: "preserve",
  compilerOptions: {
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
  },
  diagnosticsOptions: {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  },
  libs: async () => {
    const mod = await import("@/features/code-editor/config/type-definitions");
    return [
      {
        filePath: "file:///node_modules/@types/tool-ui/react/index.d.ts",
        content: mod.reactTypes,
      },
      {
        filePath: "file:///node_modules/@types/tool-ui/lucide-react/index.d.ts",
        content: mod.lucideReactTypes,
      },
      {
        filePath: "file:///node_modules/@types/tool-ui/ambients/index.d.ts",
        content: TOOL_UI_AMBIENTS,
      },
    ];
  },
};

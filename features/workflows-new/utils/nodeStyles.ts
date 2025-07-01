import {
    Zap,
    Play,
    Repeat,
    GitBranch,
    Database,
    Globe,
    Webhook,
    Settings,
    User,
    ArrowRight,
    Circle,
    FileText,
    Cpu,
    Bot,
    Scissors,
    File,
    HardDrive,
    Image,
    BookOpen,
    Puzzle,
    Terminal,
    Code,
    ChefHat,
    MessageSquare,
    LucideIcon,
    Brain,
    Cog,
    Filter,
    Plug,
    Radio,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Download,
} from "lucide-react";

// Single source of truth for node type configurations
export interface NodeTypeConfig {
    id: string;
    icon: LucideIcon;
    label: string;
    title?: string;
    borderColor: string;
    backgroundColor: string;
    minimapColorLight: string;
    minimapColorDark: string;
}

// Centralized node type definitions
export const NODE_TYPE_CONFIGS: Record<string, NodeTypeConfig> = {
    default: {
        id: "default",
        icon: Circle,
        label: "Default",
        borderColor: "border-gray-500 dark:border-gray-400",
        backgroundColor: "bg-gray-50 dark:bg-gray-950/20",
        minimapColorLight: "#6b7280",
        minimapColorDark: "#9ca3af",
    },
    functionNode: {
        id: "functionNode",
        icon: Zap,
        label: "Function Node",
        borderColor: "border-blue-500 dark:border-blue-400",
        backgroundColor: "bg-blue-50 dark:bg-blue-950/20",
        minimapColorLight: "#3b82f6",
        minimapColorDark: "#60a5fa",
    },
    recipes: {
        id: "recipes",
        icon: Brain,
        label: "Recipes",
        borderColor: "border-orange-500 dark:border-orange-400",
        backgroundColor: "bg-orange-50 dark:bg-orange-950/20",
        minimapColorLight: "#f97316",
        minimapColorDark: "#fb923c",
    },
    prompts: {
        id: "prompts",
        icon: MessageSquare,
        label: "Prompts",
        borderColor: "border-indigo-500 dark:border-indigo-400",
        backgroundColor: "bg-indigo-50 dark:bg-indigo-950/20",
        minimapColorLight: "#6366f1",
        minimapColorDark: "#818cf8",
    },
    agents: {
        id: "agents",
        icon: Bot,
        label: "Agents",
        borderColor: "border-cyan-500 dark:border-cyan-400",
        backgroundColor: "bg-cyan-50 dark:bg-cyan-950/20",
        minimapColorLight: "#06b6d4",
        minimapColorDark: "#22d3ee",
    },
    processors: {
        id: "processors",
        icon: Cog,
        label: "Processors",
        borderColor: "border-violet-500 dark:border-violet-400",
        backgroundColor: "bg-violet-50 dark:bg-violet-950/20",
        minimapColorLight: "#8b5cf6",
        minimapColorDark: "#a78bfa",
    },
    extractors: {
        id: "extractors",
        icon: Scissors,
        label: "Extractors",
        borderColor: "border-rose-500 dark:border-rose-400",
        backgroundColor: "bg-rose-50 dark:bg-rose-950/20",
        minimapColorLight: "#f43f5e",
        minimapColorDark: "#fb7185",
    },
    files: {
        id: "files",
        icon: File,
        label: "Files",
        borderColor: "border-slate-500 dark:border-slate-400",
        backgroundColor: "bg-slate-50 dark:bg-slate-950/20",
        minimapColorLight: "#64748b",
        minimapColorDark: "#94a3b8",
    },
    database: {
        id: "database",
        icon: Database,
        label: "Database",
        title: "Database Functions",
        borderColor: "border-emerald-500 dark:border-emerald-400",
        backgroundColor: "bg-emerald-50 dark:bg-emerald-950/20",
        minimapColorLight: "#10b981",
        minimapColorDark: "#34d399",
    },
    web: {
        id: "web",
        icon: Globe,
        label: "Web",
        title: "Web Services",
        borderColor: "border-sky-500 dark:border-sky-400",
        backgroundColor: "bg-sky-50 dark:bg-sky-950/20",
        minimapColorLight: "#0ea5e9",
        minimapColorDark: "#38bdf8",
    },
    media: {
        id: "media",
        icon: Image,
        label: "Media",
        title: "Media Processing",
        borderColor: "border-fuchsia-500 dark:border-fuchsia-400",
        backgroundColor: "bg-fuchsia-50 dark:bg-fuchsia-950/20",
        minimapColorLight: "#d946ef",
        minimapColorDark: "#e879f9",
    },
    documents: {
        id: "documents",
        icon: BookOpen,
        label: "Documents",
        borderColor: "border-teal-500 dark:border-teal-400",
        backgroundColor: "bg-teal-50 dark:bg-teal-950/20",
        minimapColorLight: "#14b8a6",
        minimapColorDark: "#2dd4bf",
    },
    integrations: {
        id: "integrations",
        icon: Puzzle,
        label: "Integrations",
        borderColor: "border-lime-500 dark:border-lime-400",
        backgroundColor: "bg-lime-50 dark:bg-lime-950/20",
        minimapColorLight: "#84cc16",
        minimapColorDark: "#a3e635",
    },
    commands: {
        id: "commands",
        icon: Terminal,
        label: "Commands",
        borderColor: "border-stone-500 dark:border-stone-400",
        backgroundColor: "bg-stone-50 dark:bg-stone-950/20",
        minimapColorLight: "#78716c",
        minimapColorDark: "#a8a29e",
    },
    executors: {
        id: "executors",
        icon: Play,
        label: "Executors",
        borderColor: "border-red-500 dark:border-red-400",
        backgroundColor: "bg-red-50 dark:bg-red-950/20",
        minimapColorLight: "#ef4444",
        minimapColorDark: "#f87171",
    },
    api: {
        id: "api",
        icon: Code,
        label: "API",
        title: "API Integrations",
        borderColor: "border-blue-500 dark:border-blue-400",
        backgroundColor: "bg-blue-50 dark:bg-blue-950/20",
        minimapColorLight: "#3b82f6",
        minimapColorDark: "#60a5fa",
    },
    other: {
        id: "other",
        icon: MoreHorizontal,
        label: "Other",
        title: "Other Functions",
        borderColor: "border-neutral-500 dark:border-neutral-400",
        backgroundColor: "bg-neutral-50 dark:bg-neutral-950/20",
        minimapColorLight: "#737373",
        minimapColorDark: "#a3a3a3",
    },
    userInput: {
        id: "userInput",
        icon: User,
        label: "User Input",
        borderColor: "border-green-500 dark:border-green-400",
        backgroundColor: "bg-green-50 dark:bg-green-950/20",
        minimapColorLight: "#10b981",
        minimapColorDark: "#34d399",
    },
    brokerRelay: {
        id: "brokerRelay",
        icon: ArrowRight,
        label: "Broker Relay",
        borderColor: "border-amber-500 dark:border-amber-400",
        backgroundColor: "bg-amber-50 dark:bg-amber-950/20",
        minimapColorLight: "#f59e0b",
        minimapColorDark: "#fbbf24",
    },
    workflowNode: {
        id: "workflowNode",
        icon: Settings,
        label: "Workflow Node",
        borderColor: "border-purple-500 dark:border-purple-400",
        backgroundColor: "bg-purple-50 dark:bg-purple-950/20",
        minimapColorLight: "#8b5cf6",
        minimapColorDark: "#a78bfa",
    },
    trigger: {
        id: "trigger",
        icon: Play,
        label: "Trigger",
        borderColor: "border-red-500 dark:border-red-400",
        backgroundColor: "bg-red-50 dark:bg-red-950/20",
        minimapColorLight: "#ef4444",
        minimapColorDark: "#f87171",
    },
    action: {
        id: "action",
        icon: Settings,
        label: "Action",
        borderColor: "border-purple-500 dark:border-purple-400",
        backgroundColor: "bg-purple-50 dark:bg-purple-950/20",
        minimapColorLight: "#8b5cf6",
        minimapColorDark: "#a78bfa",
    },
    condition: {
        id: "condition",
        icon: GitBranch,
        label: "Condition",
        borderColor: "border-pink-500 dark:border-pink-400",
        backgroundColor: "bg-pink-50 dark:bg-pink-950/20",
        minimapColorLight: "#ec4899",
        minimapColorDark: "#fb7185",
    },
    loop: {
        id: "loop",
        icon: Repeat,
        label: "Loop",
        borderColor: "border-green-500 dark:border-green-400",
        backgroundColor: "bg-green-50 dark:bg-green-950/20",
        minimapColorLight: "#10b981",
        minimapColorDark: "#34d399",
    },
    webhook: {
        id: "webhook",
        icon: Webhook,
        label: "Webhook",
        borderColor: "border-amber-500 dark:border-amber-400",
        backgroundColor: "bg-amber-50 dark:bg-amber-950/20",
        minimapColorLight: "#f59e0b",
        minimapColorDark: "#fbbf24",
    },
    sourceInput: {
        id: "sourceInput",
        icon: Download,
        label: "Source Input",
        borderColor: "border-blue-300 dark:border-blue-600",
        backgroundColor: "bg-blue-50 dark:bg-blue-950/20",
        minimapColorLight: "#3b82f6",
        minimapColorDark: "#60a5fa",
    },

};

// Handle styles configuration
export const HANDLE_STYLES = {
    input: "!bg-blue-500 !border-blue-400 !w-2 !h-2",
    output: "!bg-green-500 !border-green-400 !w-2 !h-2",
    default: "!bg-gray-500 !border-gray-400 !w-2 !h-2",
} as const;

// Node status icon styles configuration
export const NODE_STATUS_ICON_STYLES = {
    processing: "text-blue-500 dark:text-blue-400",
    executing: "text-blue-500 dark:text-blue-400",
    success: "text-green-500 dark:text-green-400",
    execution_complete: "text-green-500 dark:text-green-400",
    failed: "text-red-500 dark:text-red-400",
    execution_failed: "text-red-500 dark:text-red-400",
    pending: "text-muted-foreground/50",
    default: "text-muted-foreground/50",
} as const;

// Execution required icon styles configuration
export const EXECUTION_REQUIRED_ICON_STYLES = {
    required: "text-orange-500 dark:text-orange-400",
    notRequired: "text-muted-foreground/50",
} as const;

// Icon size configuration
export const NODE_ICON_SIZES = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
} as const;

// Backward compatible utility functions
export function getNodeIcon(nodeType?: string): LucideIcon {
    const config = NODE_TYPE_CONFIGS[nodeType || "default"];
    return config ? config.icon : NODE_TYPE_CONFIGS.default.icon;
}

export function getNodeTypeColor(nodeType?: string): string {
    const config = NODE_TYPE_CONFIGS[nodeType || "default"];
    return config ? config.borderColor : NODE_TYPE_CONFIGS.default.borderColor;
}

export function getNodeTypeBackground(nodeType?: string): string {
    const config = NODE_TYPE_CONFIGS[nodeType || "default"];
    return config ? config.backgroundColor : NODE_TYPE_CONFIGS.default.backgroundColor;
}

export function getNodeMinimapColor(nodeType?: string, currentTheme?: string): string {
    const config = NODE_TYPE_CONFIGS[nodeType || "default"];
    if (!config) return NODE_TYPE_CONFIGS.default.minimapColorLight;
    
    const isDark = currentTheme === "dark";
    return isDark ? config.minimapColorDark : config.minimapColorLight;
}

export function getHandleColor(type: "input" | "output"): string {
    return HANDLE_STYLES[type] || HANDLE_STYLES.default;
}

// New utility functions for status and execution required icons
export function getStatusIconStyle(status?: string | null): string {
    if (!status) return NODE_STATUS_ICON_STYLES.default;
    return NODE_STATUS_ICON_STYLES[status as keyof typeof NODE_STATUS_ICON_STYLES] || NODE_STATUS_ICON_STYLES.default;
}

export function getExecutionRequiredIconStyle(execution_required?: boolean | null): string {
    return execution_required === true 
        ? EXECUTION_REQUIRED_ICON_STYLES.required 
        : EXECUTION_REQUIRED_ICON_STYLES.notRequired;
}

export function getStatusIcon(status?: string | null): LucideIcon {
    switch (status) {
        case 'processing':
        case 'executing':
            return Loader2;
        case 'success':
        case 'execution_complete':
            return CheckCircle;
        case 'failed':
        case 'execution_failed':
            return XCircle;
        case 'pending':
        case null:
        case undefined:
        default:
            return Clock;
    }
}

export function getExecutionRequiredIcon(): LucideIcon {
    return Play;
}

export interface NodeStyleConfig {
    borderColor: string;
    backgroundColor: string;
    handleInputColor: string;
    handleOutputColor: string;
}

export function getNodeStyles(nodeType?: string): NodeStyleConfig {
    return {
        borderColor: getNodeTypeColor(nodeType),
        backgroundColor: getNodeTypeBackground(nodeType),
        handleInputColor: getHandleColor("input"),
        handleOutputColor: getHandleColor("output"),
    };
}

// Helper function to get all node types for validation
export function getAllNodeTypes(): string[] {
    return Object.keys(NODE_TYPE_CONFIGS);
}

// Backward compatible CATEGORY_DEFINITIONS export
export const CATEGORY_DEFINITIONS = Object.values(NODE_TYPE_CONFIGS).map(config => ({
    id: config.id,
    icon: config.icon,
    label: config.label,
    ...(config.title && { title: config.title }),
}));

// New utility functions for enhanced functionality
export function getNodeConfig(nodeType?: string): NodeTypeConfig {
    return NODE_TYPE_CONFIGS[nodeType || "default"] || NODE_TYPE_CONFIGS.default;
}

export function isValidNodeType(nodeType: string): boolean {
    return nodeType in NODE_TYPE_CONFIGS;
}

export function getNodeTypesByCategory(): Record<string, NodeTypeConfig[]> {
    // You can extend this to group by categories if needed
    return { all: Object.values(NODE_TYPE_CONFIGS) };
}
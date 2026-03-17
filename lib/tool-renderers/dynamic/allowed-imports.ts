/**
 * Allowed imports for dynamic tool UI components.
 *
 * Adapted from the Prompt Apps allowed-imports system. Defines the complete
 * set of modules available to database-stored tool renderer code.
 *
 * RULES FOR DYNAMIC TOOL COMPONENTS:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Components receive `props` with shape: { toolUpdates, currentIndex,
 *    onOpenOverlay, toolGroupId }
 * 2. All React hooks are available: useState, useEffect, useMemo,
 *    useCallback, useRef, Fragment
 * 3. All Lucide icons are available by name (e.g. <Globe />, <Search />).
 *    Missing icons render a placeholder instead of crashing.
 * 4. UI components from @/components/ui/* are available when listed in
 *    the component's `allowed_imports` array.
 * 5. The `cn()` utility for className merging is always available.
 * 6. `navigator.clipboard` is available via the browser — no import needed.
 * 7. Do NOT import from node_modules directly. Only whitelisted paths work.
 * 8. Do NOT use `import()` dynamic imports or `require()`.
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

interface AllowedImportConfig {
    path: string;
    loader: () => any;
    scopeStrategy: "spread" | "named";
    exports?: string[];
    exportMap?: Record<string, string>;
    safeProxy?: boolean;
}

// ---------------------------------------------------------------------------
// Import registry
// ---------------------------------------------------------------------------

export const TOOL_RENDERER_IMPORTS_CONFIG: AllowedImportConfig[] = [
    // ── React core ──────────────────────────────────────────────────────
    {
        path: "react",
        loader: () => require("react"),
        scopeStrategy: "named",
        exports: [
            "useState",
            "useEffect",
            "useMemo",
            "useCallback",
            "useRef",
            "Fragment",
        ],
        exportMap: { default: "React" },
    },

    // ── Icons ───────────────────────────────────────────────────────────
    {
        path: "lucide-react",
        loader: () => require("lucide-react"),
        scopeStrategy: "spread",
        safeProxy: true,
    },

    // ── Utility ─────────────────────────────────────────────────────────
    {
        path: "@/lib/utils",
        loader: () => require("@/lib/utils"),
        scopeStrategy: "named",
        exports: ["cn"],
    },

    // ── UI Components ───────────────────────────────────────────────────
    {
        path: "@/components/ui/badge",
        loader: () => require("@/components/ui/badge"),
        scopeStrategy: "named",
        exports: ["Badge"],
    },
    {
        path: "@/components/ui/button",
        loader: () => require("@/components/ui/button"),
        scopeStrategy: "named",
        exports: ["Button"],
    },
    {
        path: "@/components/ui/card",
        loader: () => require("@/components/ui/card"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/input",
        loader: () => require("@/components/ui/input"),
        scopeStrategy: "named",
        exports: ["Input"],
    },
    {
        path: "@/components/ui/label",
        loader: () => require("@/components/ui/label"),
        scopeStrategy: "named",
        exports: ["Label"],
    },
    {
        path: "@/components/ui/select",
        loader: () => require("@/components/ui/select"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/slider",
        loader: () => require("@/components/ui/slider"),
        scopeStrategy: "named",
        exports: ["Slider"],
    },
    {
        path: "@/components/ui/switch",
        loader: () => require("@/components/ui/switch"),
        scopeStrategy: "named",
        exports: ["Switch"],
    },
    {
        path: "@/components/ui/tabs",
        loader: () => require("@/components/ui/tabs"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/textarea",
        loader: () => require("@/components/ui/textarea"),
        scopeStrategy: "named",
        exports: ["Textarea"],
    },
    {
        path: "@/components/ui/tooltip",
        loader: () => require("@/components/ui/tooltip"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/accordion",
        loader: () => require("@/components/ui/accordion"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/collapsible",
        loader: () => require("@/components/ui/collapsible"),
        scopeStrategy: "spread",
    },
    {
        path: "@/components/ui/progress",
        loader: () => require("@/components/ui/progress"),
        scopeStrategy: "named",
        exports: ["Progress"],
    },
    {
        path: "@/components/ui/separator",
        loader: () => require("@/components/ui/separator"),
        scopeStrategy: "named",
        exports: ["Separator"],
    },
    {
        path: "@/components/ui/scroll-area",
        loader: () => require("@/components/ui/scroll-area"),
        scopeStrategy: "spread",
    },

    // ── Markdown ────────────────────────────────────────────────────────
    {
        path: "@/components/MarkdownStream",
        loader: () => require("@/components/MarkdownStream"),
        scopeStrategy: "named",
        exportMap: { default: "MarkdownStream" },
    },
];

// ---------------------------------------------------------------------------
// Default imports for new components
// ---------------------------------------------------------------------------

export function getDefaultImportsForToolRenderer(): string[] {
    return [
        "react",
        "lucide-react",
        "@/lib/utils",
        "@/components/ui/badge",
        "@/components/ui/button",
        "@/components/ui/card",
        "@/components/ui/tabs",
    ];
}

// ---------------------------------------------------------------------------
// All available import paths (for admin UI display)
// ---------------------------------------------------------------------------

export function getAllAvailableImports(): Array<{
    path: string;
    description: string;
}> {
    const descriptions: Record<string, string> = {
        react: "React core (useState, useEffect, useMemo, useCallback, useRef, Fragment)",
        "lucide-react": "All Lucide icons (Globe, Search, CheckCircle, etc.)",
        "@/lib/utils": "cn() className merging utility",
        "@/components/ui/badge": "Badge component",
        "@/components/ui/button": "Button component",
        "@/components/ui/card": "Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter",
        "@/components/ui/input": "Input component",
        "@/components/ui/label": "Label component",
        "@/components/ui/select": "Select, SelectTrigger, SelectContent, SelectItem, SelectValue",
        "@/components/ui/slider": "Slider component",
        "@/components/ui/switch": "Switch component",
        "@/components/ui/tabs": "Tabs, TabsList, TabsTrigger, TabsContent",
        "@/components/ui/textarea": "Textarea component",
        "@/components/ui/tooltip": "Tooltip, TooltipTrigger, TooltipContent, TooltipProvider",
        "@/components/ui/accordion": "Accordion, AccordionItem, AccordionTrigger, AccordionContent",
        "@/components/ui/collapsible": "Collapsible, CollapsibleTrigger, CollapsibleContent",
        "@/components/ui/progress": "Progress component",
        "@/components/ui/separator": "Separator component",
        "@/components/ui/scroll-area": "ScrollArea, ScrollBar",
        "@/components/MarkdownStream": "MarkdownStream component for rendering markdown",
    };

    return TOOL_RENDERER_IMPORTS_CONFIG.map((config) => ({
        path: config.path,
        description: descriptions[config.path] || config.path,
    }));
}

// ---------------------------------------------------------------------------
// Fallback icon factory (for missing Lucide icons)
// ---------------------------------------------------------------------------

function createFallbackIcon(iconName: string) {
    const FallbackIcon = React.forwardRef<
        SVGSVGElement,
        React.SVGProps<SVGSVGElement> & { size?: number | string }
    >(({ size = 24, className, ...props }, ref) => {
        return React.createElement(
            "svg",
            {
                ref,
                xmlns: "http://www.w3.org/2000/svg",
                width: size,
                height: size,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className,
                "data-missing-icon": iconName,
                ...props,
            },
            React.createElement("circle", { cx: 12, cy: 12, r: 10 }),
            React.createElement("path", {
                d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
            }),
            React.createElement("line", { x1: 12, y1: 17, x2: 12.01, y2: 17 })
        );
    });
    FallbackIcon.displayName = `MissingIcon(${iconName})`;
    return FallbackIcon;
}

// ---------------------------------------------------------------------------
// Safe proxy for modules (returns fallback for missing icons)
// ---------------------------------------------------------------------------

const safeProxyCache = new Map<string, Record<string, any>>();

function createSafeModuleProxy(
    importPath: string,
    moduleExports: Record<string, any>
): Record<string, any> {
    if (safeProxyCache.has(importPath)) {
        return safeProxyCache.get(importPath)!;
    }

    const safeExports: Record<string, any> = { ...moduleExports };

    const proxy = new Proxy(safeExports, {
        get(target, prop: string) {
            if (prop in target) return target[prop];
            if (
                typeof prop !== "string" ||
                prop.startsWith("_") ||
                prop === "default" ||
                prop === "__esModule"
            ) {
                return undefined;
            }
            if (/^[A-Z]/.test(prop)) {
                const fallback = createFallbackIcon(prop);
                target[prop] = fallback;
                return fallback;
            }
            return undefined;
        },
        has(target, prop) {
            if (typeof prop === "string" && /^[A-Z]/.test(prop)) return true;
            return prop in target;
        },
    });

    safeProxyCache.set(importPath, proxy);
    return proxy;
}

// ---------------------------------------------------------------------------
// Scope builder
// ---------------------------------------------------------------------------

/**
 * Builds the execution scope for a dynamic tool component.
 * Only modules listed in `allowedImports` are loaded.
 */
export function buildToolRendererScope(
    allowedImports: string[]
): Record<string, any> {
    const scope: Record<string, any> = {};

    // Always include React core
    const ReactModule = require("react");
    scope.React = ReactModule;
    scope.useState = ReactModule.useState;
    scope.useEffect = ReactModule.useEffect;
    scope.useMemo = ReactModule.useMemo;
    scope.useCallback = ReactModule.useCallback;
    scope.useRef = ReactModule.useRef;
    scope.Fragment = ReactModule.Fragment;

    for (const importPath of allowedImports) {
        const config = TOOL_RENDERER_IMPORTS_CONFIG.find(
            (c) => c.path === importPath
        );
        if (!config) continue;

        try {
            const mod = config.loader();

            if (config.scopeStrategy === "spread") {
                if (config.safeProxy) {
                    const safeModule = createSafeModuleProxy(config.path, mod);
                    for (const key of Object.keys(mod)) {
                        scope[key] = mod[key];
                    }
                    if (!scope.__safeProxies) scope.__safeProxies = {};
                    scope.__safeProxies[config.path] = safeModule;
                } else {
                    Object.assign(scope, mod);
                }
            } else if (config.scopeStrategy === "named") {
                if (config.exports) {
                    for (const exportName of config.exports) {
                        if (mod[exportName] !== undefined) {
                            scope[exportName] = mod[exportName];
                        }
                    }
                }
                if (config.exportMap) {
                    for (const [moduleKey, scopeKey] of Object.entries(
                        config.exportMap
                    )) {
                        const value =
                            moduleKey === "default"
                                ? mod.default || mod
                                : mod[moduleKey];
                        scope[scopeKey] = value;
                    }
                }
            }
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to load import: ${importPath}`,
                err
            );
        }
    }

    return scope;
}

// ---------------------------------------------------------------------------
// Missing identifier patcher
// ---------------------------------------------------------------------------

/**
 * Scans transformed code for PascalCase identifiers not in scope and injects
 * safe fallback components to prevent ReferenceError crashes.
 */
export function patchScopeForMissingIdentifiers(
    code: string,
    scope: Record<string, any>
): void {
    const codeForScanning = code
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/`(?:[^`\\]|\\.)*`/gs, "``");

    const identifierRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
    const foundIdentifiers = new Set<string>();

    let match;
    while ((match = identifierRegex.exec(codeForScanning)) !== null) {
        foundIdentifiers.add(match[1]);
    }

    const skipList = new Set([
        "React",
        "Object",
        "Array",
        "String",
        "Number",
        "Boolean",
        "Date",
        "Math",
        "JSON",
        "Promise",
        "Error",
        "TypeError",
        "RangeError",
        "RegExp",
        "Map",
        "Set",
        "WeakMap",
        "WeakSet",
        "Symbol",
        "Proxy",
        "Reflect",
        "Intl",
        "URL",
        "FormData",
        "Headers",
        "Request",
        "Response",
        "AbortController",
        "HTMLElement",
        "SVGElement",
        "Event",
        "MouseEvent",
        "KeyboardEvent",
        "HTMLInputElement",
        "HTMLTextAreaElement",
        "HTMLSelectElement",
        "HTMLButtonElement",
        "HTMLDivElement",
        "HTMLFormElement",
        "Node",
        "Element",
        "Document",
        "Window",
        "Infinity",
        "NaN",
        "Fragment",
    ]);

    const safeProxies = scope.__safeProxies as
        | Record<string, Record<string, any>>
        | undefined;

    for (const identifier of foundIdentifiers) {
        if (skipList.has(identifier)) continue;
        if (identifier in scope) continue;

        if (safeProxies) {
            let provided = false;
            for (const proxy of Object.values(safeProxies)) {
                const value = proxy[identifier];
                if (value !== undefined) {
                    scope[identifier] = value;
                    provided = true;
                    break;
                }
            }
            if (provided) continue;
        }

        scope[identifier] = createFallbackIcon(identifier);
    }
}

// ---------------------------------------------------------------------------
// Scope → function parameters
// ---------------------------------------------------------------------------

/**
 * Filters scope to valid JS identifiers that can be used as function params.
 */
export function getScopeFunctionParameters(scope: Record<string, any>): {
    paramNames: string[];
    paramValues: any[];
} {
    const paramNames = Object.keys(scope).filter(
        (key) =>
            /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !key.startsWith("__")
    );
    const paramValues = paramNames.map((key) => scope[key]);
    return { paramNames, paramValues };
}

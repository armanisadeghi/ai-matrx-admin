import { Suspense } from "react";
import { McpToolsManager } from "@/components/admin/McpToolsManager";
import { Loader2 } from "lucide-react";

export default function McpToolsPage() {
    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                <h1 className="text-lg font-semibold">MCP Tools</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Manage MCP tool definitions, UI components, and test samples</p>
            </div>
            <div className="flex-1 overflow-y-auto pb-safe">
                <div className="container mx-auto py-4 px-6">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading tools…
                        </div>
                    }>
                        <McpToolsManager />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

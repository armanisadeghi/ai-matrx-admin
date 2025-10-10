import { Suspense } from "react";
import { McpToolsManager } from "@/components/admin/McpToolsManager";
import { Loader2 } from "lucide-react";

export default function McpToolsPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="container mx-auto py-6 px-4 min-h-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        MCP Tools Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage and configure MCP (Model Context Protocol) tools for the system.
                    </p>
                </div>

                <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading tools...</span>
                    </div>
                }>
                    <McpToolsManager />
                </Suspense>
            </div>
        </div>
    );
}
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchAIModels } from "@/lib/api/ai-models-server";
import { PromptBuilder } from "@/features/prompts/components/PromptBuilder";
import { serverToolsService } from "@/utils/supabase/server-tools-service";

// Cache AI models data for 12 hours
export const revalidate = 43200;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch prompt for metadata
    const { data: prompt } = await supabase
        .from("prompts")
        .select("name, description")
        .eq("id", id)
        .single();

    // Generate title
    const title = prompt?.name && prompt.name.trim() !== ""
        ? `${prompt.name} Prompt`
        : "Edit Prompt";

    // Generate description
    const description = prompt?.description && typeof prompt.description === 'string' && prompt.description.trim() !== ""
        ? prompt.description
        : "Edit and customize your AI prompt configuration";

    return {
        title,
        description,
    };
}

export default async function EditPromptPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch prompt by ID (RLS handles access control) and AI models in parallel
    const [promptResult, aiModels, availableTools] = await Promise.all([
        supabase.from("prompts").select("*").eq("id", id).single(),
        fetchAIModels(),
        serverToolsService.fetchTools()
    ]);

    const { data, error } = promptResult;

    // Handle not found or access denied
    if (error || !data) {
        return (
            <div className="h-full w-full flex items-center justify-center p-8">
                <Card className="max-w-md w-full p-8 bg-white dark:bg-gray-900 border-red-200 dark:border-red-800">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Prompt Not Found
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                This prompt either doesn't exist or you don't have permission to access it.
                            </p>
                        </div>
                        <Link href="/ai/prompts">
                            <Button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                                Back to Prompts
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    const initialData = {
        id: data.id,
        name: data.name,
        messages: data.messages,
        variableDefaults: data.variable_defaults,
        settings: data.settings,
    };

    return <PromptBuilder models={aiModels} initialData={initialData} availableTools={availableTools} />;
}

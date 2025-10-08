import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchAIModels } from "@/lib/api/ai-models";

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
        : "View Prompt";

    // Generate description
    const description = prompt?.description && typeof prompt.description === 'string' && prompt.description.trim() !== ""
        ? prompt.description
        : "View your AI prompt details and configuration";

    return {
        title,
        description,
    };
}

export default async function ViewPromptPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch prompt by ID (RLS handles access control) and AI models in parallel
    const [promptResult, aiModels] = await Promise.all([
        supabase.from("prompts").select("*").eq("id", id).single(),
        fetchAIModels()
    ]);

    const { data: prompt, error } = promptResult;

    // Handle not found or access denied
    if (error || !prompt) {
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

    return (
        <div className="h-full w-full p-8">
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        View Prompt
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {prompt.name || "Untitled Prompt"}
                    </p>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Prompt Data
                        </h2>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <pre className="p-4 overflow-auto text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                {JSON.stringify(prompt, null, 2)}
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Available AI Models
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                (Cached for 12 hours)
                            </span>
                        </h2>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <pre className="p-4 overflow-auto text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                {JSON.stringify(aiModels, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}


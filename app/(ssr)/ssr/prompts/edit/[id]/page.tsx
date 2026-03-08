import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchAIModels } from "@/lib/api/ai-models-server";
import { PromptBuilder } from "@/features/prompts/components/builder/PromptBuilder";
import { serverToolsService } from "@/utils/supabase/server-tools-service";
import type { PromptAccessInfo } from "@/features/prompts/types/shared";

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

    // Fetch prompt by ID (RLS handles access control), AI models, tools, and access level in parallel
    const [promptResult, aiModels, availableTools, accessLevelResult] = await Promise.all([
        supabase.from("prompts").select("*").eq("id", id).single(),
        fetchAIModels(),
        serverToolsService.fetchTools(),
        supabase.rpc("get_prompt_access_level", { prompt_id: id })
    ]);

    const { data, error } = promptResult;
    const { data: accessData, error: accessError } = accessLevelResult;

    // Transform access data
    let accessInfo: PromptAccessInfo | undefined;
    if (accessData && Array.isArray(accessData) && accessData.length > 0) {
        const access = accessData[0];
        accessInfo = {
            isOwner: access.is_owner,
            permissionLevel: access.permission_level as PromptAccessInfo['permissionLevel'],
            ownerEmail: access.owner_email,
            canEdit: access.can_edit,
            canDelete: access.can_delete,
        };
    } else if (accessData && !Array.isArray(accessData)) {
        // Single row returned directly
        accessInfo = {
            isOwner: accessData.is_owner,
            permissionLevel: accessData.permission_level as PromptAccessInfo['permissionLevel'],
            ownerEmail: accessData.owner_email,
            canEdit: accessData.can_edit,
            canDelete: accessData.can_delete,
        };
    }

    if (accessError) {
        console.error("Error fetching access level:", accessError);
    }

    // Handle not found or access denied
    if (error || !data) {
        return (
            <div className="h-full w-full flex items-center justify-center p-8">
                <Card className="max-w-md w-full p-8 bg-textured border-destructive/30">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-destructive/10 rounded-full">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Prompt Not Found
                            </h2>
                            <p className="text-muted-foreground">
                                This prompt either doesn't exist or you don't have permission to access it.
                            </p>
                        </div>
                        <Link href="/ai/prompts">
                            <Button>
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

    return <PromptBuilder models={aiModels} initialData={initialData} availableTools={availableTools} accessInfo={accessInfo} />;
}

import { createClient } from "@/utils/supabase/server";
import { PromptsGrid } from "@/features/prompts/components/layouts/PromptsGrid";
import { PromptsPageHeader } from "@/features/prompts/components/layouts/PromptsPageHeader";
import type { SharedPrompt } from "@/features/prompts/types/shared";

export default async function PromptsPage() {
    const supabase = await createClient();

    // Get the authenticated user (middleware ensures user exists)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user's prompts and shared prompts in parallel
    const [promptsResult, sharedPromptsResult] = await Promise.all([
        // User's own prompts
        supabase
            .from("prompts")
            .select("id, name, description")
            .eq("user_id", user!.id)
            .order("updated_at", { ascending: false }),
        
        // Prompts shared with the user via RPC function
        supabase.rpc("get_prompts_shared_with_me"),
    ]);

    const { data: prompts, error } = promptsResult;
    const { data: sharedPromptsData, error: sharedError } = sharedPromptsResult;

    if (error) {
        console.error("Error fetching prompts:", error);
        throw new Error("Failed to fetch prompts");
    }

    if (sharedError) {
        console.error("Error fetching shared prompts:", sharedError);
        // Don't throw - shared prompts are optional, just log the error
    }

    // Transform shared prompts data to match expected interface
    const sharedPrompts: SharedPrompt[] = (sharedPromptsData || []).map((sp: any) => ({
        id: sp.id,
        name: sp.name,
        description: sp.description,
        permissionLevel: sp.permission_level as 'viewer' | 'editor' | 'admin',
        ownerEmail: sp.owner_email,
    }));

    return (
        <>
            <PromptsPageHeader />
            
            <div className="w-full">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 max-w-[1800px]">
                    <PromptsGrid prompts={prompts || []} sharedPrompts={sharedPrompts} />
                </div>
            </div>
        </>
    );
}

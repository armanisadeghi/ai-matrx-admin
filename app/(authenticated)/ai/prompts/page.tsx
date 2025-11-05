import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutPanelTop } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PromptsGrid } from "@/features/prompts/components/layouts/PromptsGrid";
import { PromptsPageHeader } from "@/features/prompts/components/layouts/PromptsPageHeader";

export default async function PromptsPage() {
    const supabase = await createClient();

    // Get the authenticated user (middleware ensures user exists)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user's prompts
    const { data: prompts, error } = await supabase
        .from("prompts")
        .select("id, name, description")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching prompts:", error);
        throw new Error("Failed to fetch prompts");
    }

    // Fetch template count for the info banner
    const { count: templateCount } = await supabase
        .from("prompt_templates")
        .select("*", { count: "exact", head: true });

    return (
        <>
            <PromptsPageHeader templateCount={templateCount} />
            
            <div className="h-page w-full overflow-auto">
                <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-[1800px]">

                {templateCount !== null && templateCount > 0 && prompts?.length === 0 && (
                    <Card className="mb-4 sm:mb-6 p-3 sm:p-4 md:p-6 bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/30">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 md:gap-4">
                                <div className="p-2 sm:p-2.5 md:p-3 bg-secondary/20 rounded-lg flex-shrink-0">
                                    <LayoutPanelTop className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-secondary-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-base md:text-lg font-semibold text-foreground mb-0.5 sm:mb-1">
                                        Start with a Template
                                    </h3>
                                </div>
                            </div>
                            <Link href="/ai/prompts/templates" className="w-full sm:w-auto">
                                <Button variant="secondary" className="w-full sm:w-auto text-sm h-9 sm:h-10">
                                    Explore Templates
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                    <PromptsGrid prompts={prompts || []} />
                </div>
            </div>
        </>
    );
}


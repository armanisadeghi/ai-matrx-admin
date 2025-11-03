import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LayoutPanelTop, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PromptsGrid } from "@/features/prompts/components/layouts/PromptsGrid";
import { ImportPromptButton } from "@/features/prompts/components/common/ImportPromptButton";
import { GeneratePromptButton } from "@/features/prompts/components/common/GeneratePromptButton";
import { FaIndent } from "react-icons/fa6";

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
        <div className="h-full w-full overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-[1800px]">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                                <FaIndent className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    Custom AI Prompts
                                </h1>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                                    Build and manage custom AI prompts
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ImportPromptButton />
                            <GeneratePromptButton />
                            <Link href="/ai/prompts/templates">
                                <Button
                                    variant="outline"
                                    className="border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm sm:text-sm h-9 sm:h-10"
                                >
                                    <LayoutPanelTop className="h-4 w-4 mr-1.5 sm:mr-2" />
                                    <span>Templates</span>
                                    {templateCount !== null && templateCount > 0 && (
                                        <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full text-xs">
                                            {templateCount}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                            <Link href="/ai/prompts/new">
                                <Button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm sm:text-sm h-9 sm:h-10">
                                    <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                                    New
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {templateCount !== null && templateCount > 0 && prompts?.length === 0 && (
                    <Card className="mb-4 sm:mb-6 p-3 sm:p-4 md:p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 md:gap-4">
                                <div className="p-2 sm:p-2.5 md:p-3 bg-purple-100 dark:bg-purple-800 rounded-lg flex-shrink-0">
                                    <LayoutPanelTop className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1">
                                        Start with a Template
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        Browse {templateCount} pre-built templates to jumpstart your prompts
                                    </p>
                                </div>
                            </div>
                            <Link href="/ai/prompts/templates" className="w-full sm:w-auto">
                                <Button className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-sm h-9 sm:h-10">
                                    Explore Templates
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                <PromptsGrid prompts={prompts || []} />
            </div>
        </div>
    );
}


import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PromptsGrid } from "../../../../features/prompts/components/PromptsGrid";

export default async function PromptsPage() {
    const supabase = await createClient();

    // Get the authenticated user (middleware ensures user exists)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user's prompts
    const { data: prompts, error } = await supabase
        .from("prompts")
        .select("id, name")
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
        <Card className="h-full w-full bg-white dark:bg-gray-900 border-none shadow-lg">
            <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Custom AI Prompts
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Build and manage custom AI prompts
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/ai/prompts/templates">
                            <Button
                                variant="outline"
                                className="border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Browse Templates
                                {templateCount !== null && templateCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full text-xs">
                                        {templateCount}
                                    </span>
                                )}
                            </Button>
                        </Link>
                        <Link href="/ai/prompts/new">
                            <Button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                New Prompt
                            </Button>
                        </Link>
                    </div>
                </div>

                {templateCount !== null && templateCount > 0 && prompts?.length === 0 && (
                    <Card className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
                                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Start with a Template
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Browse {templateCount} pre-built templates to jumpstart your prompts
                                    </p>
                                </div>
                            </div>
                            <Link href="/ai/prompts/templates">
                                <Button className="bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white">
                                    Explore Templates
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                <PromptsGrid prompts={prompts || []} />
            </div>
        </Card>
    );
}


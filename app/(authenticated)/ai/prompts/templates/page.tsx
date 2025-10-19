import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TemplatesGrid } from "./components/TemplatesGrid";

export default async function PromptTemplatesPage() {
    const supabase = await createClient();

    // Fetch all templates (public templates)
    const { data: templates, error } = await supabase
        .from("prompt_templates")
        .select("id, name, description, category, is_featured, use_count, created_at, updated_at")
        .order("is_featured", { ascending: false })
        .order("use_count", { ascending: false });

    if (error) {
        console.error("Error fetching templates:", error);
        throw new Error("Failed to fetch templates");
    }

    return (
        <Card className="h-full w-full bg-textured border-none shadow-lg">
            <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/ai/prompts">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Prompt Templates
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Start with pre-built templates to jumpstart your prompts
                            </p>
                        </div>
                    </div>
                </div>

                <TemplatesGrid templates={templates || []} />
            </div>
        </Card>
    );
}


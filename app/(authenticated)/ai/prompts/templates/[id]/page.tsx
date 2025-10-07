import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function PromptTemplatePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch template details
    const { data: template, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !template) {
        return (
            <Card className="h-full w-full bg-white dark:bg-gray-900 border-none shadow-lg">
                <div className="p-8 md:p-12">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Template Not Found
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The template you're looking for doesn't exist.
                        </p>
                        <Link href="/ai/prompts/templates">
                            <Button>Back to Templates</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <Card className="h-full w-full bg-white dark:bg-gray-900 border-none shadow-lg">
            <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/ai/prompts/templates">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                {template.name}
                            </h1>
                            {template.is_featured && (
                                <Star className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                            )}
                        </div>
                        {template.description && (
                            <p className="text-gray-600 dark:text-gray-400">
                                {template.description}
                            </p>
                        )}
                    </div>
                    <Link href={`/ai/prompts/new?template=${id}`}>
                        <Button className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white">
                            <Copy className="h-4 w-4 mr-2" />
                            Use This Template
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Template Details
                            </h2>
                            
                            {template.messages && (
                                <div className="mb-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Messages
                                    </h3>
                                    <pre className="bg-white dark:bg-gray-900 p-4 rounded-lg text-sm overflow-auto max-h-96">
                                        {JSON.stringify(template.messages, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {template.variable_defaults && (
                                <div className="mb-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Variable Defaults
                                    </h3>
                                    <pre className="bg-white dark:bg-gray-900 p-4 rounded-lg text-sm overflow-auto">
                                        {JSON.stringify(template.variable_defaults, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {template.tools && (
                                <div className="mb-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Tools
                                    </h3>
                                    <pre className="bg-white dark:bg-gray-900 p-4 rounded-lg text-sm overflow-auto">
                                        {JSON.stringify(template.tools, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {template.settings && (
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Settings
                                    </h3>
                                    <pre className="bg-white dark:bg-gray-900 p-4 rounded-lg text-sm overflow-auto">
                                        {JSON.stringify(template.settings, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="p-6 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Information
                            </h2>
                            <div className="space-y-3">
                                {template.category && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Category
                                        </p>
                                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                            {template.category}
                                        </Badge>
                                    </div>
                                )}
                                
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        Times Used
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {template.use_count || 0}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        Created
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {formatDate(template.created_at)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        Last Updated
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {formatDate(template.updated_at)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Card>
    );
}


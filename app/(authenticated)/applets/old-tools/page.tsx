// app/(authenticated)/applets/old-tools/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    IconFunction,
    IconSettings,
    IconBrandOpenai,
    IconApi,
    IconPuzzle,
    IconArrowsShuffle,
    IconCode,
    IconDatabase,
    IconWand
} from "@tabler/icons-react";
import Link from "next/link";
import { ToolSection } from "@/types/applets/types";

export default function ToolsAppletPage() {
    const toolSections: ToolSection[] = [
        // Core Tools
        {
            id: 'registered-functions',
            title: 'Registered Functions',
            description: 'Custom functions registered in the system for use in workflows and automations',
            icon: <IconFunction className="w-6 h-6" />,
            link: '/applets/old-tools/registered-functions',
            category: 'core',
            count: 24
        },
        {
            id: 'system-functions',
            title: 'System Functions',
            description: 'Built-in system functions providing core functionality',
            icon: <IconSettings className="w-6 h-6" />,
            link: '/applets/old-tools/system-functions',
            category: 'core',
            badge: 'System'
        },
        {
            id: 'args',
            title: 'Arguments',
            description: 'Manage function arguments and parameters',
            icon: <IconCode className="w-6 h-6" />,
            link: '/applets/old-tools/args',
            category: 'core'
        },
        {
            id: 'ai-old-tools',
            title: 'AI Tools',
            description: 'Artificial Intelligence old-tools and model integrations',
            icon: <IconBrandOpenai className="w-6 h-6" />,
            link: '/applets/old-tools/ai-old-tools',
            category: 'core',
            badge: 'AI'
        },
        {
            id: 'apis',
            title: 'APIs',
            description: 'External API connections and configurations',
            icon: <IconApi className="w-6 h-6" />,
            link: '/applets/old-tools/apis',
            category: 'core'
        },
        {
            id: 'integrations',
            title: 'Integrations',
            description: 'Third-party service integrations and plugins',
            icon: <IconPuzzle className="w-6 h-6" />,
            link: '/applets/old-tools/integrations',
            category: 'core'
        },
        // Connected Features
        {
            id: 'return-brokers',
            title: 'Return Brokers',
            description: 'Data brokers for handling function returns and data flow',
            icon: <IconArrowsShuffle className="w-6 h-6" />,
            link: '/applets/old-tools/return-brokers',
            category: 'connection'
        },
        {
            id: 'recipe-functions',
            title: 'Recipe Functions',
            description: 'Functions that power workflow recipes',
            icon: <IconWand className="w-6 h-6" />,
            link: '/applets/old-tools/recipe-functions',
            category: 'connection',
            badge: 'Recipes'
        }
    ];

    return (
        <div className="container py-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-4">
                    <IconDatabase className="w-10 h-10 text-primary" />
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Tools</h1>
                        <p className="text-xl text-muted-foreground">
                            Manage functions, APIs, and integrations
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Functions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">156</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">23</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Connected APIs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                    </CardContent>
                </Card>
            </div>

            {/* Core Tools Section */}
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Core Tools</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {toolSections
                            .filter(section => section.category === 'core')
                            .map(section => (
                                <Link key={section.id} href={section.link} className="group">
                                    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    {section.icon}
                                                </div>
                                                {section.badge && (
                                                    <Badge variant="secondary">{section.badge}</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="mt-4 flex items-center justify-between">
                                                {section.title}
                                                {section.count && (
                                                    <span className="text-sm text-muted-foreground">
                            {section.count}
                          </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription>{section.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                    </div>
                </div>

                {/* Connected Features Section */}
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Connected Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {toolSections
                            .filter(section => section.category === 'connection')
                            .map(section => (
                                <Link key={section.id} href={section.link} className="group">
                                    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                                    {section.icon}
                                                </div>
                                                {section.badge && (
                                                    <Badge>{section.badge}</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="mt-4">{section.title}</CardTitle>
                                            <CardDescription>{section.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

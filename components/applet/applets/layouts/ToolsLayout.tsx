// components/layouts/ToolsLayout.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AppletConfig } from "@/types/applets/types";
import {toolEntities} from "@/config/applets/tools";

interface ToolsLayoutProps {
    config: AppletConfig;
}

export const ToolsLayout = ({ config }) => {
    // Group entities by category
    const groupedEntities = toolEntities.reduce((acc, entity) => {
        if (!acc[entity.category]) {
            acc[entity.category] = [];
        }
        acc[entity.category].push(entity);
        return acc;
    }, {} as Record<string, typeof toolEntities>);

    return (
        <div className="container py-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-4">
                    {config.icon}
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{config.title}</h1>
                        <p className="text-xl text-muted-foreground">{config.description}</p>
                    </div>
                </div>
            </div>

            {/* Sections by Category */}
            <div className="space-y-8">
                {Object.entries(groupedEntities).map(([category, entities]) => (
                    <div key={category}>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4">
                            {category === 'core' ? 'Core Tools' : 'Connected Features'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {entities.map(entity => (
                                <Link
                                    key={entity.id}
                                    href={`/applets/tools/${entity.id}`}
                                    className="group"
                                >
                                    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    {entity.icon}
                                                </div>
                                                {entity.badge && (
                                                    <Badge variant="secondary">{entity.badge}</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="mt-4 flex items-center justify-between">
                                                {entity.title}
                                                {entity.count && (
                                                    <span className="text-sm text-muted-foreground">
                                                     {entity.count}
                                                  </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription>{entity.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

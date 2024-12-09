// components/ssr/option-cards.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowRight, ListCollapse } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui';
import { getDynamicIconSelection } from "@/utils/getDynamicIcons";
import { OptionCardData } from './types';
import { cn } from '@/utils/cn';
import { resolveStyle } from './utils';

interface OptionCardProps {
    data: OptionCardData;
    basePath: string;
    className?: string;
}

export const OptionCard = async ({ data, basePath, className = '' }: OptionCardProps) => {
    const Icon = data.icon || await getDynamicIconSelection(data.displayName);
    const styles = data.customStyles || {};

    return (
        <Link
            href={`/${basePath}/${data.id}?optionName=${encodeURIComponent(data.displayName)}`}
            className="transition-all duration-300 hover:-translate-y-1 group"
        >
            <Card
                className={cn(
                    "h-full relative overflow-hidden",
                    "bg-gradient-to-br transition-all duration-300",
                    resolveStyle(
                        styles.backgroundColor,
                        "from-background via-background/90 to-background/80"
                    ),
                    resolveStyle(
                        styles.textColor,
                        "text-foreground"
                    ),
                    "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/0 before:to-primary/5 before:opacity-0",
                    "hover:before:opacity-100 hover:shadow-lg",
                    "group-hover:shadow-primary/5",
                    className
                )}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                "bg-gradient-to-br from-primary/10 to-primary/5",
                                "group-hover:from-primary/20 group-hover:to-primary/10"
                            )}>
                                <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{data.displayName}</CardTitle>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                </CardHeader>
                <CardContent>
                    <CardDescription className="line-clamp-2">
                        {data.description}
                    </CardDescription>
                    <div className="mt-4 flex items-center text-sm text-muted-foreground group-hover:text-primary/80 transition-colors">
                        <ListCollapse className="h-4 w-4 mr-2" />
                        View Details
                    </div>
                    {data.additionalFields && Object.keys(data.additionalFields).length > 0 && (
                        <div className="mt-4 space-y-2">
                            {Object.entries(data.additionalFields).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium capitalize">{key}: </span>
                                    <span>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
};

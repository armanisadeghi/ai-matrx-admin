// components/ssr/option-card-header.tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui';
import { OptionCardData } from './types';
import { getDynamicIconSelection } from "@/utils/getDynamicIcons";
import { cn } from '@/utils/cn';
import { resolveStyle } from './utils';

interface OptionCardHeaderProps {
    data: OptionCardData;
    onBack?: () => void;
}

export const OptionCardHeader = async ({ data, onBack }: OptionCardHeaderProps) => {
    const Icon = data.icon || await getDynamicIconSelection(data.displayName);
    const styles = data.customStyles || {};

    return (
        <Card
            className={cn(
                "w-full relative overflow-hidden",
                "bg-gradient-to-r transition-all duration-300",
                resolveStyle(
                    styles.backgroundColor,
                    "from-background via-background/95 to-background/90"
                ),
                resolveStyle(
                    styles.textColor,
                    "text-foreground"
                ),
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:to-primary/5"
            )}
        >
            <CardHeader className="px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className={cn(
                                    "p-2 rounded-full transition-colors",
                                    "hover:bg-primary/10"
                                )}
                            >
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                            </button>
                        )}
                        <div className={cn(
                            "p-3 rounded-lg",
                            "bg-gradient-to-br from-primary/10 to-primary/5"
                        )}>
                            <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{data.displayName}</CardTitle>
                            <CardDescription className="mt-1 max-w-2xl">
                                {data.description}
                            </CardDescription>
                        </div>
                    </div>
                    {data.additionalFields && Object.keys(data.additionalFields).length > 0 && (
                        <div className="hidden lg:flex space-x-6">
                            {Object.entries(data.additionalFields).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium capitalize text-muted-foreground">
                                        {key}:
                                    </span>
                                    <span className="ml-2">
                                        {String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
        </Card>
    );
};

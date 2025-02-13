'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils';
import React from 'react';


interface SingleBrokerSectionUIProps {
    sectionTitle?: string;
    sectionMaxHeight?: string;
    sectionClassName?: string;
    sectionCardClassName?: string;
    sectionCardHeaderClassName?: string;
    sectionCardTitleClassName?: string;
    sectionCardContentClassName?: string;
    isLoading: boolean;
    isComponentsReady: boolean;
    brokerComponent: React.ReactNode;
    isDemo?: boolean;
}

export const SingleBrokerSectionUI = ({
    sectionTitle,
    sectionMaxHeight,
    sectionClassName,
    sectionCardClassName,
    sectionCardHeaderClassName,
    sectionCardTitleClassName,
    sectionCardContentClassName,
    isLoading,
    isComponentsReady,
    brokerComponent,
    isDemo
}: SingleBrokerSectionUIProps) => {

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
    );

    return (
        <div
            className={cn('pt-2 w-full h-full bg-matrx-background', sectionClassName)}
            style={sectionMaxHeight ? { maxHeight: sectionMaxHeight } : undefined}
        >
            <Card className={cn('bg-matrx-background', sectionMaxHeight && 'h-full flex flex-col', sectionCardClassName)}>
                {sectionTitle && (
                    <CardHeader className={cn('p-4', sectionCardHeaderClassName)}>
                        <CardTitle className={cn('text-xl font-bold', sectionCardTitleClassName)}>
                            {isLoading ? (
                                <Skeleton className="h-8 w-48" />
                            ) : (
                                sectionTitle
                            )}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent 
                    className={cn(
                        'grid gap-6 pb-8',
                        sectionMaxHeight && 'flex-1 overflow-auto',
                        sectionCardContentClassName
                    )}
                >
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : isComponentsReady ? (
                        brokerComponent
                    ) : (
                        <LoadingSkeleton />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SingleBrokerSectionUI;
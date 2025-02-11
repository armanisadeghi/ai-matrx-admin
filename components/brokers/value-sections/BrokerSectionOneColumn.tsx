'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils';
import { BROKER_COMPONENTS } from '../value-components';
import { DataBrokerData } from '@/types';

interface DynamicBrokerSectionProps {
    brokers: DataBrokerData[];
    inputComponents: Record<string, any>;
    sectionTitle?: string;
    maxHeight?: string;
    sectionClassName?: string;
    cardClassName?: string;
    cardHeaderClassName?: string;
    cardTitleClassName?: string;
    cardContentClassName?: string;
}

const LoadingSkeleton = () => {
    return (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
    );
};

export const BrokerSectionOneColumn = ({
    brokers,
    inputComponents,
    sectionTitle,
    maxHeight,
    sectionClassName,
    cardClassName,
    cardHeaderClassName,
    cardTitleClassName,
    cardContentClassName,
}: DynamicBrokerSectionProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isComponentsReady, setIsComponentsReady] = useState(false);
    
    // Simulate a loading delay
    useEffect(() => {
        const loadingTimer = setTimeout(() => {
            setIsLoading(false);
        }, 2000); // 2 second delay

        return () => clearTimeout(loadingTimer);
    }, []);

    // Add additional delay for component rendering
    useEffect(() => {
        if (!isLoading) {
            const componentTimer = setTimeout(() => {
                setIsComponentsReady(true);
            }, 500); // 0.5 second additional delay after loading

            return () => clearTimeout(componentTimer);
        }
    }, [isLoading]);
    
    const brokerComponents = useMemo(
        () =>
            brokers.map((broker, index) => {
                const componentInfo = inputComponents[broker.inputComponent];
                const Component = BROKER_COMPONENTS[componentInfo.component];

                if (!Component) {
                    console.warn(`No matching component found for: ${componentInfo.component}`);
                    return null;
                }

                return (
                    <Component
                        key={`broker-${index}`}
                        broker={broker}
                    />
                );
            }),
        [brokers, inputComponents]
    );

    return (
        <div
            className={cn('pt-2 w-full h-full bg-matrx-background', sectionClassName)}
            style={maxHeight ? { maxHeight } : undefined}
        >
            <Card className={cn('bg-matrx-background', maxHeight && 'h-full flex flex-col', cardClassName)}>
                {sectionTitle && (
                    <CardHeader className={cn('p-4', cardHeaderClassName)}>
                        <CardTitle className={cn('text-xl font-bold', cardTitleClassName)}>
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
                        maxHeight && 'flex-1 overflow-auto',
                        cardContentClassName
                    )}
                >
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : isComponentsReady ? (
                        <div className="grid gap-8">{brokerComponents}</div>
                    ) : (
                        <LoadingSkeleton />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BrokerSectionOneColumn;
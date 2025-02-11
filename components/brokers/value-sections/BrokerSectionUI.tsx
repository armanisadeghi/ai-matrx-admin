'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils';
import { DataBrokerData } from '@/app/(authenticated)/tests/broker-value-test/one-column-live/page';

// Types
interface BrokerSectionProps {
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

interface BrokerSectionUIProps extends BrokerSectionProps {
    isLoading: boolean;
    isComponentsReady: boolean;
    brokerComponents: React.ReactNode[];
}


export const BrokerSectionUIOneColumn = ({
    sectionTitle,
    maxHeight,
    sectionClassName,
    cardClassName,
    cardHeaderClassName,
    cardTitleClassName,
    cardContentClassName,
    isLoading,
    isComponentsReady,
    brokerComponents
}: BrokerSectionUIProps) => {
    const LoadingSkeleton = () => (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
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


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
    columns?: number;
}

interface BrokerSectionUIProps extends BrokerSectionProps {
    isLoading: boolean;
    isComponentsReady: boolean;
    brokerComponents: React.ReactNode[];
}

export const BrokerSectionColumnOptions = ({
    sectionTitle,
    maxHeight,
    sectionClassName,
    cardClassName,
    cardHeaderClassName,
    cardTitleClassName,
    cardContentClassName,
    isLoading,
    isComponentsReady,
    brokerComponents,
    columns
}: BrokerSectionUIProps) => {
    const LoadingSkeleton = () => (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
    );

    const getInitialColumnCount = () => {
        // If columns prop is explicitly set, use that
        if (columns !== undefined) return columns;

        // Otherwise, determine based on number of components
        const componentCount = brokerComponents.length;
        
        if (componentCount <= 1) return 1;
        if (componentCount === 2) return 2;
        if (componentCount === 3) return 3;
        if (componentCount <= 5) return 2;
        return 3; // 6 or more components
    };

    const getGridColumns = () => {
        const columnCount = getInitialColumnCount();
        switch (columnCount) {
            case 2:
                return 'grid-cols-2';
            case 3:
                return 'grid-cols-3';
            case 4:
                return 'grid-cols-4';
            case 5:
                return 'grid-cols-5';
            default:
                return 'grid-cols-1';
        }
    };

    return (
        <div
            className={cn('pt-1 w-full h-full bg-matrx-background', sectionClassName)}
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
                        'grid pb-2',
                        maxHeight && 'flex-1 overflow-auto',
                        cardContentClassName
                    )}
                >
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : isComponentsReady ? (
                        <div className={cn("grid gap-4", getGridColumns())}>{brokerComponents}</div>
                    ) : (
                        <LoadingSkeleton />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BrokerSectionColumnOptions;
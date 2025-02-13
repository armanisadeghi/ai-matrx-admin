'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockData } from '../constants/mock-data';
import { BROKER_COMPONENTS } from '../value-components';
import { cn } from '@/utils';

interface DynamicBrokerSectionProps {
    sectionTitle?: string;
    maxHeight?: string;
    sectionClassName?: string;
    sectionCardClassName?: string;
    sectionCardHeaderClassName?: string;
    sectionCardTitleClassName?: string;
    sectionCardContentClassName?: string;
}

export const DynamicBrokerSection = ({
    sectionTitle,
    maxHeight,
    sectionClassName,
    sectionCardClassName,
    sectionCardHeaderClassName,
    sectionCardTitleClassName,
    sectionCardContentClassName,
}: DynamicBrokerSectionProps) => {
    const brokerComponents = useMemo(
        () =>
            Object.keys(mockData.brokers).map((brokerId) => {
                const broker = mockData.brokers[brokerId];
                const componentInfo = mockData.inputComponents[broker.inputComponent];
                const Component = BROKER_COMPONENTS[componentInfo.component];

                if (!Component) {
                    console.warn(`No matching component found for: ${componentInfo.component}`);
                    return null;
                }

                return (
                    <Component
                        key={brokerId}
                        broker={broker}
                        inputComponent={componentInfo}
                    />
                );
            }),
        []
    );

    return (
        <div
            className={cn('pt-2 w-full h-full bg-matrx-background', sectionClassName)}
            style={maxHeight ? { maxHeight } : undefined}
        >
            <Card className={cn('bg-matrx-background', maxHeight && 'h-full flex flex-col', sectionCardClassName)}>
                {sectionTitle && (
                    <CardHeader className={cn('p-4', sectionCardHeaderClassName)}>
                        <CardTitle className={cn('text-xl font-bold', sectionCardTitleClassName)}>{sectionTitle}</CardTitle>
                    </CardHeader>
                )}
                <CardContent className={cn('grid gap-6 pb-8', maxHeight && 'flex-1 overflow-auto', sectionCardContentClassName)}>
                    <div className='grid gap-8 lg:grid-cols-2'>{brokerComponents}</div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DynamicBrokerSection;

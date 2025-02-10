'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/utils';
import { BROKER_COMPONENTS } from '../value-components';

interface DynamicBrokerSectionProps {
    brokers: Record<string, any>;
    inputComponents: Record<string, any>;
    sectionTitle?: string;
    maxHeight?: string;
    sectionClassName?: string;
    cardClassName?: string;
    cardHeaderClassName?: string;
    cardTitleClassName?: string;
    cardContentClassName?: string;
}

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
    const brokerComponents = useMemo(
        () =>
            Object.keys(brokers).map((brokerId) => {
                const broker = brokers[brokerId];
                const componentInfo = inputComponents[broker.inputComponent];
                const Component = BROKER_COMPONENTS[componentInfo.component];

                if (!Component) {
                    console.warn(`No matching component found for: ${componentInfo.component}`);
                    return null;
                }

                return (
                    <Component
                        key={brokerId}
                        brokerId={brokerId}
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
            <Card className={cn('bg-matrx-background', maxHeight && 'h-full flex flex-col', cardClassName)}>
                {sectionTitle && (
                    <CardHeader className={cn('p-4', cardHeaderClassName)}>
                        <CardTitle className={cn('text-xl font-bold', cardTitleClassName)}>{sectionTitle}</CardTitle>
                    </CardHeader>
                )}
                <CardContent className={cn('grid gap-6 pb-8', maxHeight && 'flex-1 overflow-auto', cardContentClassName)}>
                    <div className='grid gap-8'>{brokerComponents}</div>
                </CardContent>
            </Card>
        </div>
    );
};
export default BrokerSectionOneColumn;

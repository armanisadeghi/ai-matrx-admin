'use client';

import { useMemo, useState, useEffect } from 'react';
import { BROKER_COMPONENTS } from '../value-components';
import { DataBrokerData } from '@/app/(authenticated)/tests/broker-value-test/one-column-live/page';
import { BrokerSectionUIOneColumn } from './BrokerSectionUI';


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


export const BrokerSectionOneColumn = (props: BrokerSectionProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isComponentsReady, setIsComponentsReady] = useState(false);
    
    useEffect(() => {
        const loadingTimer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // 1 second delay

        return () => clearTimeout(loadingTimer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            const componentTimer = setTimeout(() => {
                setIsComponentsReady(true);
            }, 500);

            return () => clearTimeout(componentTimer);
        }
    }, [isLoading]);
    
    const brokerComponents = useMemo(
        () =>
            props.brokers.map((broker, index) => {
                const componentInfo = props.inputComponents[broker.inputComponent];
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
        [props.brokers, props.inputComponents]
    );

    return (
        <BrokerSectionUIOneColumn
            {...props}
            isLoading={isLoading}
            isComponentsReady={isComponentsReady}
            brokerComponents={brokerComponents}
        />
    );
};

export default BrokerSectionOneColumn;

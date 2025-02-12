'use client';

import { useMemo, useState, useEffect } from 'react';
import { BROKER_COMPONENTS } from '../value-components';
import { DataBrokerData } from '@/app/(authenticated)/tests/broker-value-test/one-column-live/page';
import SingleBrokerSectionUI from './SingleBrokerSectionUI';


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

export const SingleBrokerSection = (props: BrokerSectionProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isComponentsReady, setIsComponentsReady] = useState(false);
    
    useEffect(() => {
        const loadingTimer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

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
    
    const brokerComponent = useMemo(() => {
        // Only process the first broker in the array
        if (props.brokers.length === 0) {
            console.warn('No brokers provided');
            return null;
        }

        const broker = props.brokers[0];
        const componentInfo = props.inputComponents[broker.inputComponent];
        const Component = BROKER_COMPONENTS[componentInfo.component];

        if (!Component) {
            console.warn(`No matching component found for: ${componentInfo.component}`);
            return null;
        }

        return <Component broker={broker} />;
    }, [props.brokers, props.inputComponents]);

    return (
        <SingleBrokerSectionUI
            {...props}
            isLoading={isLoading}
            isComponentsReady={isComponentsReady}
            brokerComponent={brokerComponent}
        />
    );
};

export default SingleBrokerSection;
"use client";

import { BROKER_COMPONENTS } from "../../value-components";
import SingleBrokerSectionUI from "./SingleBrokerSectionUI";
import { DataBrokerDataWithKey, DataInputComponent } from "../../types";

interface BrokerSectionProps {
    componentInfo: DataInputComponent;
    broker?: DataBrokerDataWithKey;
    sectionTitle?: string;
    sectionMaxHeight?: string;
    sectionClassName?: string;
    sectionCardClassName?: string;
    sectionCardHeaderClassName?: string;
    sectionCardTitleClassName?: string;
    sectionCardContentClassName?: string;
    isDemo?: boolean;
}

export const brokerComponentRenderer = (componentInfo: DataInputComponent, isDemo: boolean) => {
    const Component = BROKER_COMPONENTS[componentInfo.component];
    return Component ? <Component inputComponent={componentInfo} isDemo={isDemo} /> : null;
};



export const SingleBrokerSection = (props: BrokerSectionProps) => {

    const brokerComponent = brokerComponentRenderer(props.componentInfo, props.isDemo);

    if (!brokerComponent) {
        return null;
    }

    return (
        <SingleBrokerSectionUI
            sectionTitle={props.sectionTitle}
            sectionMaxHeight={props.sectionMaxHeight}
            sectionClassName={props.sectionClassName}
            sectionCardClassName={props.sectionCardClassName}
            sectionCardHeaderClassName={props.sectionCardHeaderClassName}
            sectionCardTitleClassName={props.sectionCardTitleClassName}
            sectionCardContentClassName={props.sectionCardContentClassName}
            brokerComponent={brokerComponent}
            isLoading={false}
            isComponentsReady={true}
            isDemo={props.isDemo}
        />
    );
};

export default SingleBrokerSection;

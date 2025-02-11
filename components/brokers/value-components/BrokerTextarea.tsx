import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { withBrokerInput } from '../wrappers/withMockBrokerInput';

export const BrokerTextarea = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent,
}) => {
    return (
        <Textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={inputComponent.placeholder}
            className={inputComponent.componentClassName}
        />
    );
});

export default BrokerTextarea;
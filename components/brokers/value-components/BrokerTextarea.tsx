import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";
import { cn } from "@/utils";


export const BrokerTextarea = withBrokerComponentWrapper(({ value, onChange, inputComponent, isDemo, ...rest }) => {
    const className = inputComponent.componentClassName 
    return (
        <div className='w-full h-full px-2 items-center justify-center'>
            <Textarea
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={inputComponent.placeholder}
                className={cn(className)}
            />
        </div>
    );
});

export default BrokerTextarea;

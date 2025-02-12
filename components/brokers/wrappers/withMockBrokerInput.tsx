import { DataInputComponentData } from "@/types";
import { cn } from "@nextui-org/react";
import { DataBrokerDataWithKey, useBrokerValue } from "../hooks/useBrokerValue";
import { withBrokerForComponentCreation } from "./WithBrokerForComponents";
import { withStandardBrokerInput } from "./withBrokerInput";


export const withBrokerInput = (Component, options = { isDemo: true }) => {

    console.log('withBrokerInput options:', options);
    console.log('withBrokerInput Component:', Component);
    console.log('withBrokerInput options.isDemo:', options.isDemo);

    if (options.isDemo) {
        return withBrokerForComponentCreation(Component);
    }
    return withStandardBrokerInput(Component);
};

export type BrokerInputProps = {
    broker?: DataBrokerDataWithKey;
    className?: string;
    // Add any other common props here
};

export const withBrokerCustomInput = <P extends object>(
    WrappedComponent: React.ComponentType<
        P & {
            value: any;
            onChange: (value: any) => void;
            broker: DataBrokerDataWithKey;
            inputComponent: DataInputComponentData;
        }
    >
) => {
    return function BrokerInput({ broker, className, ...props }: BrokerInputProps & Omit<P, 'value' | 'onChange' | 'broker' | 'inputComponent'>) {
        const { value, setValue, inputComponent } = useBrokerValue(broker);

        return (
            <div className={cn('space-y-2', inputComponent.containerClassName || '', className)}>
                <WrappedComponent
                    value={value}
                    onChange={setValue}
                    broker={broker}
                    inputComponent={inputComponent}
                    {...(props as P)}
                />
            </div>
        );
    };
};

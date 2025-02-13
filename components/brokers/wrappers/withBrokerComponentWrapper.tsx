import { BrokerInputProps, DataBrokerDataWithKey, DataInputComponent } from "@/components/brokers/types";
import { cn } from "@nextui-org/react";
import { useBrokerValue } from "../hooks/useBrokerValue";
import { withComponentWrapperForCreation } from "./withComponentWrapperForCreation";
import { withStandardBrokerComponentWrapper } from "./withStandardBrokerComponentWrapper";

export const withBrokerComponentWrapper = (Component: any) => {
    return (props: any) => {
        const { isDemo, ...rest } = props;

        if (isDemo) {
            const WrappedComponent = withComponentWrapperForCreation(Component);
            return <WrappedComponent {...rest} />;
        }
        const WrappedComponent = withStandardBrokerComponentWrapper(Component);
        return <WrappedComponent {...rest} />;
    };
};

export const withBrokerCustomInput = <P extends object>(
    WrappedComponent: React.ComponentType<
        P & {
            value: any;
            onChange: (value: any) => void;
            broker: DataBrokerDataWithKey;
            inputComponent: DataInputComponent;
        }
    >
) => {
    return function BrokerInput({
        broker,
        isDemo,
        className,
        ...props
    }: BrokerInputProps & Omit<P, "value" | "onChange" | "broker" | "inputComponent">) {
        const { value, setValue, inputComponent } = useBrokerValue(broker);

        return (
            <div className={cn("space-y-1", inputComponent.containerClassName || "", className)}>
                <WrappedComponent value={value} onChange={setValue} broker={broker} inputComponent={inputComponent} {...(props as P)} />
            </div>
        );
    };
};

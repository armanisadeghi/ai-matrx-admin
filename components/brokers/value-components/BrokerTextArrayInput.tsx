import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";
import TextArrayInput from '@/components/ui/matrx/TextArrayInput';
import { cn } from "@/utils";

export const BrokerTextArrayInput = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const arrayValue = Array.isArray(value) ? value : (value ? [value] : []);
    const chipClassName = inputComponent.additionalParams?.chipClassName;
    const className = inputComponent.componentClassName;

    return (
        <TextArrayInput
            value={arrayValue}
            onChange={onChange}
            placeholder={inputComponent.placeholder}
            showCopyIcon={false}
            chipClassName={chipClassName}
            className={cn(className)}
        />
    );
});

export default BrokerTextArrayInput;
// components/common/crud/SmartCrudButtons.tsx

import {SmartCrudWrapper, SmartCrudWrapperProps} from "./SmartCrudWrapper";
import {cn} from "@/utils/cn";

interface SmartCrudButtonsProps extends Omit<SmartCrudWrapperProps, 'children'> {
    containerClassName?: string;
}

export const SmartCrudButtons = (
    {
        entityKey,
        options,
        layout,
        className,
        containerClassName
    }: SmartCrudButtonsProps) => {
    return (
        <div className={cn("min-w-0 w-full", containerClassName)}>
            <SmartCrudWrapper
                entityKey={entityKey}
                options={options}
                layout={layout}
                className={className}
            />
        </div>
    );
};

export default SmartCrudButtons;

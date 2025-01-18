// components/common/crud/SmartCrudButtons.tsx

import { UnifiedLayoutProps } from "../../types";
import {SmartCrudWrapper, SmartCrudWrapperProps} from "./SmartCrudWrapper";
import {cn} from "@/utils/cn";

interface SmartCrudButtonsProps extends Omit<SmartCrudWrapperProps, 'children'> {
    containerClassName?: string;
    unifiedLayoutProps?: UnifiedLayoutProps;
}

export const SmartCrudButtons = (
    {
        entityKey,
        recordId,
        options,
        layout,
        className,
        containerClassName,
        unifiedLayoutProps,
    }: SmartCrudButtonsProps) => {
    return (
        <div className={cn("min-w-0 w-full", containerClassName)}>
            <SmartCrudWrapper
                entityKey={entityKey}
                recordId={recordId}
                options={options}
                layout={layout}
                className={className}
                unifiedLayoutProps={unifiedLayoutProps}
            />
        </div>
    );
};

export default SmartCrudButtons;

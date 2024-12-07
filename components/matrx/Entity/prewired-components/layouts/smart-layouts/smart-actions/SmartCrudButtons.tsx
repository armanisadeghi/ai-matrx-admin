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
        <div className={cn("flex", containerClassName)}>
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

/*
// 2. As insertable buttons:
const MyCustomLayout = () => (
    <div className="space-y-4">
        <h1>My Form</h1>
        <SmartCrudButtons
            entityKey="users"
            options={{
                allowCreate: true,
                allowEdit: true,
                allowDelete: true
            }}
            layout={{
                buttonLayout: 'row',
                buttonSize: 'sm'
            }}
            className="mb-4"
        />
        <MyFormComponent/>
    </div>
);*/

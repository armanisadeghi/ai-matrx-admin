// components/common/crud/SmartCrudWrapper.tsx
import {EntityKeys} from "@/types/entityTypes";
import {ReactNode} from "react";
import SmartNewButton from "./SmartNewButton";
import SmartEditButton from "./SmartEditButton";
import SmartSaveButton from "./SmartSaveButton";
import SmartCancelButton from "./SmartCancelButton";
import SmartDeleteButton from "./SmartDeleteButton";
import {cn} from "@/lib/utils";

export interface SmartCrudWrapperProps {
    entityKey: EntityKeys;
    children?: ReactNode;  // Make children optional
    options?: {
        allowCreate?: boolean;
        allowEdit?: boolean;
        allowDelete?: boolean;
        showConfirmation?: boolean;
    };
    layout?: {
        buttonsPosition?: 'top' | 'bottom' | 'left' | 'right';
        buttonLayout?: 'row' | 'column';
        buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
        buttonSpacing?: 'compact' | 'normal' | 'comfortable';
    };
    className?: string;
}

export const SmartCrudWrapper = (
    {
        entityKey,
        children,
        options = {
            allowCreate: true,
            allowEdit: true,
            allowDelete: true,
            showConfirmation: true
        },
        layout = {
            buttonsPosition: 'top',
            buttonLayout: 'row',
            buttonSize: 'default',
            buttonSpacing: 'normal'
        },
        className
    }: SmartCrudWrapperProps) => {
    const ButtonContainer = ({children}: { children: ReactNode }) => (
        <div className={cn(
            "flex gap-2",
            layout.buttonLayout === 'column' && "flex-col",
            layout.buttonSpacing === 'compact' && "gap-1",
            layout.buttonSpacing === 'comfortable' && "gap-4",
        )}>
            {children}
        </div>
    );

    const buttons = (
        <ButtonContainer>
            {options.allowCreate && (
                <SmartNewButton
                    entityKey={entityKey}
                    size={layout.buttonSize}
                />
            )}
            {options.allowEdit && (
                <SmartEditButton
                    entityKey={entityKey}
                    size={layout.buttonSize}
                />
            )}
            <SmartSaveButton
                entityKey={entityKey}
                size={layout.buttonSize}
                showConfirmation={options.showConfirmation}
            />
            <SmartCancelButton
                entityKey={entityKey}
                size={layout.buttonSize}
            />
            {options.allowDelete && (
                <SmartDeleteButton
                    entityKey={entityKey}
                    size={layout.buttonSize}
                />
            )}
        </ButtonContainer>
    );

    // If no children, just return the buttons
    if (!children) {
        return buttons;
    }

    // Otherwise return the full layout
    return (
        <div className={cn(
            "flex",
            layout.buttonsPosition === 'left' && "flex-row",
            layout.buttonsPosition === 'right' && "flex-row-reverse",
            layout.buttonsPosition === 'bottom' && "flex-col-reverse",
            layout.buttonsPosition === 'top' && "flex-col",
            className
        )}>
            {['top', 'left'].includes(layout.buttonsPosition) && buttons}
            <div className={cn(
                "flex-1",
                ['left', 'right'].includes(layout.buttonsPosition) && "ml-4"
            )}>
                {children}
            </div>
            {['bottom', 'right'].includes(layout.buttonsPosition) && buttons}
        </div>
    );
};

export default SmartCrudWrapper;

/*
// Usage examples:
// 1. As a wrapper:
const MyFormWithCrud = () => (
    <SmartCrudWrapper
        entityKey="users"
        options={{
            allowCreate: true,
            allowEdit: true,
            allowDelete: false,
            showConfirmation: true
        }}
        layout={{
            buttonsPosition: 'top',
            buttonLayout: 'row',
            buttonSize: 'default',
            buttonSpacing: 'normal'
        }}
    >
        <MyFormComponent/>
    </SmartCrudWrapper>
);
*/


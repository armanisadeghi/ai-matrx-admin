// components/common/crud/SmartCrudWrapper.tsx
import {EntityKeys} from "@/types/entityTypes";
import {ReactNode} from "react";
import SmartNewButton from "./SmartNewButton";
import SmartEditButton from "./SmartEditButton";
import SmartSaveButton from "./SmartSaveButton";
import SmartCancelButton from "./SmartCancelButton";
import SmartDeleteButton from "./SmartDeleteButton";
import {cn} from "@/lib/utils";
import {ComponentDensity, ComponentSize} from "@/types/componentConfigTypes";

export interface SmartCrudWrapperProps {
    entityKey: EntityKeys;
    children?: ReactNode;
    options?: {
        allowCreate?: boolean;
        allowEdit?: boolean;
        allowDelete?: boolean;
        showConfirmation?: boolean;
    };
    layout?: {
        buttonsPosition?: 'top' | 'bottom' | 'left' | 'right';
        buttonLayout?: 'row' | 'column';
        buttonSize?: ComponentSize;
        buttonSpacing?: ComponentDensity;
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
    const getButtonsWithProps = (hideText: boolean = false) => (
        <>
            {options.allowCreate && (
                <SmartNewButton
                    entityKey={entityKey}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            {options.allowEdit && (
                <SmartEditButton
                    entityKey={entityKey}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            <SmartSaveButton
                entityKey={entityKey}
                size={hideText ? 'icon' : layout.buttonSize}
                hideText={hideText}
                showConfirmation={options.showConfirmation}
            />
            <SmartCancelButton
                entityKey={entityKey}
                size={hideText ? 'icon' : layout.buttonSize}
                hideText={hideText}
            />
            {options.allowDelete && (
                <SmartDeleteButton
                    entityKey={entityKey}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
        </>
    );

    const ButtonContainer = () => (
        <div className="@container">
            <div className={cn(
                "flex flex-wrap",
                layout.buttonLayout === 'column' ? "flex-col" : "flex-row",
                layout.buttonSpacing === 'compact' ? "gap-1" :
                layout.buttonSpacing === 'comfortable' ? "gap-4" : "gap-2",
                "@[400px]:hidden"
            )}>
                {getButtonsWithProps(false)}
            </div>
            <div className={cn(
                "hidden flex-wrap",
                layout.buttonLayout === 'column' ? "flex-col" : "flex-row",
                layout.buttonSpacing === 'compact' ? "gap-1" :
                layout.buttonSpacing === 'comfortable' ? "gap-4" : "gap-2",
                "@container (max-width: 400px):flex"
            )}>
                {getButtonsWithProps(true)}
            </div>
        </div>
    );

    if (!children) {
        return <ButtonContainer/>;
    }

    return (
        <div className={cn(
            "flex min-w-0",
            {
                "flex-row gap-4": layout.buttonsPosition === 'left',
                "flex-row-reverse gap-4": layout.buttonsPosition === 'right',
                "flex-col-reverse gap-2": layout.buttonsPosition === 'bottom',
                "flex-col gap-2": layout.buttonsPosition === 'top',
            },
            className
        )}>
            {['top', 'left'].includes(layout.buttonsPosition) && <ButtonContainer/>}
            <div className="min-w-0 flex-1">
                {children}
            </div>
            {['bottom', 'right'].includes(layout.buttonsPosition) && <ButtonContainer/>}
        </div>
    );
};

export default SmartCrudWrapper;

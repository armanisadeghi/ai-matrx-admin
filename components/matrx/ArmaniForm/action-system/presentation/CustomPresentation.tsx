import React from "react";
import {PresentationComponent, PresentationProps} from "./types";
import {cn} from "@/lib/utils";
import {
    getPresentationClasses,
    getPresentationHandlers,
    PresentationHeader,
    PresentationButtons,
    defaultConfig
} from "./common";


interface CustomRenderProps {
    isOpen: boolean;
    onOpenChange: (state: boolean) => void;
    trigger: React.ReactNode;
    renderWrapper: (children: React.ReactNode) => JSX.Element;
}


interface CustomPresentationProps extends Omit<PresentationProps, 'content'> {
    content: React.ReactNode | ((props: CustomRenderProps) => React.ReactNode);
}

export const CustomPresentation: React.FC<CustomPresentationProps> = (
    {
        trigger,
        content,
        variant = "default",
        title,
        description,
        helpSource,
        className,
        config = defaultConfig,
        controls,
        onOpenChange,
    }) => {
    const [internalOpen, setInternalOpen] = React.useState(false);

    const handleStateChange = React.useCallback((newState: boolean) => {
        setInternalOpen(newState);
        onOpenChange?.(newState);
    }, [onOpenChange]);

    React.useEffect(() => {
        return () => onOpenChange?.(false);
    }, [onOpenChange]);

    const renderWrapper = (children: React.ReactNode) => (
        <div
            className={cn(
                getPresentationClasses(config, className),
                `matrx-density-${config?.density || "normal"}`
            )}
            {...getPresentationHandlers(config, handleStateChange)}
        >
            <PresentationHeader
                title={title}
                description={description}
                helpSource={helpSource}
            />
            <div className="matrx-content">
                {children}
            </div>
            <PresentationButtons
                controls={controls}
                variant={variant}
                onOpenChange={handleStateChange}
            />
        </div>
    );

    if (typeof content === 'function') {
        return content({
            isOpen: internalOpen,
            onOpenChange: handleStateChange,
            trigger,
            renderWrapper
        }) as JSX.Element;
    }

    return renderWrapper(
        <>
            <div onClick={() => handleStateChange(true)}>
                {trigger}
            </div>
            {content}
        </>
    );
};

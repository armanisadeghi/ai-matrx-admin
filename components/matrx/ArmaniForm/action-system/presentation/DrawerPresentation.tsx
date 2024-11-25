import React from "react";
import {
    SideDrawer,
    BottomDrawer,
    CenterDrawer
} from "@/components/matrx/ArmaniForm/field-components/EntityDrawer";
import {PresentationComponent} from "./types";
import {cn} from "@/lib/utils";
import {
    defaultConfig,
    getPresentationClasses,
    getPresentationHandlers,
    PresentationButtons,
    PresentationHeader
} from "./common";

export const DrawerPresentation: PresentationComponent = (
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
    const [open, setOpen] = React.useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        onOpenChange?.(isOpen);
    };

    const DrawerComponent = React.useMemo(() => {
        switch (config?.position) {
            case "bottom":
                return BottomDrawer;
            case "center":
                return CenterDrawer;
            case "left":
            case "right":
            default:
                return SideDrawer;
        }
    }, [config?.position]);

    return (
        <DrawerComponent
            open={open}
            trigger={trigger}
            onOpenChange={handleOpenChange}
            className={getPresentationClasses(config, className)}
            side={config?.position === "left" ? "left" : "right"}
            size={config?.size}
            {...getPresentationHandlers(config, handleOpenChange)}
        >
            <PresentationHeader
                title={title}
                description={description}
                helpSource={helpSource}
            />

            <div className={cn(
                "matrx-content",
                `matrx-density-${config?.density || "normal"}`
            )}>
                {content}
            </div>

            <PresentationButtons
                controls={controls}
                variant={variant}
                onOpenChange={handleOpenChange}
            />
        </DrawerComponent>
    );
};

// If you need direct access to specific drawer types
export const SideDrawerPresentation: PresentationComponent = (props) => (
    <DrawerPresentation {...props} config={{...props.config, position: "right"}}/>
);

export const BottomDrawerPresentation: PresentationComponent = (props) => (
    <DrawerPresentation {...props} config={{...props.config, position: "bottom"}}/>
);

export const CenterDrawerPresentation: PresentationComponent = (props) => (
    <DrawerPresentation {...props} config={{...props.config, position: "center"}}/>
);

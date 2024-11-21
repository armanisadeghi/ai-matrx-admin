// components/matrx/ArmaniForm/field-components/EntityDrawer.tsx
import React from "react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

interface BaseDrawerProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger: React.ReactNode;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    showFooter?: boolean;
}

// Base Bottom Drawer
export function BottomDrawer(
    {
        open,
        onOpenChange,
        trigger,
        title,
        description,
        children,
        className,
        showFooter = true,
    }: BaseDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                {trigger}
            </DrawerTrigger>
            <DrawerContent className={cn("inset-x-0 bottom-0", className)}>
                {(title || description) && (
                    <DrawerHeader>
                        {title && <DrawerTitle>{title}</DrawerTitle>}
                        {description && <DrawerDescription>{description}</DrawerDescription>}
                    </DrawerHeader>
                )}
                <div className="px-4">
                    {children}
                </div>
                {showFooter && (
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

// Side Drawer
export function SideDrawer(
    {
        open,
        onOpenChange,
        trigger,
        title,
        description,
        children,
        className,
        showFooter = true,
    }: BaseDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                {trigger}
            </DrawerTrigger>
            <DrawerContent
                className={cn(
                    "inset-y-0 right-0 h-full w-[400px] flex flex-col",
                    className
                )}
            >
                {(title || description) && (
                    <DrawerHeader>
                        {title && <DrawerTitle>{title}</DrawerTitle>}
                        {description && <DrawerDescription>{description}</DrawerDescription>}
                    </DrawerHeader>
                )}
                <div className="flex-1 overflow-y-auto px-4">
                    {children}
                </div>
                {showFooter && (
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

// Center Drawer
export function CenterDrawer(
    {
        open,
        onOpenChange,
        trigger,
        title,
        description,
        children,
        className,
        showFooter = true,
    }: BaseDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                {trigger}
            </DrawerTrigger>
            <DrawerContent
                className={cn(
                    "fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[500px] rounded-lg",
                    className
                )}
            >
                {(title || description) && (
                    <DrawerHeader>
                        {title && <DrawerTitle>{title}</DrawerTitle>}
                        {description && <DrawerDescription>{description}</DrawerDescription>}
                    </DrawerHeader>
                )}
                <div className="px-4">
                    {children}
                </div>
                {showFooter && (
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

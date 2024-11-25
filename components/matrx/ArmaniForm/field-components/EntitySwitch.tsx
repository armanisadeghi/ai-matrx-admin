"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/utils/cn"
import {EntityField, MatrxVariant} from './types'

type AnimationPreset = 'none' | 'fade' | 'slide' | 'bounce';

interface EntitySwitchProps {
    field: EntityField;
    value?: boolean;
    onChange?: (checked: boolean) => void;
    className?: string;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const variants = {
    default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    primary: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/30",
    secondary: "data-[state=checked]:bg-secondary data-[state=unchecked]:bg-secondary/30",
    destructive: "data-[state=checked]:bg-destructive data-[state=unchecked]:bg-destructive/30",
    success: "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-green-500/30",
    outline: "border-2 data-[state=checked]:bg-background data-[state=unchecked]:bg-background",
    ghost: "data-[state=checked]:bg-background/50 data-[state=unchecked]:bg-background/20",
    link: "data-[state=checked]:bg-primary/50 data-[state=unchecked]:bg-primary/20",
}

const sizes = {
    xs: "h-3 w-6",
    sm: "h-4 w-7",
    default: "h-5 w-9",
    md: "h-5 w-9",
    lg: "h-6 w-11",
    xl: "h-7 w-12",
    "2xl": "h-8 w-14",
    "3xl": "h-9 w-16",
}

const thumbSizes = {
    xs: "h-2 w-2 data-[state=checked]:translate-x-3",
    sm: "h-3 w-3 data-[state=checked]:translate-x-3",
    default: "h-4 w-4 data-[state=checked]:translate-x-4",
    md: "h-4 w-4 data-[state=checked]:translate-x-4",
    lg: "h-5 w-5 data-[state=checked]:translate-x-5",
    xl: "h-6 w-6 data-[state=checked]:translate-x-5",
    "2xl": "h-7 w-7 data-[state=checked]:translate-x-6",
    "3xl": "h-8 w-8 data-[state=checked]:translate-x-7",
}

const densityClasses = {
    compact: 'my-1',
    normal: 'my-2',
    comfortable: 'my-3'
}

const animationClasses = {
    none: '',
    fade: 'transition-opacity',
    slide: 'transition-transform',
    bounce: 'animate-bounce'
}

const EntitySwitch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    EntitySwitchProps
>(({
       className,
       field,
       value,
       onChange,
       density = 'normal',
       animationPreset = 'none',
       variant = 'default',
       size = 'default',
       ...props
   }, ref) => {
    const handleChange = (checked: boolean) => {
        if (onChange) {
            onChange(checked);
        }
        if (field?.onChange) {
            field.onChange(checked);
        }
    };

    return (
        <div className={cn(
            "flex items-center gap-2 flex-wrap",
            densityClasses[density]
        )}>
            {field?.name && (
                <label
                    htmlFor={field.name}
                    className="text-lg font-medium text-foreground"
                >
                    {field.name}
                </label>
            )}
            <SwitchPrimitives.Root
                id={field?.name}
                ref={ref}
                checked={value ?? field?.value}
                onCheckedChange={handleChange}
                className={cn(
                    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    variants[variant as keyof typeof variants],
                    sizes[size],
                    animationClasses[animationPreset],
                    className
                )}
                {...props}
            >
                <SwitchPrimitives.Thumb
                    className={cn(
                        "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0",
                        thumbSizes[size]
                    )}
                />
            </SwitchPrimitives.Root>
            {field?.description && (
                <p className="text-md text-muted-foreground mt-1 w-full">
                    {field.description}
                </p>
            )}
        </div>
    )
})
EntitySwitch.displayName = SwitchPrimitives.Root.displayName

export default EntitySwitch

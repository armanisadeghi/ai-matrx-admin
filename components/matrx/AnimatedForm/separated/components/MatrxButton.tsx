// components/MatrxButton.tsx
'use client';
import React from "react";
import {motion, HTMLMotionProps} from "framer-motion";
import {cn} from "@/utils/cn";
import {Loader2} from "lucide-react";
import {MatrxButtonProps} from "../../../../../types/componentConfigTypes";
import {getComponentStyles, useComponentAnimation} from "../../../../../config/ui/FlexConfig";

type CombinedButtonProps = MatrxButtonProps & Omit<HTMLMotionProps<"button">, keyof MatrxButtonProps>;

const MatrxButton: React.FC<CombinedButtonProps> = (
    {
        children,
        className,
        disabled = false,
        busy = false,
        size = 'md',
        density = 'normal',
        variant = 'default',
        animation = 'smooth',
        disableAnimation = false,
        state = busy ? 'loading' : disabled ? 'disabled' : 'idle',
        iconLeft,
        iconRight,
        type = 'button',
        onClick,
        ...props
    }) => {
    const animationProps = useComponentAnimation(animation, disableAnimation || disabled);
    const isDisabled = disabled || busy;

    return (
        <motion.button
            type={type}
            disabled={isDisabled}
            onClick={!isDisabled ? onClick : undefined}
            className={cn(
                getComponentStyles({size, density, variant, state, disabled: isDisabled}),
                "relative inline-flex items-center justify-center gap-2",
                className
            )}
            {...animationProps}
            {...props}
        >
            {busy && (
                <Loader2 className="h-4 w-4 animate-spin"/>
            )}
            {!busy && iconLeft}
            {children}
            {!busy && iconRight}
        </motion.button>
    );
};

export default MatrxButton;

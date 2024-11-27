"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMotionTemplate, useMotionValue, motion } from "framer-motion";
import { MatrxVariant } from './types';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: MatrxVariant;
}

const getVariantStyles = (variant: MatrxVariant = 'default') => {
    const baseStyles = `flex h-10 w-full border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent 
    file:text-sm file:font-medium placeholder:text-neutral-400 dark:placeholder-text-neutral-600 
    focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600
    disabled:cursor-not-allowed disabled:opacity-50
    dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]
    group-hover/input:shadow-none transition duration-400`;

    switch (variant) {
        case 'destructive':
            return `${baseStyles} bg-destructive text-destructive-foreground`;
        case 'outline':
            return `${baseStyles} border-2`;
        case 'secondary':
            return `${baseStyles} bg-secondary text-secondary-foreground`;
        case 'ghost':
            return `${baseStyles} bg-transparent shadow-none`;
        case 'link':
            return `${baseStyles} bg-transparent underline-offset-4 hover:underline`;
        case 'primary':
            return `${baseStyles} bg-primary text-primary-foreground`;
        default:
            return baseStyles;
    }
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, variant = 'default', ...props }, ref) => {
        const radius = 100;
        const [visible, setVisible] = React.useState(false);
        let mouseX = useMotionValue(0);
        let mouseY = useMotionValue(0);

        function handleMouseMove({ currentTarget, clientX, clientY }: any) {
            let { left, top } = currentTarget.getBoundingClientRect();
            mouseX.set(clientX - left);
            mouseY.set(clientY - top);
        }

        return (
            <motion.div
                style={{
                    background: useMotionTemplate`
        radial-gradient(
          ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
          var(--blue-500),
          transparent 80%
        )
      `,
                }}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                className="p-[2px] rounded-lg transition duration-300 group/input"
            >
                <input
                    type={type}
                    className={cn(getVariantStyles(variant), className)}
                    ref={ref}
                    {...props}
                />
            </motion.div>
        );
    }
);
Input.displayName = "Input";

const BasicInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, variant = 'default', ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
BasicInput.displayName = "BasicInput"

interface InputWithPrefixProps extends Omit<InputProps, 'prefix'> {
    prefix?: React.ReactNode;
    wrapperClassName?: string;
}

const InputWithPrefix = React.forwardRef<HTMLInputElement, InputWithPrefixProps>(
    ({ prefix, className, wrapperClassName, ...props }, ref) => {
        return (
            <div className={cn("relative", wrapperClassName)}>
                {prefix && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {prefix}
                    </div>
                )}
                <Input
                    ref={ref}
                    className={cn(prefix && "pl-10", className)}
                    {...props}
                />
            </div>
        );
    }
);
InputWithPrefix.displayName = "InputWithPrefix";

export { Input, BasicInput, InputWithPrefix  };

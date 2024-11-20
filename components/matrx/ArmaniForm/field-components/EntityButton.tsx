// components/matrx/ArmaniForm/field-components/EntityButton.tsx
'use client';
import React from "react";
import { motion, MotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";



const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                primary:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90", // Alias for default
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
                outline:
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-8",
                icon: "h-9 w-9",

                m: "h-9 px-4 py-2",
                l: "h-10 px-6 py-2",
                xl: "h-12 px-8 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    icon?: React.ReactNode; // Icon prop for adding an icon
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };









const EntityButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps & MotionProps & { disabled?: boolean }> = (
    {
        children,
        className,
        disabled = false,
        icon,
        ...props
    }) => (
    <motion.button
        whileHover={disabled ? undefined : { scale: 1.05 }} // Disable hover effect when disabled
        whileTap={disabled ? undefined : { scale: 0.95 }} // Disable tap effect when disabled
        disabled={disabled} // Apply disabled to button
        className={cn(
            "px-4 py-2 bg-primary text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            className // Combine classNames
        )}
        {...props}
    >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
    </motion.button>
);

export default EntityButton;

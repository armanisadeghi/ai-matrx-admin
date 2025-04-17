import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Define a union type for all possible size values
export type ButtonSize =
    | "default"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "icon"
    | "roundIcon"
    | "m"  // Keeping legacy sizes for backward compatibility
    | "l";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
                success: "bg-green-500 dark:bg-green-600 text-white shadow-sm hover:bg-green-600 dark:hover:bg-green-700",
                outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                xs: "h-7 rounded-md px-1 text-xs",
                sm: "h-8 rounded-md px-3 text-xs",
                md: "h-9 px-4 py-2",
                lg: "h-10 rounded-md px-8",
                xl: "h-12 px-8 py-3 text-base",
                "2xl": "h-14 px-10 py-3 text-base",
                "3xl": "h-16 px-12 py-3 text-base",
                icon: "h-10 w-10",
                roundIcon: "h-8 w-8 rounded-full p-0",  // Added roundIcon style
                // Legacy sizes
                m: "h-9 px-4 py-2",
                l: "h-10 px-6 py-2",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: VariantProps<typeof buttonVariants>["variant"]
    size?: ButtonSize
    asChild?: boolean
    className?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        // Fix: Type-check and ensure variant and size are valid options
        // This prevents infinite loops when invalid values are passed
        const validVariant = variant && typeof variant === 'string' ? variant : 'default';
        const validSize = size && typeof size === 'string' ? size : 'default';
        
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant: validVariant, size: validSize }), className)}
                ref={ref}
                {...props}
            />
        )
    }
)

Button.displayName = "Button"

export { Button, buttonVariants }
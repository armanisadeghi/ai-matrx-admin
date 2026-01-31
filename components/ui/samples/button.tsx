// File Location: '@/components/ui/samples/button.tsx'
"use client"

import * as React from 'react'
import {Slot} from '@radix-ui/react-slot'
import {cva, type VariantProps} from 'class-variance-authority'
import {Loader2, ChevronDown} from 'lucide-react'
import {cn} from '@/utils/cn'

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                xs: "h-6 px-2 text-xs",
                s: "h-8 px-3 text-xs",
                sm: "h-9 rounded-md px-3",
                m: "h-10 px-4 py-2",
                default: "h-10 px-4 py-2",
                l: "h-11 rounded-md px-8",
                lg: "h-12 rounded-md px-8",
                xl: "h-14 rounded-md px-10 text-lg",
                icon: "h-10 w-10 p-2",
            },
            animation: {
                none: "",
                basic: "transition-colors duration-200",
                moderate: "transition-all duration-300 ease-in-out",
                enhanced: "transition-all duration-300 ease-in-out transform hover:scale-105",
            },
            fullWidth: {
                true: "w-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            animation: "basic",
            fullWidth: false,
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    icon?: React.ReactNode
    loading?: boolean
    ripple?: boolean
    tooltip?: string
    dropdown?: boolean
    count?: number
    groupPosition?: 'left' | 'center' | 'right'
}

const MatrxButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
         className,
         variant,
         size,
         animation,
         fullWidth,
         asChild = false,
         icon,
         loading,
         ripple,
         tooltip,
         dropdown,
         count,
         groupPosition,
         children,
         ...props
     }, ref) => {
        const Comp = asChild ? Slot : "button"
        const [rippleStyle, setRippleStyle] = React.useState<React.CSSProperties>({})

        const handleRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
            if (!ripple) return

            const button = event.currentTarget
            const rect = button.getBoundingClientRect()
            const size = Math.max(rect.width, rect.height)
            const x = event.clientX - rect.left - size / 2
            const y = event.clientY - rect.top - size / 2

            setRippleStyle({
                width: `${size}px`,
                height: `${size}px`,
                left: `${x}px`,
                top: `${y}px`,
            })

            setTimeout(() => setRippleStyle({}), 600)
        }

        const buttonContent = (
            <>
                {icon && <span
                    className={`${children ? 'mr-2' : ''} ${size === 'icon' ? 'w-full h-full' : ''}`}>{icon}</span>}
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {children}
                {dropdown && <ChevronDown className="ml-2 h-4 w-4"/>}
                {count !== undefined && (
                    <span
                        className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
            {count}
          </span>
                )}
                {ripple && (
                    <span
                        className="absolute inset-0 pointer-events-none"
                    >
            <span
                className="absolute bg-white opacity-30 rounded-full animate-ripple"
                style={rippleStyle}
            />
          </span>
                )}
            </>
        )

        return (
            <Comp
                className={cn(
                    buttonVariants({variant, size, animation, fullWidth, className}),
                    groupPosition === 'left' && "rounded-r-none",
                    groupPosition === 'center' && "rounded-none border-l-0",
                    groupPosition === 'right' && "rounded-l-none border-l-0",
                )}
                ref={ref}
                onClick={handleRipple}
                {...props}
            >
                {tooltip ? (
                    <span className="group relative">
            {buttonContent}
                        <span
                            className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 transform rounded bg-background text-foreground px-2 py-1 text-xs group-hover:block">
              {tooltip}
            </span>
          </span>
                ) : (
                     buttonContent
                 )}
            </Comp>
        )
    }
)
MatrxButton.displayName = "MatrxButton"


interface ButtonGroupProps extends ButtonProps{
    children: React.ReactNode;
    direction?: 'row' | 'column';
    spacing?: 'none' | 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = (
    {
        children,
        direction = 'row',
        spacing = 'small',
        fullWidth = false,
        className = '',
    }) => {
    const spacingClasses = {
        none: '',
        small: direction === 'row' ? 'space-x-2' : 'space-y-2',
        medium: direction === 'row' ? 'space-x-4' : 'space-y-4',
        large: direction === 'row' ? 'space-x-6' : 'space-y-6',
    };

    const groupPosition = (index: number, total: number) => {
        if (total === 1) return undefined;
        if (index === 0) return 'left';
        if (index === total - 1) return 'right';
        return 'center';
    };

    const childrenArray = React.Children.toArray(children);

    return (
        <div
            className={cn(
                'flex',
                direction === 'row' ? 'flex-row' : 'flex-col',
                spacingClasses[spacing],
                fullWidth ? 'w-full' : '',
                className
            )}
        >
            {React.Children.map(childrenArray, (child, index) => {
                if (React.isValidElement(child)) {
                    // @ts-ignore - Spread types may only be created from object types
                    return React.cloneElement(child, {
                        ...child.props,
                        groupPosition: groupPosition(index, childrenArray.length),
                        fullWidth: fullWidth,
                    });
                }
                return child;
            })}
        </div>
    );
};


export {MatrxButton, buttonVariants, ButtonGroup}

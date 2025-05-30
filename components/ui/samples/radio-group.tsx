import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import { cn } from '@/utils/cn'

type Size = 'xs' | 's' | 'm' | 'lg' | 'xl'
type Orientation = 'horizontal' | 'vertical'
type AnimationLevel = 'none' | 'minimal' | 'full'

interface MatrxRadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
    gap?: Size
    orientation?: Orientation
    onValueChange?: (value: string) => void
    animationLevel?: AnimationLevel
}

const MatrxRadioGroup = React.forwardRef<
    React.ComponentRef<typeof RadioGroupPrimitive.Root>,
    MatrxRadioGroupProps
>(({ className, gap = 'm', orientation = 'vertical', onValueChange, animationLevel = 'full', ...props }, ref) => {
    const gapClasses = {
        xs: 'gap-1',
        s: 'gap-2',
        m: 'gap-3',
        lg: 'gap-4',
        xl: 'gap-5',
    }

    return (
        <RadioGroupPrimitive.Root
            className={cn(
                'grid',
                gapClasses[gap],
                orientation === 'horizontal' ? 'grid-flow-col' : 'grid-flow-row',
                className
            )}
            onValueChange={onValueChange}
            {...props}
            ref={ref}
        />
    )
})
MatrxRadioGroup.displayName = 'MatrxRadioGroup'

interface MatrxRadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
    size?: Size
    animationLevel?: AnimationLevel
    label: string
    description?: string
}

const MatrxRadioGroupItem = React.forwardRef<
    React.ComponentRef<typeof RadioGroupPrimitive.Item>,
    MatrxRadioGroupItemProps
>(({ className, size = 'm', animationLevel = 'full', label, description, ...props }, ref) => {
    const sizeClasses = {
        xs: 'h-3 w-3',
        s: 'h-4 w-4',
        m: 'h-5 w-5',
        lg: 'h-6 w-6',
        xl: 'h-7 w-7',
    }

    const animationClasses = {
        none: '',
        minimal: 'transition-colors duration-200',
        full: 'transition-all duration-300 ease-in-out',
    }

    const hoverClasses = {
        none: '',
        minimal: 'hover:translate-x-0.5',
        full: 'hover:bg-primary-100 hover:shadow-md hover:scale-105',
    }

    const labelSizeClasses = {
        xs: 'text-xs',
        s: 'text-sm',
        m: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    }

    const descriptionSizeClasses = {
        xs: 'text-xs',
        s: 'text-xs',
        m: 'text-sm',
        lg: 'text-base',
        xl: 'text-base',
    }

    return (
        <label className={cn(
            "flex items-center space-x-2 cursor-pointer p-2 rounded-lg",
            animationClasses[animationLevel],
            hoverClasses[animationLevel]
        )}>
            <RadioGroupPrimitive.Item
                ref={ref}
                className={cn(
                    'relative aspect-square rounded-full border-2 border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    animationClasses[animationLevel],
                    'hover:border-primary-dark',
                    'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                    animationLevel === 'full' && 'data-[state=checked]:scale-105',
                    sizeClasses[size],
                    className
                )}
                {...props}
            >
                <RadioGroupPrimitive.Indicator className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    animationLevel !== 'none' && 'transition-transform duration-200 ease-out'
                )}>
                    <Circle className={cn('fill-current text-primary-foreground', {
                        'h-1.5 w-1.5': size === 'xs',
                        'h-2 w-2': size === 's',
                        'h-2.5 w-2.5': size === 'm',
                        'h-3 w-3': size === 'lg',
                        'h-3.5 w-3.5': size === 'xl',
                    })} />
                </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
            <div className={cn(
                "grid gap-0.5 leading-none",
                animationClasses[animationLevel]
            )}>
        <span className={cn(
            'font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            labelSizeClasses[size]
        )}>
          {label}
        </span>
                {description && (
                    <span className={cn(
                        "text-muted-foreground",
                        descriptionSizeClasses[size]
                    )}>
            {description}
          </span>
                )}
            </div>
        </label>
    )
})
MatrxRadioGroupItem.displayName = 'MatrxRadioGroupItem'

export { MatrxRadioGroup, MatrxRadioGroupItem }


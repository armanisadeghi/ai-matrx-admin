// File Location: '@/components/ui/select/select-base.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { SelectOption } from './types'

export const MatrxSelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    animation?: 'none' | 'basic' | 'moderate' | 'enhanced'
}
>(({ className, children, animation = 'basic', ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            {
                '': animation === 'none',
                'transition-colors duration-200': animation === 'basic',
                'transition-all duration-300 hover:border-primary': animation === 'moderate',
                'transition-all duration-300 hover:border-primary hover:shadow-lg transform hover:-translate-y-0.5': animation === 'enhanced',
            },
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
))
MatrxSelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export default MatrxSelectTrigger

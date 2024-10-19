// File Location: '@/components/ui/samples/accordion.tsx'
"use client"

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import {ChevronDown, Search} from 'lucide-react'
import {cn} from '@/utils/cn'
import {Input} from '@/components/ui/input'

type AnimationLevel = 'none' | 'basic' | 'moderate' | 'enhanced'

type AccordionSingleProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
    type: 'single'
    collapsible?: boolean
}

type AccordionMultipleProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
    type: 'multiple'
}

type AccordionProps = (AccordionSingleProps | AccordionMultipleProps) & {
    animationLevel?: AnimationLevel
    persistState?: boolean
    onStateChange?: (value: string[]) => void
}

const MatrxAccordion = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Root>,
    AccordionProps
>(({animationLevel = 'enhanced', persistState, onStateChange, ...props}, ref) => {
    const [openItems, setOpenItems] = React.useState<string[]>([])

    React.useEffect(() => {
        if (persistState) {
            const storedState = localStorage.getItem('accordionState')
            if (storedState) {
                setOpenItems(JSON.parse(storedState))
            }
        }
    }, [persistState])

    const handleValueChange = (value: string | string[]) => {
        const newOpenItems = Array.isArray(value) ? value : [value]
        setOpenItems(newOpenItems)
        if (persistState) {
            localStorage.setItem('accordionState', JSON.stringify(newOpenItems))
        }
        if (onStateChange) {
            onStateChange(newOpenItems)
        }
    }

    return (
        <AccordionPrimitive.Root
            ref={ref}
            onValueChange={handleValueChange}
            className="bg-card rounded-lg shadow-md"
            {...props}
        />
    )
})
MatrxAccordion.displayName = 'MatrxAccordion'

interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
    disabled?: boolean
}

const MatrxAccordionItem = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Item>,
    AccordionItemProps
>(({className, disabled, ...props}, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={cn(
            "border-b last:border-b-0",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}
        disabled={disabled}
        {...props}
    />
))
MatrxAccordionItem.displayName = 'MatrxAccordionItem'

interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
    icon?: React.ReactNode
    animationLevel?: AnimationLevel
    fullWidth?: boolean
}

const MatrxAccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    AccordionTriggerProps
>(({className, children, icon, animationLevel = 'enhanced', fullWidth, ...props}, ref) => {
    const animationClasses = {
        none: '',
        basic: 'transition-all duration-200',
        moderate: 'transition-all duration-300',
        enhanced: 'transition-all duration-300 ease-in-out transform hover:bg-accent hover:translate-x-1',
    }

    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                ref={ref}
                className={cn(
                    "flex flex-1 items-center justify-between py-4 px-5 font-medium text-sm",
                    animationClasses[animationLevel],
                    fullWidth && "w-full",
                    "hover:bg-accent/10 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50",
                    className
                )}
                {...props}
            >
                {children}
                {icon || (
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                            "group-data-[state=open]:rotate-180"
                        )}
                    />
                )}
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    )
})
MatrxAccordionTrigger.displayName = 'MatrxAccordionTrigger'

interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
    animationLevel?: AnimationLevel
    lazyLoad?: boolean
}

const MatrxAccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    AccordionContentProps
>(({className, children, animationLevel = 'enhanced', lazyLoad, ...props}, ref) => {
    const animationClasses = {
        none: '',
        basic: 'transition-all',
        moderate: 'transition-all duration-200',
        enhanced: 'transition-all duration-300 ease-in-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
    }

    return (
        <AccordionPrimitive.Content
            ref={ref}
            className={cn(
                "overflow-hidden text-sm bg-background/50",
                animationClasses[animationLevel],
                className
            )}
            {...props}
        >
            <div className="p-5">
                {lazyLoad ? (
                    <React.Suspense fallback={<div>Loading...</div>}>
                        {children}
                    </React.Suspense>
                ) : (
                    children
                )}
            </div>
        </AccordionPrimitive.Content>
    )
})
MatrxAccordionContent.displayName = 'MatrxAccordionContent'

interface AccordionSearchProps {
    onSearch: (searchTerm: string) => void
    placeholder?: string
}

const MatrxAccordionSearch: React.FC<AccordionSearchProps> = ({onSearch, placeholder = 'Search...'}) => {
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSearch(event.target.value)
    }

    return (
        <div className="relative mb-4">
            <Input
                type="text"
                className="pl-10 bg-background/50 focus:bg-background transition-colors duration-200"
                placeholder={placeholder}
                onChange={handleSearch}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20}/>
        </div>
    )
}

type MatrxFullAccordionProps = {
    items: {
        value: string
        trigger: React.ReactNode
        content: React.ReactNode
    }[]
    searchPlaceholder?: string
} & (
    | (Omit<AccordionSingleProps, 'children'> & { type: 'single' })
    | (Omit<AccordionMultipleProps, 'children'> & { type: 'multiple' })
    )


const MatrxFullAccordion: React.FC<MatrxFullAccordionProps> = (
    {
        items,
        searchPlaceholder,
        ...accordionProps
    }) => {
    const [filteredItems, setFilteredItems] = React.useState(items)

    const handleSearch = (searchTerm: string) => {
        const filtered = items.filter(item =>
            item.trigger.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.content.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredItems(filtered)
    }

    return (
        <div className="space-y-4">
            <MatrxAccordionSearch onSearch={handleSearch} placeholder={searchPlaceholder}/>
            <MatrxAccordion {...accordionProps}>
                {filteredItems.map((item) => (
                    <MatrxAccordionItem key={item.value} value={item.value}>
                        <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                        <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                    </MatrxAccordionItem>
                ))}
            </MatrxAccordion>
        </div>
    )
}

export {
    MatrxAccordion,
    MatrxAccordionItem,
    MatrxAccordionTrigger,
    MatrxAccordionContent,
    MatrxAccordionSearch,
    MatrxFullAccordion,
}

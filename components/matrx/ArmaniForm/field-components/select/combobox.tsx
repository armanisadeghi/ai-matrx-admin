// File Location: '@/components/ui/select/combobox.tsx'
"use client"

import * as React from 'react'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { InternalSelectProps, SelectOption } from './types'

export const MatrxCombobox = React.forwardRef<HTMLDivElement, InternalSelectProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        search,
        visual,
        validation,
        className,
        ...rest
    } = props

    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState('')
    const [debouncedValue, setDebouncedValue] = React.useState('')

    // Handle debounced input
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(inputValue)
            search?.loadOptions?.(inputValue)
        }, search?.debounce ?? 300)

        return () => clearTimeout(timer)
    }, [inputValue, search])

    // Filter options based on search configuration
    const filteredOptions = React.useMemo(() => {
        if (!debouncedValue || debouncedValue.length < (search?.minLength ?? 0)) {
            return options as SelectOption[]
        }

        if (search?.filterOptions) {
            return search.filterOptions(options as SelectOption[], debouncedValue)
        }

        const searchValue = search?.ignoreCase
                            ? debouncedValue.toLowerCase()
                            : debouncedValue

        return (options as SelectOption[]).filter(option => {
            const label = search?.ignoreCase
                          ? option.label.toLowerCase()
                          : option.label

            switch (search?.matchFrom) {
                case 'start':
                    return label.startsWith(searchValue)
                case 'word':
                    return label.split(/\s+/).some(word =>
                        (search?.ignoreCase ? word.toLowerCase() : word)
                            .startsWith(searchValue)
                    )
                case 'any':
                default:
                    return label.includes(searchValue)
            }
        })
    }, [options, debouncedValue, search])

    const getAnimationClasses = () => {
        switch (visual?.animation) {
            case 'none':
                return ''
            case 'basic':
                return 'transition-colors duration-200'
            case 'moderate':
                return 'transition-all duration-300'
            case 'enhanced':
                return 'transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg'
            default:
                return 'transition-colors duration-200'
        }
    }

    return (
        <Command
            ref={ref}
            className={cn(
                "relative rounded-lg border border-input",
                validation?.errorMessage && "border-destructive",
                getAnimationClasses(),
                className
            )}
        >
            <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={search?.placeholder ?? 'Search...'}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={behavior?.disabled}
                    {...rest}
                />
            </div>
            <div className={cn(
                "overflow-y-auto p-1",
                visual?.maxHeight && `max-h-[${visual.maxHeight}]`
            )}>
                {filteredOptions.map((option) => (
                    <Command.Item
                        key={option.value}
                        value={String(option.value)}
                        onSelect={() => {
                            onChange(option.value)
                            if (behavior?.closeOnSelect) {
                                setInputValue('')
                                setOpen(false)
                            }
                        }}
                        disabled={option.disabled || behavior?.disabled}
                        className={cn(
                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                            getAnimationClasses()
                        )}
                    >
                        {visual?.showIcons && option.icon && (
                            <span className="mr-2">{option.icon}</span>
                        )}
                        <span className={cn(
                            visual?.truncate && "truncate"
                        )}>
                            {option.label}
                        </span>
                        {option.description && (
                            <span className="ml-2 text-sm text-muted-foreground">
                                {option.description}
                            </span>
                        )}
                        {visual?.showCheckmarks && String(option.value) === value && (
                            <Check className="ml-auto h-4 w-4" />
                        )}
                    </Command.Item>
                ))}
                {filteredOptions.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">
                        {behavior?.loading ? 'Loading...' : 'No options found'}
                    </p>
                )}
            </div>
        </Command>
    )
})

MatrxCombobox.displayName = 'MatrxCombobox'

export default MatrxCombobox

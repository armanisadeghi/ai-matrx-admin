// File Location: '@/components/ui/select/async-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { SelectBaseProps, SelectOption } from './types'

interface AsyncSelectState {
    inputValue: string
    isLoading: boolean
    error: string | null
    options: SelectOption[]
}

export const MatrxAsyncSelect = React.forwardRef<HTMLButtonElement, SelectBaseProps>((props, ref) => {
    const {
        value,
        onChange,
        options: initialOptions,
        behavior,
        search,
        visual,
        validation,
        ...rest
    } = props

    const [state, setState] = React.useState<AsyncSelectState>({
        inputValue: '',
        isLoading: false,
        error: null,
        options: initialOptions as SelectOption[]
    })

    const cache = React.useRef<Record<string, SelectOption[]>>({})

    const handleSearch = React.useCallback(
        async (query: string) => {
            if (!search?.loadOptions) return

            if (query.length < (search.minLength || 0)) {
                setState(prev => ({ ...prev, options: initialOptions as SelectOption[] }))
                return
            }

            // Check cache if enabled
            if (behavior?.async && cache.current[query]) {
                setState(prev => ({ ...prev, options: cache.current[query] }))
                return
            }

            setState(prev => ({ ...prev, isLoading: true, error: null }))

            try {
                const results = await search.loadOptions(query)
                if (behavior?.async) {
                    cache.current[query] = results
                }
                setState(prev => ({ ...prev, options: results }))
            } catch (err) {
                setState(prev => ({
                    ...prev,
                    error: err instanceof Error ? err.message : 'Failed to load options'
                }))
            } finally {
                setState(prev => ({ ...prev, isLoading: false }))
            }
        },
        [search, behavior?.async, initialOptions]
    )

    React.useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(state.inputValue)
        }, search?.debounce || 300)

        return () => clearTimeout(timer)
    }, [state.inputValue, handleSearch, search?.debounce])

    const getAnimationClasses = () => {
        switch (visual?.animation) {
            case 'none':
                return ''
            case 'basic':
                return 'transition-colors duration-200'
            case 'moderate':
                return 'transition-all duration-300'
            case 'enhanced':
                return 'transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md'
            default:
                return 'transition-colors duration-200'
        }
    }

    const getSizeClasses = () => {
        switch (visual?.size) {
            case 'xs':
                return 'h-7 text-xs'
            case 'sm':
                return 'h-8 text-sm'
            case 'lg':
                return 'h-12 text-lg'
            case 'xl':
                return 'h-14 text-xl'
            default:
                return 'h-10 text-base'
        }
    }

    return (
        <SelectPrimitive.Root value={value as string} onValueChange={onChange}>
            <SelectPrimitive.Trigger
                ref={ref}
                className={cn(
                    "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    getAnimationClasses(),
                    getSizeClasses(),
                    validation?.required && "required",
                    rest.className
                )}
            >
                <div className="flex-1">
                    <input
                        className="bg-transparent outline-none w-full"
                        value={state.inputValue}
                        onChange={(e) => setState(prev => ({ ...prev, inputValue: e.target.value }))}
                        placeholder={search?.placeholder}
                        disabled={behavior?.loading}
                    />
                </div>
                <SelectPrimitive.Icon>
                    {state.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                         <ChevronDown className="h-4 w-4 opacity-50" />
                     )}
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className={cn(
                        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
                        visual?.maxHeight && `max-h-[${visual.maxHeight}]`,
                        visual?.width && `w-[${visual.width}]`
                    )}
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {state.error && (
                            <div className="flex items-center gap-2 p-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{state.error}</span>
                                <button
                                    onClick={() => handleSearch(state.inputValue)}
                                    className="ml-auto text-sm text-primary hover:underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!state.error && state.options.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={String(option.value)}
                                className={cn(
                                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    getAnimationClasses()
                                )}
                                disabled={option.disabled}
                            >
                                {visual?.showIcons && option.icon && (
                                    <span className="mr-2">{option.icon}</span>
                                )}
                                <SelectPrimitive.ItemText>
                                    {visual?.truncate ? (
                                        <span className="truncate">{option.label}</span>
                                    ) : option.label}
                                </SelectPrimitive.ItemText>
                                {option.description && (
                                    <span className="ml-2 text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                            </SelectPrimitive.Item>
                        ))}

                        {!state.error && !state.isLoading && state.options.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground">
                                No options found
                            </div>
                        )}

                        {state.isLoading && (
                            <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-sm">Loading...</span>
                            </div>
                        )}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
})

MatrxAsyncSelect.displayName = 'MatrxAsyncSelect'

export default MatrxAsyncSelect

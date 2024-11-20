// File Location: '@/components/ui/select/tag-select.tsx'
"use client"

import * as React from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TagProps, SelectOption, isSelectOption } from './types'

export const MatrxTagSelect = React.forwardRef<HTMLDivElement, TagProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        tags,
        className,
        ...rest
    } = props

    const [inputValue, setInputValue] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Ensure we're working with string[] for tags
    const selectedTags = Array.isArray(value) ? value : []

    // Convert options to string suggestions if they exist
    const suggestions = options
        .filter(isSelectOption)
        .map(opt => opt.label)

    const handleAddTag = (tag: string) => {
        const trimmedTag = tag.trim()
        if (!trimmedTag) return

        const transformedTag = tags?.transformTag
                               ? tags.transformTag(trimmedTag)
                               : trimmedTag

        if (tags?.validateTag) {
            const validationResult = tags.validateTag(transformedTag)
            if (typeof validationResult === 'string') {
                setError(validationResult)
                return
            }
            if (!validationResult) {
                setError('Invalid tag')
                return
            }
        }

        if (!tags?.allowDuplicates && selectedTags.includes(transformedTag)) {
            setError('Tag already exists')
            return
        }

        if (tags?.maxTags && selectedTags.length >= tags.maxTags) {
            setError(`Maximum ${tags.maxTags} tags allowed`)
            return
        }

        onChange([...selectedTags, transformedTag])
        setInputValue('')
        setError(null)
    }

    const handleRemoveTag = (tagToRemove: string) => {
        onChange(selectedTags.filter(tag => tag !== tagToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === (tags?.delimiter || ',')) {
            e.preventDefault()
            handleAddTag(inputValue)
        } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
            handleRemoveTag(selectedTags[selectedTags.length - 1])
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedText = e.clipboardData.getData('text')
        const separator = tags?.pasteSeparator || /[,;\n]/
        const pastedTags = pastedText.split(separator)

        pastedTags.forEach(tag => {
            handleAddTag(tag)
        })
    }

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

    return (
        <div
            ref={ref}
            className={cn(
                "flex flex-wrap gap-2 rounded-md border border-input bg-background p-2",
                validation?.errorMessage && "border-destructive",
                getAnimationClasses(),
                className
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {selectedTags.map((tag, index) => (
                <span
                    key={`${tag}-${index}`}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm",
                        visual?.animation === 'enhanced' && "transform transition-all hover:-translate-y-0.5 hover:shadow-sm",
                        visual?.optionClassName
                    )}
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTag(tag)
                        }}
                        className="rounded-full hover:bg-primary/20"
                        disabled={behavior?.disabled}
                    >
                        <X className="h-3 w-3"/>
                    </button>
                </span>
            ))}

            <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value)
                    setError(null)
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className={cn(
                    "flex-1 bg-transparent outline-none min-w-[120px]",
                    visual?.inputClassName
                )}
                placeholder={
                    tags?.maxTags && selectedTags.length >= tags.maxTags
                    ? ''
                    : visual?.placeholder || 'Add tags...'
                }
                disabled={behavior?.disabled || (tags?.maxTags && selectedTags.length >= tags.maxTags)}
            />

            {tags?.createTag && inputValue && !behavior?.disabled && (
                <button
                    type="button"
                    onClick={() => handleAddTag(inputValue)}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground",
                        getAnimationClasses()
                    )}
                >
                    <Plus className="h-3 w-3"/>
                    Add Tag
                </button>
            )}

            {(error || validation?.errorMessage) && (
                <p className="w-full text-sm text-destructive mt-1">
                    {error || validation?.errorMessage}
                </p>
            )}
        </div>
    )
})

MatrxTagSelect.displayName = 'MatrxTagSelect'

export default MatrxTagSelect

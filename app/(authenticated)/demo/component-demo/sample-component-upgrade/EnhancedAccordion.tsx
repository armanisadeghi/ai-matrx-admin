"use client"

import React, {useState} from 'react'
import {motion, AnimatePresence} from 'motion/react'
import {ChevronDown} from 'lucide-react'
import {cn} from "@/lib/utils"

export interface AccordionItem {
    id: string
    title: React.ReactNode
    content: React.ReactNode
}

export interface EnhancedAccordionProps {
    items?: AccordionItem[]
    defaultOpenItems?: string[]
    allowMultiple?: boolean
    className?: string
    itemClassName?: string
    triggerClassName?: string
    contentClassName?: string
    onItemToggle?: (id: string, isOpen: boolean) => void
}

const EnhancedAccordion: React.FC<EnhancedAccordionProps> = (
    {
        items = [],
        defaultOpenItems = [],
        allowMultiple = false,
        className,
        itemClassName,
        triggerClassName,
        contentClassName,
        onItemToggle,
    }) => {
    const [openItems, setOpenItems] = useState<string[]>(defaultOpenItems)

    const toggleItem = (id: string) => {
        setOpenItems((prev) => {
            const isOpen = prev.includes(id)
            const newOpenItems = isOpen
                ? prev.filter((item) => item !== id)
                : allowMultiple
                    ? [...prev, id]
                    : [id]

            onItemToggle?.(id, !isOpen)
            return newOpenItems
        })
    }

    if (items.length === 0) {
        return null
    }

    return (
        <div className={cn("w-full rounded-md border border-gray-200 dark:border-gray-700", className)}>
            {items.map((item, index) => (
                <AccordionItem
                    key={item.id}
                    item={item}
                    isOpen={openItems.includes(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    className={cn(itemClassName, index === items.length - 1 ? "border-b-0" : "")}
                    triggerClassName={triggerClassName}
                    contentClassName={contentClassName}
                />
            ))}
        </div>
    )
}

interface AccordionItemProps {
    item: AccordionItem
    isOpen: boolean
    onToggle: () => void
    className?: string
    triggerClassName?: string
    contentClassName?: string
}

const AccordionItem: React.FC<AccordionItemProps> = (
    {
        item,
        isOpen,
        onToggle,
        className,
        triggerClassName,
        contentClassName,
    }) => {
    return (
        <div className={cn("border-b border-gray-200 dark:border-gray-700", className)}>
            <motion.button
                className={cn(
                    "flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                    triggerClassName
                )}
                onClick={onToggle}
                whileHover={{scale: 1.01}}
                whileTap={{scale: 0.99}}
            >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
                <motion.div
                    animate={{rotate: isOpen ? 180 : 0}}
                    transition={{duration: 0.2}}
                >
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
                </motion.div>
            </motion.button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.2, ease: "easeInOut"}}
                    >
                        <div
                            className={cn("px-4 pb-4 pt-0 text-sm text-gray-700 dark:text-gray-300", contentClassName)}>
                            {item.content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default EnhancedAccordion

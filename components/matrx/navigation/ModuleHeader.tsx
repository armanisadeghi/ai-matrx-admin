'use client';

import React from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {ChevronLeft, Home, Settings, Boxes, TestTube2} from 'lucide-react';
import {IconApps} from "@tabler/icons-react";
import {Button} from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {cn} from '@/lib/utils';
import {ModuleHeaderProps, ModulePage} from "@/components/matrx/navigation/types";

export default function ModuleHeader(
    {
        pages,
        currentPath,
        moduleHome,
        moduleName,
        className = ''
    }: ModuleHeaderProps) {
    const headerVariants = {
        initial: {opacity: 0, y: -20},
        animate: {
            opacity: 1,
            y: 0,
            transition: {duration: 0.3}
        }
    };

    const buttonVariants = {
        initial: {scale: 0.9, opacity: 0},
        animate: {
            scale: 1,
            opacity: 1,
            transition: {duration: 0.2}
        },
        hover: {
            scale: 1.05,
            transition: {duration: 0.2}
        }
    };

    // Function to get full path based on relative flag
    const getFullPath = (page: ModulePage) => {
        if (!page.relative) {
            return page.path.startsWith('/') ? page.path : `/${page.path}`;
        }
        return `/${moduleHome}/${page.path}`;
    };

    // Find current page using the same path logic
    const currentPage = pages.find(page => {
        const fullPath = getFullPath(page);
        return currentPath === fullPath;
    });

    const currentTitle = moduleName || currentPage?.title || 'Select Page';

    const adminShortcuts = [
        {path: '/admin', icon: Settings, label: 'Admin'},
        {path: '/tests', icon: TestTube2, label: 'Tests'},
        {path: '/demo', icon: Boxes, label: 'Demo'},
        {path: '/applets', icon: IconApps, label: 'Applets'},
    ];

    return (
        <motion.header
            variants={headerVariants}
            initial="initial"
            animate="animate"
            className={cn(
                "h-12 flex items-center justify-between bg-background/60 backdrop-blur-sm border-b px-4",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <motion.div
                    variants={buttonVariants}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                >
                    <Link href=".." className="mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-accent"
                        >
                            <ChevronLeft className="h-4 w-4"/>
                        </Button>
                    </Link>
                </motion.div>

                <motion.div
                    variants={buttonVariants}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                >
                    <Link href={`/${moduleHome}`}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-accent"
                        >
                            <Home className="h-4 w-4"/>
                        </Button>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    className="pl-2 border-l ml-2"
                >
                    <h1 className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">
                        {currentTitle}
                    </h1>
                </motion.div>
            </div>

            <div className="flex-1 max-w-xs mx-4">
                <Select onValueChange={(value) => window.location.href = value}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Navigate to..."/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {pages.map((page) => (
                                <SelectItem
                                    key={page.path}
                                    value={getFullPath(page)}
                                >
                                    {page.title}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            <TooltipProvider>
                <div className="flex items-center gap-1">
                    {adminShortcuts.map((shortcut) => (
                        <Tooltip key={shortcut.path}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    variants={buttonVariants}
                                    initial="initial"
                                    animate="animate"
                                    whileHover="hover"
                                >
                                    <a
                                        href={shortcut.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-accent"
                                        >
                                            <shortcut.icon className="h-4 w-4"/>
                                        </Button>
                                    </a>
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{shortcut.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </TooltipProvider>
        </motion.header>
    );
}

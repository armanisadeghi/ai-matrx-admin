'use client';

import React from 'react';
import {motion} from 'motion/react';
import {PanelLeftOpen} from 'lucide-react';
import {cn} from '@/lib/utils';
import PageSelection from './PageSelection';
import AdminShortcuts from './AdminShortcuts';
import Breadcrumbs from './Breadcrumbs';
import {ModulePage} from "@/components/matrx/navigation/types";
import {usePathname} from 'next/navigation';

interface ModuleHeaderProps {
    pages: ModulePage[];
    currentPath?: string;
    moduleHome: string;
    moduleName?: string;
    className?: string;
    children?: React.ReactNode;
}

export default function ModuleHeader(
    {
        pages,
        currentPath,
        moduleHome,
        moduleName,
        className = '',
        children
    }: ModuleHeaderProps) {
    const pathname = usePathname();
    const activePath = currentPath || pathname;

    const headerVariants = {
        initial: {opacity: 0, y: -20},
        animate: {
            opacity: 1,
            y: 0,
            transition: {duration: 0.3}
        }
    };

    return (
        <motion.header
            variants={headerVariants}
            initial="initial"
            animate="animate"
            className={cn(
                "h-12 flex items-center justify-between bg-background/60 backdrop-blur-sm border-b px-4",
                "overflow-hidden",
                className
            )}
        >
            <div className="flex items-center gap-4">
                <PanelLeftOpen/>
                <div className="h-4 w-[1px] bg-border"/>
                {/* Divider */}
                <Breadcrumbs path={activePath}/>
                <div className="h-4 w-[1px] bg-border"/>
                {/* Divider */}
                <PageSelection
                    pages={pages}
                    moduleHome={moduleHome}
                    moduleName={moduleName}
                />
            </div>

            <div className="flex-1 flex items-center justify-end gap-2">
                {children}
                <AdminShortcuts/>
            </div>
        </motion.header>
    );
}
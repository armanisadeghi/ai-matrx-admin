import React from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {ModulePage} from '../types';

interface PageSelectionProps {
    pages: ModulePage[];
    moduleHome: string;
}

export default function PageSelection({pages, moduleHome}: PageSelectionProps) {
    const router = useRouter();
    const pathname = usePathname();

    const getFullPath = (page: ModulePage) => {
        if (!page.relative) {
            return page.path.startsWith('/') ? page.path : `/${page.path}`;
        }
        return moduleHome.startsWith('/')
            ? `${moduleHome}/${page.path}`
            : `/${moduleHome}/${page.path}`;
    };

    const currentPage = pages.find(page => {
        const fullPath = getFullPath(page);
        return pathname === fullPath;
    });

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    return (
        <Select
            value={currentPage ? getFullPath(currentPage) : undefined}
            onValueChange={handleNavigation}
        >
            <SelectTrigger className="h-8 w-200">
                <SelectValue className='pr-2 truncate'>
                    {currentPage?.title || "Navigate to..."}
                </SelectValue>
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
    );
}
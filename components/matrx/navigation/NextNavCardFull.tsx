'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {NavCardProps, NavItem} from "./types";


const NextNavCardFull = ({ items, basePath = '' }: NavCardProps) => {
    const currentPath = usePathname();

    const getFullPath = (item: NavItem) => {
        if (item.relative) {
            return `${basePath || currentPath}/${item.path}`.replace(/\/+/g, '/');
        }
        return item.path.startsWith('/') ? item.path : `/${item.path}`;
    };

    return (
        <div className="flex flex-col space-y-4">
            {items.map((item) => {
                const fullPath = getFullPath(item);
                return (
                    <Link
                        key={item.path}
                        href={fullPath}
                        className="transition-transform hover:scale-[1.01]"
                    >
                        <Card className="w-full hover:bg-muted cursor-pointer">
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl mb-1">{item.title}</CardTitle>
                                        {item.description && (
                                            <CardDescription className="text-base">
                                                {item.description}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <CardDescription className="text-sm font-mono mt-2 md:mt-0 md:text-right">
                                        {fullPath}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
};

export default NextNavCardFull;

// components/layout/left-sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
    Home,
    Users,
    ShoppingCart,
    BarChart,
    Settings,
    PlusSquare,
    SquareFunction,
    FlaskConical,
    PanelBottomOpen
} from 'lucide-react';

interface LeftSidebarProps {
    available: boolean;
    state: 'closed' | 'icon' | 'full';
}

const sidebarNavItems = [
    {title: "Home", href: "/dashboard", icon: Home},
    {title: "Users", href: "/dashboard", icon: Users},
    {title: "Settings", href: "/dashboard", icon: Settings},
    {title: "Manage Admin Functions", href: "/admin/registered-functions", icon: SquareFunction},
    {title: "Developer Tests", href: "/tests", icon: FlaskConical},
    {title: "AI Playground", href: "/playground", icon: SquareFunction},
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({available, state}) => {
    const pathname = usePathname();

    if (!available || state === 'closed') return null;

    const isIconOnly = state === 'icon';

    return (
        <aside className={cn(
            "border-r bg-background transition-all duration-300 ease-in-out",
            isIconOnly ? "w-16" : "w-64"
        )}>
            <ScrollArea className="h-full py-2">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {sidebarNavItems.map((item, index) => (
                        <Link key={index} href={item.href}>
              <span className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                  pathname === item.href ? "bg-gray-200 dark:bg-blue-800" : "transparent",
                  "my-1"
              )}>
                <item.icon className="h-4 w-4"/>
                  {!isIconOnly && <span className="ml-2">{item.title}</span>}
              </span>
                        </Link>
                    ))}
                </nav>
            </ScrollArea>
        </aside>
    );
};

export default LeftSidebar;

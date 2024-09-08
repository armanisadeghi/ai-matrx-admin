// components/layout/left-sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from '../ui/sidebar';
import {
    Home,
    Users,
    Settings,
    SquareFunction,
    FlaskConical,
    User,
    Infinity,
} from 'lucide-react';
import { motion } from "framer-motion";

const links = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Users', href: '/dashboard/users', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Manage Admin Functions', href: '/admin/registered-functions', icon: SquareFunction },
    { label: 'Developer Tests', href: '/tests', icon: FlaskConical },
    { label: 'AI Playground', href: '/playground', icon: SquareFunction },
];

interface LeftSidebarProps {
    available: boolean;
    state: 'closed' | 'icon' | 'full';
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ available, state }) => {
    const pathname = usePathname();

    if (!available) return null;

    const isOpen = state === 'full';
    const isIcon = state === 'icon';

    return (
        <div
            className={cn(
                'transition-all duration-300 ease-in-out',
                isOpen ? 'w-64' : 'w-16',
                'flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800'
            )}
        >
            <Sidebar initialOpen={isOpen} animate>
                <SidebarBody className="flex flex-col justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {isOpen ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink
                                    key={idx}
                                    link={{
                                        label: link.label,
                                        href: link.href,
                                        icon: <link.icon className="h-4 w-4" />,
                                    }}
                                    className={cn(
                                        'flex items-center rounded-lg px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
                                        pathname === link.href ? 'bg-gray-200 dark:bg-gray-800' : 'transparent',
                                        'my-1'
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <SidebarLink
                            link={{
                                label: 'Profile',
                                href: '#',
                                icon: <User className="h-7 w-7 flex-shrink-0" />,
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
        </div>
    );
};

export default LeftSidebar;

export const Logo = () => {
    return (
        <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium text-black dark:text-white whitespace-pre"
            >
                AI Matrx
            </motion.span>
        </Link>
    );
};

export const LogoIcon = () => {
    return (
        <Link href="#">
            <Infinity className="w-8 h-8 mr-0 text-blue-700" />
        </Link>
    );
};
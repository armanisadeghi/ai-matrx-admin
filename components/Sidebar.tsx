// components/Sidebar.tsx
import React, {useState, useEffect} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {cn} from '@/lib/utils';
import {ChevronLeft, ChevronRight, Menu, X} from 'lucide-react';
import {Button} from '@/components/ui/button';

interface SidebarProps {
    children: React.ReactNode;
    position: 'left' | 'right';
    initialState?: 'hidden' | 'icons' | 'full';
    allowToggle?: boolean;
}

const Sidebar: React.FC<SidebarProps> = (
    {
        children,
        position = 'left',
        initialState = 'full',
        allowToggle = true,
    }) => {
    const [state, setState] = useState(initialState);
    const pathname = usePathname();

    useEffect(() => {
        // Reset state when pathname changes, if needed
        // setState(initialState);
    }, [pathname]);

    const toggleSidebar = () => {
        setState((prevState) => {
            switch (prevState) {
                case 'hidden':
                    return 'icons';
                case 'icons':
                    return 'full';
                case 'full':
                    return 'hidden';
                default:
                    return 'full';
            }
        });
    };

    const sidebarWidth = {
        hidden: 'w-0',
        icons: 'w-16',
        full: 'w-64',
    };

    return (
        <div
            className={cn(
                'fixed top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out bg-background border-r',
                sidebarWidth[state],
                {
                    'left-0': position === 'left',
                    'right-0': position === 'right',
                }
            )}
        >
            {allowToggle && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn('absolute top-4 p-2', {
                        '-right-10': position === 'left',
                        '-left-10': position === 'right',
                    })}
                    onClick={toggleSidebar}
                >
                    {state === 'hidden' ? (
                        <Menu className="h-4 w-4"/>
                    ) : position === 'left' ? (
                        <ChevronLeft className="h-4 w-4"/>
                    ) : (
                        <ChevronRight className="h-4 w-4"/>
                    )}
                </Button>
            )}
            <div className="flex-1 overflow-y-auto">
                {state !== 'hidden' && (
                    <div className="p-4">
                        <h2 className={cn('font-bold text-lg mb-4', {'sr-only': state === 'icons'})}>
                            Dashboard
                        </h2>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

interface SidebarItemProps {
    href: string;
    icon: React.ReactNode;
    text: string;
    isActive?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({href, icon, text, isActive}) => {
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center p-2 rounded-lg hover:bg-accent transition-colors',
                isActive && 'bg-accent'
            )}
        >
            {icon}
            <span className="ml-3">{text}</span>
        </Link>
    );
};

export default Sidebar;

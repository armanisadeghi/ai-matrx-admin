// components/layout/top-menu.tsx
'use client';

import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import {Bell, Search, PanelLeft, PanelRight, Menu} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {UserNav} from '@/components/user-nav';
import {ModeToggle} from '@/components/layout/mode-toggle';

interface TopMenuProps {
    leftSidebarAvailable: boolean;
    rightSidebarAvailable: boolean;
    toggleLeftSidebar: () => void;
    toggleRightSidebar: () => void;
}

const TopMenu: React.FC<TopMenuProps> = (
    {
        leftSidebarAvailable,
        rightSidebarAvailable,
        toggleLeftSidebar,
        toggleRightSidebar
    }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // or a loading spinner
    }

    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
                <div className="flex items-center space-x-4 md:space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Menu className="h-5 w-5"/>
                        <span className="sr-only">Toggle mobile menu</span>
                    </Button>
                    {leftSidebarAvailable && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLeftSidebar}
                            className="hidden md:inline-flex"
                        >
                            <PanelLeft className="h-5 w-5"/>
                            <span className="sr-only">Toggle left sidebar</span>
                        </Button>
                    )}
                    <Link href="/dashboard" className="flex items-center space-x-2">
                        <span className="font-bold inline-block">Dashboard</span>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="md:w-[300px] lg:w-[400px] h-8 text-sm hidden md:inline-flex"
                    />
                    <nav className="flex items-center space-x-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 px-0">
                            <Bell className="h-4 w-4"/>
                            <span className="sr-only">Notifications</span>
                        </Button>
                        {rightSidebarAvailable && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleRightSidebar}
                                className="h-8 w-8 px-0"
                            >
                                <PanelRight className="h-4 w-4"/>
                                <span className="sr-only">Toggle right sidebar</span>
                            </Button>
                        )}
                        <ModeToggle/>
                        <UserNav/>
                    </nav>
                </div>
            </div>
            {mobileMenuOpen && (
                <div className="md:hidden">
                    {/* Add mobile menu items here */}
                </div>
            )}
        </header>
    );
};

export default TopMenu;

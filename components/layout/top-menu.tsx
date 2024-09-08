// components/layout/top-menu.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bell, PanelRight, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { ModeToggle } from '@/components/layout/mode-toggle';

interface TopMenuProps {
    leftSidebarAvailable: boolean;
    rightSidebarAvailable: boolean;
    toggleRightSidebar: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({
                                             leftSidebarAvailable,
                                             rightSidebarAvailable,
                                             toggleRightSidebar
                                         }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center" style={{ paddingLeft: '0.85rem', margin: '0', padding: '0' }}>
                <div className="flex items-center space-x-1">
                    {leftSidebarAvailable && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:inline-flex ml-1"
                        >
                            <Menu className="h-5 w-5"/>
                            <span className="sr-only">Left sidebar</span>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden ml-1"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Menu className="h-5 w-5"/>
                        <span className="sr-only">Toggle mobile menu</span>
                    </Button>
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
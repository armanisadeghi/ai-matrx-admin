import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { StandaloneThemeSwitcher } from "@/styles/themes/StandaloneThemeSwitcher";
import { LogoHorizontal } from '@/public/MatrixLogo';

const DesktopMenu = () => {
    return (
        <div className="container hidden md:flex h-14 max-w-screen-2xl items-center">
            <div className="flex-shrink-0">
                <LogoHorizontal size="md" />
            </div>

            <nav className="ml-6 space-x-4">
                <a href="#" className="text-foreground/60 hover:text-foreground">Platform</a>
                <a href="#" className="text-foreground/60 hover:text-foreground">Developers</a>
                <a href="#" className="text-foreground/60 hover:text-foreground">Pricing</a>
                <a href="#" className="text-foreground/60 hover:text-foreground">Docs</a>
                <a href="#" className="text-foreground/60 hover:text-foreground">Blog</a>
            </nav>

            <div className="ml-auto flex items-center space-x-3">
                <StandaloneThemeSwitcher initialTheme={'dark'}/>
                <Link href="/dashboard">
                    <Button variant="primary">Dashboard</Button>
                </Link>
                <Link href="/sign-up">
                    <Button>Get Started</Button>
                </Link>
            </div>
        </div>
    );
};

const MobileMenu = () => {
    return (
        <div className="container flex md:hidden h-14 max-w-screen-2xl items-center">
            <div className="flex-shrink-0">
                <LogoHorizontal size="md" />
            </div>

            <div className="ml-auto flex items-center space-x-3">
                <Link href="/dashboard">
                    <Button variant="outline">Dashboard</Button>
                </Link>
                <StandaloneThemeSwitcher initialTheme={'dark'}/>

                <details className="relative">
                    <summary className="list-none">
                        <Button
                            variant="ghost"
                            size="icon"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </summary>

                    <div className="absolute right-0 mt-2 w-48 bg-background border border-border/40 rounded-md shadow-lg">
                        <nav className="py-2">
                            <a href="#" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">Solution</a>
                            <a href="#" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">Developers</a>
                            <a href="#" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">Pricing</a>
                            <a href="#" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">Docs</a>
                            <a href="#" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">Blog</a>
                            <Link href="/dashboard" className="block px-4 py-2 text-foreground/60 hover:text-foreground hover:bg-accent">
                                Dashboard
                            </Link>
                        </nav>
                    </div>
                </details>
            </div>
        </div>
    );
};

const TopMenu = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DesktopMenu />
            <MobileMenu />
        </header>
    );
};

export default TopMenu;

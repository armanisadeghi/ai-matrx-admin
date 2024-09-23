// File: @/components/matrx/PublicTopMenu.tsx
import React from "react";
import { Infinity } from "lucide-react";
import { StandaloneThemeSwitcher } from "@/components/StandaloneThemeSwitcher";
import Link from "next/link";
import { cookies } from 'next/headers';

const PublicTopMenu: React.FC = () => {
    const cookieStore = cookies();
    const theme = cookieStore.get('theme');
    const initialTheme = theme ? theme.value as 'light' | 'dark' : 'dark';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur">
            <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <span className="text-blue-400 text-2xl font-bold flex items-center">
                        <Infinity className="w-8 h-8 mr-2"/>
                        AI Matrix
                    </span>
                    <nav className="hidden md:flex space-x-4">
                        <a href="#" className="text-gray-300 hover:text-white">Solution</a>
                        <a href="#" className="text-gray-300 hover:text-white">Developers</a>
                        <a href="#" className="text-gray-300 hover:text-white">Pricing</a>
                        <a href="#" className="text-gray-300 hover:text-white">Docs</a>
                        <a href="#" className="text-gray-300 hover:text-white">Blog</a>
                    </nav>
                </div>

                <div className="flex items-center space-x-4">
                    <StandaloneThemeSwitcher initialTheme={initialTheme} />
                    <Link href="/dashboard" className="text-gray-300 hover:text-white">
                        Dashboard
                    </Link>
                    <Link href="#" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300">
                        Start your project
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default PublicTopMenu;

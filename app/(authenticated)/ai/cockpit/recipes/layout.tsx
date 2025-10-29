"use client";

import { ModuleHeader } from '@/components/layout/new-layout/PageSpecificHeader';

const pages = [
    { 
        title: 'All Recipes', 
        path: '/ai/cockpit/recipes',
        relative: false,
        description: 'Manage your AI recipes'
    },
];

export default function RecipesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full">
            <ModuleHeader
                pages={pages}
                currentPath={currentPath}
                moduleHome="/ai/cockpit/recipes"
                moduleName="Recipes"
            />
            <main className="w-full flex-1 min-h-0 bg-textured overflow-hidden">
                {children}
            </main>
        </div>
    );
}


// /layout.tsx

import ResponsiveModuleHeaderWithProvider from '@/components/matrx/navigation/ResponsiveModuleHeaderWithProvider';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-matrx-card-background">
                <ResponsiveModuleHeaderWithProvider
                    pages={filteredPages}
                    currentPath={currentPath}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <main className="w-full h-full bg-gray-100 dark:bg-neutral-800">
                {children}
            </main>
        </div>
    );
}

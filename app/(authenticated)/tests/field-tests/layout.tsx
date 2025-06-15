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
        <div className="flex flex-col h-full bg-background">
            <div className="sticky top-0 z-10 bg-matrx-card-background">
                <ResponsiveModuleHeaderWithProvider
                    pages={filteredPages}
                    currentPath={currentPath}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <main className="flex-1 overflow-auto bg-background/80">
                {children}
            </main>
        </div>
    );
}

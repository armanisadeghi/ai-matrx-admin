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
            <main className="flex-1 overflow-auto bg-background/80">
                {children}
            </main>
        </div>
    );
}

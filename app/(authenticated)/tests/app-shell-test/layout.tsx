// /app/(authenticated)/tests/app-shell-test/layout.tsx

import {ModuleHeaderWithProvider} from '@/components/matrx/navigation';
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
            <ModuleHeaderWithProvider
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
            />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

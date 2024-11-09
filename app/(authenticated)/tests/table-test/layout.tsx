// app/(authenticated)/tests/table-test/layout.tsx

import {ModuleHeader} from '@/components/matrx/navigation';
import {filteredPages} from './config';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const MODULE_HOME = '/tests/table-test';
    const MODULE_NAME = 'Table Test Module';

    return (
        <div className="flex flex-col h-full">
            <ModuleHeader
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

// app/(authenticated)/tests/table-test/layout.tsx
import {useSelectedLayoutSegments} from 'next/navigation';
import {ModuleHeader} from '@/components/matrx/navigation';
import { filteredPages, MODULE_HOME, MODULE_NAME } from './config';

export default function Layout({
                                   children,
                               }: {
    children: React.ReactNode;
}) {
    const MODULE_PATH = '/tests/table-test';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full">
            <ModuleHeader
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                modulePath={MODULE_PATH}
                moduleName={MODULE_NAME}
            />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

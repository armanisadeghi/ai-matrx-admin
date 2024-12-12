// app/(authenticated)/tests/notes-app/layout.tsx
'use client';
import {ModuleHeader} from '@/components/matrx/navigation';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';
import {NotesManagerProvider} from '@/contexts/NotesManagerContext';
import {StorageProvider} from '@/providers/StorageProvider';

export default function NotesLayout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <ModuleHeader
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
                className="sticky top-0 z-10"
            />
            <main className="flex-1 overflow-hidden">
                <StorageProvider>
                <NotesManagerProvider>
                        {children}
                    </NotesManagerProvider>
                </StorageProvider>
            </main>
        </div>
    );
}






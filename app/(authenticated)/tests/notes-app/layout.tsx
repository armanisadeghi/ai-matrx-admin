// app/(authenticated)/tests/notes-app/layout.tsx
'use client';
import {NotesManagerProvider} from '@/contexts/NotesManagerContext';
import { ModuleHeader } from '@/components/layout/new-layout/PageSpecificHeader';
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
            <ModuleHeader
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
            />
            <main className="flex-1 overflow-hidden">
                <NotesManagerProvider>
                    {children}
                </NotesManagerProvider>
            </main>
        </div>
    );
}
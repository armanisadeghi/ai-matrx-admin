// /layout.tsx
import { ModuleHeader } from '@/components/layout/new-layout/PageSpecificHeader';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

// Force dynamic rendering for all demo pages to avoid build timeouts
export const dynamic = 'force-dynamic';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    // No need for typeof window check in server component
    // The currentPath will be handled by ModuleHeader internally
    return (
        <div className="flex flex-col h-page">
            <ModuleHeader
                pages={filteredPages}
                currentPath="" // Empty string - let ModuleHeader handle it client-side
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
            />
            <main className="w-full h-full bg-textured">
                {children}
            </main>
        </div>
    );
}

// /layout.tsx
import { ModuleHeader } from '@/components/layout/new-layout/PageSpecificHeader';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';
import { EntityPack } from '@/providers/packs/EntityPack';

// Force dynamic rendering for all demo pages to avoid build timeouts
export const dynamic = 'force-dynamic';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    return (
        <EntityPack>
            <div className="flex flex-col h-page">
                <ModuleHeader
                    pages={filteredPages}
                    currentPath=""
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
                <main className="w-full h-full bg-textured">
                    {children}
                </main>
            </div>
        </EntityPack>
    );
}

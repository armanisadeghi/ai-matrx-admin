// /layout.tsx

import ModuleHeaderWithProvider from '@/components/matrx/navigation/module-header/ModuleHeader';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {

    return (
        <div className="flex flex-col h-full">
            <ModuleHeaderWithProvider
                pages={filteredPages}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
            />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

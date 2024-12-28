// /layout.tsx

import ModuleHeaderWithProvider from '@/components/matrx/navigation/module-header/ModuleHeader';
import { filteredPages, MODULE_HOME, MODULE_NAME} from './config/config';
import React from "react";

export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-50">
                <ModuleHeaderWithProvider
                    pages={filteredPages}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
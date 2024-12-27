// /layout.tsx

import {ModuleHeader} from '@/components/matrx/navigation';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {

    return (
        <div className="flex flex-col h-full">
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

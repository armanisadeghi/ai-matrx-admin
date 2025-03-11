// /layout.tsx

import { ModuleHeader } from "@/components/matrx/navigation";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";

export default function Layout({ children }: { children: React.ReactNode }) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <ModuleHeader pages={filteredPages} currentPath={currentPath} moduleHome={MODULE_HOME} moduleName={MODULE_NAME} />
            <main className="flex-1 overflow-auto scrollbar-hide">{children}</main>
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: "",
                }}
            >
                <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="message" />
            </MatrxDynamicPanel>
        </div>
    );
}

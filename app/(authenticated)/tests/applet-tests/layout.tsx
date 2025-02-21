// /layout.tsx
"use client";

import ModuleHeaderWithProvider from "@/components/matrx/navigation/module-header/ModuleHeader";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";
import React from "react";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Layout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
            {/* <div className="sticky top-0 z-50">
                <ModuleHeaderWithProvider
                    pages={filteredPages}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div> */}
            <main className="flex-1">{children}</main>

            {!isMobile && (
                <MatrxDynamicPanel
                    initialPosition="left"
                    defaultExpanded={false}
                    expandButtonProps={{
                        label: "Entity State",
                    }}
                >
                    <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="brokerValue" />
                </MatrxDynamicPanel>
            )}
        </div>
    );
}

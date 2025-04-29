// app\(authenticated)\apps\dynamic-layouts\[id]\page.tsx
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import AppletLayoutWrapper from "../../../../../features/applet/layouts/core/LayoutWrapper";
import LayoutSelector from "./LayoutSelector";
import { travelAgentAppConfig } from "@/features/applet/sample-mock-data/constants";


export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const layoutId = resolvedParams.id;
    const fullAppConfig = travelAgentAppConfig;
    
    return (
        <>
            <CustomAppHeader config={fullAppConfig} />
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <div className="w-full px-4 py-3">
                    <div className="max-w-lg">
                        <LayoutSelector 
                            currentLayout={layoutId} 
                        />
                    </div>
                </div>
                <AppletLayoutWrapper layoutType={layoutId} />
            </div>
        </>
    );
}
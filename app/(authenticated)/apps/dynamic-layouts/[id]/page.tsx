// app\(authenticated)\apps\dynamic-layouts\[id]\page.tsx
import { CustomAppHeader } from "@/features/applet/runner/header";
import AppletLayoutWrapper from "@/features/applet/runner/layouts/core/AppletLayoutWrapper";
import LayoutSelector from "./LayoutSelector";
import { AppletLayoutOption } from "@/types/customAppTypes";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const layoutId = resolvedParams.id as AppletLayoutOption;
    
    return (
        <>
            <CustomAppHeader />
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <div className="w-full px-4 py-3">
                    <div className="max-w-lg">
                        <LayoutSelector 
                            currentLayout={layoutId} 
                        />
                    </div>
                </div>
                <AppletLayoutWrapper layoutTypeOverride={layoutId} />
            </div>
        </>
    );
}
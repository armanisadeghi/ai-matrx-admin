// app\(authenticated)\apps\dynamic-layouts\[id]\page.tsx
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { AppletLayoutWrapper } from "@/features/applet/layouts/core";
import LayoutSelector from "./LayoutSelector";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

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
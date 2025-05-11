// app\(authenticated)\apps\dynamic-layouts\[id]\page.tsx

import { AppletLayoutOption } from "@/types/customAppTypes";
import AppDemoManager from "@/features/applet/demo/AppDemoManager";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const layoutId = resolvedParams.id as AppletLayoutOption;
    const appSlug = "test-applet";
    const appletId = "da4b93ac-176d-466c-bb13-c627d8def0c9";
    
    return (
        <AppDemoManager appSlug={appSlug} appletId={appletId} layoutTypeOverride={layoutId} />

    );
}
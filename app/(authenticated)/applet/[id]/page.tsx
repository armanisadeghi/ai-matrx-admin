// app/apps/[category]/[subcategory]/page.tsx
import { notFound } from "next/navigation";

import { AppletViewOne } from "@/components/applet/applets/AppletViewOne";
import ThemeClassesPreloader from "@/components/mardown-display/ThemeClassesPreloader";
interface AppletPageParams {
    id: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}

export default async function AppletPage({ params }: AppletPageProps) {
    const { id } = await params;

    return (
        <div className="h-full w-full bg-gray-100 dark:bg-gray-800">
            <ThemeClassesPreloader />
            <div className="bg-gray-100 dark:bg-gray-800">
                <AppletViewOne appletId={id} />
            </div>
        </div>
    );
}

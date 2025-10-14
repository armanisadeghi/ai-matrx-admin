// app/(authenticated)/apps/debug/admin/[slug]/layout.tsx

import React from "react";
import { fetchAppBySlug } from "@/utils/supabase/fetchAppAndAppletConfig";

type LayoutProps = {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
};

export default async function Layout({ children, params }: LayoutProps) {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    // Fetch the app and applet configuration once at the layout level
    const appConfig = await fetchAppBySlug(slug);

    return (
        <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
            <div className="h-full w-full">
                {/* Create a hidden data element to store the configuration if config exists */}
                {appConfig && (
                    <script
                        type="application/json"
                        id="app-config-data"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                appConfig: appConfig,
                            }),
                        }}
                    />
                )}
                {children}
            </div>
        </div>
    );
}

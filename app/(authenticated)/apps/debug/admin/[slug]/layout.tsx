// app/(authenticated)/apps/debug/admin/[slug]/layout.tsx

import React from "react";

type LayoutProps = {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
};

export default async function Layout({ children }: LayoutProps) {
    return (
        <div className="h-full w-full bg-textured transition-colors">
            <div className="h-full w-full">
                {children}
            </div>
        </div>
    );
}

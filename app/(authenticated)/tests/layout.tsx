// File Location: @app/tests/layout.tsx

'use client';

import React from "react";
import { WindowLayout, NormalLayout } from "@/components/layout/baseLayout";
import { appSidebarLinks } from "@/constants";
import { LayoutWithSidebar } from "@/components/layout/new-layout";

function Layout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const links = appSidebarLinks;
    const LayoutComponent = NormalLayout;

    const layoutProps = { primaryLinks: links, open, setOpen };

    return (
        <LayoutWithSidebar {...layoutProps}>
                {children}
        </LayoutWithSidebar>
    );
}

export default Layout;

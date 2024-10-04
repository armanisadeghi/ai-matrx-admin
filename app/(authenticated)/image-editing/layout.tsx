// File Location: @app/(authenticated)/test/layout.tsx

'use client';

import React from "react";
import {ExtendedBottomLayout, NormalLayout, WindowLayout} from "@/components/layout/baseLayout";
import {appSidebarLinks} from "@/constants";


function DashboardLayout({children, links}: any) {
    const [open, setOpen] = React.useState(false);

    if (!links) links = appSidebarLinks;

    // For testing, we'll use NormalLayout
    const LayoutComponent = NormalLayout;

    const layoutProps = {links, open, setOpen};

    return (
        <LayoutComponent {...layoutProps}>
            {children}
        </LayoutComponent>
    );
}

export default DashboardLayout;

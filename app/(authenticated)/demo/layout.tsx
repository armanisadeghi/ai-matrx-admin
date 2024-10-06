// app/(authenticated)/demo/layout.tsx
'use client';

import React from "react";
import {WindowLayout, NormalLayout} from "@/components/layout/baseLayout";
import {appSidebarLinks} from "@/constants";


function Layout({children, links}: any) {
    const [open, setOpen] = React.useState(false);

    if (!links) links = appSidebarLinks;
    const LayoutComponent = NormalLayout;

    const layoutProps = {links, open, setOpen};

    return (
        <LayoutComponent {...layoutProps}>
            {children}
        </LayoutComponent>
    );
}

export default Layout;

// File Location: @app/playground/layout.tsx

'use client';

import React from "react";
import {ExtendedBottomLayout, NormalLayout, WindowLayout} from "@/components/layout/base-layout";
import {coreAppLinks} from "@/components/layout/core-links";

function Layout({children, links}: any) {
    const [open, setOpen] = React.useState(false);

    if (!links) links = coreAppLinks;
    const LayoutComponent = WindowLayout;

    const layoutProps = {links, open, setOpen};

    return (
        <LayoutComponent {...layoutProps}>
            {children}
        </LayoutComponent>
    );
}

export default Layout;

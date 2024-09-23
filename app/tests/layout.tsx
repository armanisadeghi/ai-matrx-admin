// File Location: @app/tests/layout.tsx

'use client';

import React from "react";
import {ExtendedBottomLayout, NormalLayout, WindowLayout} from "@/components/layout/base-layout";
import {coreAppLinks} from "@/components/layout/core-links";
import {AuthProvider} from "@/lib/AuthProvider";
import {Providers} from "@/app/Providers";

function Layout({children, links}: any) {
    const [open, setOpen] = React.useState(false);

    if (!links) links = coreAppLinks;
    const LayoutComponent = NormalLayout;

    const layoutProps = {links, open, setOpen};

    return (
        <AuthProvider>
            <Providers>
                <LayoutComponent {...layoutProps}>
                    {children}
                </LayoutComponent>
            </Providers>
        </AuthProvider>


    );
}

export default Layout;

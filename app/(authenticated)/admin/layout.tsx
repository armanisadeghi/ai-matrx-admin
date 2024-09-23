// File Location: @app/admin/layout.tsx

'use client';

import React from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/redux/store";
import {ExtendedBottomLayout, NormalLayout, WindowLayout} from "@/components/layout/base-layout";

function DashboardLayout({children, links}: any) {

    const [open, setOpen] = React.useState(false);
    const isInWindow = useSelector((state: RootState) => state.layout.isInWindow);
    const layoutStyle = useSelector((state: RootState) => state.layout.layoutStyle);

    const LayoutComponent = (() => {
        if (isInWindow) return WindowLayout;
        switch (layoutStyle) {
            case 'extendedBottom':
                return ExtendedBottomLayout;
            case 'window':
                return WindowLayout;
            default:
                return NormalLayout;
        }
    })();

    const layoutProps = isInWindow
        ? {}
        : {links, open, setOpen};

    return (
        <LayoutComponent {...layoutProps}>
            {children}
        </LayoutComponent>
    );
}

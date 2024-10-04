// File Location: @app/admin/layout.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { ExtendedBottomLayout, NormalLayout, WindowLayout } from "@/components/layout/baseLayout";
import {supabase} from "@/utils/supabase/client";

function AuthenticatedLayout({ children, links }: any) {
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setIsLoading(false);
            }
        };

        checkUser();
    }, [router]);

    const [open, setOpen] = useState(false);
    const isInWindow = useSelector((state: RootState) => state.layout.isInWindow);
    const layoutStyle = useSelector((state: RootState) => state.layout.layoutStyle);

    if (isLoading) {
        return <div>Loading...</div>;
    }

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
        : { links, open, setOpen };

    return (
        <LayoutComponent {...layoutProps}>
            {children}
        </LayoutComponent>
    );
}

export default AuthenticatedLayout;

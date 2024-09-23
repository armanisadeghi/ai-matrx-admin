// app/(authenticated)/layout.tsx

import React from 'react';
import {AuthProvider} from "@/providers/AuthProvider";
import {Providers} from "@/app/Providers";

function AuthenticatedLayout({children, links}: any) {
    return (
        <AuthProvider>
            <Providers>{children}</Providers>
        </AuthProvider>
    );
}

export default AuthenticatedLayout;

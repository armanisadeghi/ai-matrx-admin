import { ReactNode } from "react";
import AppBuilderLayoutClient from "./layout-client";

// Force dynamic rendering for app-builder pages to avoid build timeouts
export const dynamic = 'force-dynamic';

interface AppBuilderLayoutProps {
    children: ReactNode;
}

export default function AppBuilderLayout({ children }: AppBuilderLayoutProps) {
    return <AppBuilderLayoutClient>{children}</AppBuilderLayoutClient>;
}

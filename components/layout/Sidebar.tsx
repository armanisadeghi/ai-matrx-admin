// File: components/Sidebar.tsx

'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';
import { Sidebar as SidebarComponent, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Logo, LogoIcon } from "@/components/layout/MatrixLogo";
import { ThemeSwitcher } from "@/styles/themes";
import { User } from "lucide-react";
import React from "react";

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    links: Array<{
        label: string;
        href: string;
        icon: React.ReactNode;
    }>;
}

function Sidebar({ open, setOpen, links }: SidebarProps) {
    const user = useSelector((state: RootState) => state.user);

    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split('@')[0] || "User";

    return (
        <SidebarComponent open={open} setOpen={setOpen}>
            <SidebarBody className="flex flex-col h-full justify-between">
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                    {open ? <Logo /> : <LogoIcon />}
                    <div className="mt-8 flex flex-col gap-2">
                        {links.map((link, idx) => (
                            <SidebarLink key={idx} link={link} />
                        ))}
                    </div>
                </div>
                <div className="mt-auto pt-4 flex flex-col gap-4">
                    <ThemeSwitcher className="h-6 w-6 text-foreground" />
                    <SidebarLink
                        link={{
                            label: displayName,
                            href: "/dashboard/profile",
                            icon: (
                                <User className="h-6 w-6 text-foreground" />
                            ),
                        }}
                    />
                </div>
            </SidebarBody>
        </SidebarComponent>
    );
}

export default Sidebar;

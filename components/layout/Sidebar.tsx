// File: components/Sidebar.tsx

'use client';

import {useSelector} from 'react-redux';
import {RootState} from '@/lib/redux/store';
import {Sidebar as SidebarComponent, SidebarBody, SidebarLink} from "@/components/ui/sidebar-collapsible";
import {Logo, LogoIcon} from "@/components/layout/MatrixLogo";
import {ThemeSwitcher} from "@/styles/themes";
import {User, Settings} from "lucide-react";
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

function Sidebar({open, setOpen, links}: SidebarProps) {
    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split('@')[0] || "User";

    return (
        <SidebarComponent open={open} setOpen={setOpen}>

            {/* Section behind most of sidebar. Starts above links and ends after */}
            <SidebarBody className="flex flex-col h-full justify-between scrollbar-hide">
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div className="flex justify-center mt-2">
                        {open ? <Logo/> : <LogoIcon/>}
                    </div>

                    {/* Section with links and icons */}
                    <div className="mt-6 flex flex-col">
                        {links.map((link, idx) => (
                            <SidebarLink key={idx} link={link}/>
                        ))}
                    </div>
                </div>

                {/* Section at the bottom with light/dark and user icon */}
                <div className={`mt-auto flex flex-col ${open ? 'items-start pl-4' : 'items-center'}`}>
                    <ThemeSwitcher/>
                    <SidebarLink
                        link={{
                            label: "Settings",
                            href: "/use/settings",
                            icon: (<Settings className="h-5 w-5 text-foreground"/>),
                        }}
                    />
                    <SidebarLink
                        link={{
                            label: displayName,
                            href: "/dashboard/profile",
                            icon: (<User className="h-5 w-5 text-foreground"/>),
                        }}
                    />
                </div>
            </SidebarBody>
        </SidebarComponent>
    );
}

export default Sidebar;

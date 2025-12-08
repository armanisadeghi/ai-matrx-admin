"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import UserAvatar from "@/components/layout/UserAvatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@iconify/react";

interface UserProfileDropdownProps {
    className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = "" }) => {
    // Get user data from Redux store
    const user = useSelector((state: RootState) => state.user);

    // Determine display name using the same logic from UserAvatar
    const displayName = user.userMetadata?.name || user.userMetadata?.fullName || user.email?.split("@")[0] || "User";

    // Get email and profile photo
    const email = user.email || "";
    const profilePhoto = user.userMetadata?.picture || null;

    return (
        <div className={`flex flex-col ${className}`}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-[60px] w-full justify-start gap-3 rounded-[14px] px-3 py-[10px]"
                    >
                        <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserAvatar size={32} />
                                <div className="flex flex-col text-left my-auto h-8 justify-center">
                                    <p className="text-sm font-semibold text-foreground leading-tight m-0">{displayName}</p>
                                    <p className="text-xs text-muted-foreground leading-tight m-0">{email}</p>
                                </div>
                            </div>
                            <Icon icon="heroicons:chevron-up-down" className="text-muted-foreground" width={16} height={16} />
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[210px]" align="end">
                    <div className="flex items-center gap-3 p-2">
                        <UserAvatar size={32} />
                        <div className="flex flex-col text-left">
                            <p className="text-sm font-normal text-foreground leading-tight">{displayName}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{email}</p>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Icon icon="heroicons:credit-card" width={16} height={16} className="mr-2" />
                        My Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Icon icon="heroicons:cube" width={16} height={16} className="mr-2" />
                        My GPTs
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Icon icon="heroicons:adjustments-horizontal" width={16} height={16} className="mr-2" />
                        Customize AcmeAI
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Icon icon="heroicons:cog-6-tooth" width={16} height={16} className="mr-2" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Icon icon="heroicons:arrow-down-tray" width={16} height={16} className="mr-2" />
                        Download Desktop App
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Icon icon="heroicons:question-mark-circle" width={16} height={16} className="mr-2" />
                        Help & Feedback
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Icon icon="heroicons:arrow-right-on-rectangle" width={16} height={16} className="mr-2" />
                        Log Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default UserProfileDropdown;

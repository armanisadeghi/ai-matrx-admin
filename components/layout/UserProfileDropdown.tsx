"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import UserAvatar from "@/components/layout/UserAvatar";
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/react";
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
            <Dropdown placement="bottom-end">
                <DropdownTrigger>
                    <Button
                        fullWidth
                        className="h-[60px] justify-start gap-3 rounded-[14px] border-1 border-default-300 bg-transparent px-3 py-[10px]"
                    >
                        <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserAvatar size={32} />
                                <div className="flex flex-col text-left my-auto h-8 justify-center">
                                    <p className="text-small font-semibold text-foreground leading-tight m-0">{displayName}</p>
                                    <p className="text-tiny text-default-400 leading-tight m-0">{email}</p>
                                </div>
                            </div>
                            <Icon icon="heroicons:chevron-up-down" className="text-default-400" width={16} height={16} />
                        </div>
                    </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" className="w-[210px] bg-content1 px-[8px] py-[8px]" variant="flat">
                    <DropdownItem key="profile" className="h-14">
                        <div className="flex w-full items-center gap-3">
                            <UserAvatar size={32} />
                            <div className="flex flex-col text-left my-auto h-8 justify-center">
                                <p className="text-small font-normal text-foreground leading-tight m-0">{displayName}</p>
                                <p className="text-tiny text-default-400 leading-tight m-0">{email}</p>
                            </div>
                        </div>
                    </DropdownItem>
                    <DropdownSection showDivider aria-label="profile-section-1" className="px-0">
                        <DropdownItem key="my-plan" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:credit-card" width={16} height={16} />
                                My Plan
                            </div>
                        </DropdownItem>
                        <DropdownItem key="my-gpts" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:cube" width={16} height={16} />
                                My GPTs
                            </div>
                        </DropdownItem>
                        <DropdownItem key="customize-acmeai" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:adjustments-horizontal" width={16} height={16} />
                                Customize AcmeAI
                            </div>
                        </DropdownItem>
                    </DropdownSection>
                    <DropdownSection showDivider aria-label="profile-section-2">
                        <DropdownItem key="settings" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:cog-6-tooth" width={16} height={16} />
                                Settings
                            </div>
                        </DropdownItem>
                        <DropdownItem key="download-desktop-app" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:arrow-down-tray" width={16} height={16} />
                                Download Desktop App
                            </div>
                        </DropdownItem>
                    </DropdownSection>
                    <DropdownSection aria-label="profile-section-3" className="mb-0">
                        <DropdownItem key="help-and-feedback" className="py-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:question-mark-circle" width={16} height={16} />
                                Help & Feedback
                            </div>
                        </DropdownItem>
                        <DropdownItem key="logout" className="pt-[4px] text-default-500">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:arrow-right-on-rectangle" width={16} height={16} />
                                Log Out
                            </div>
                        </DropdownItem>
                    </DropdownSection>
                </DropdownMenu>
            </Dropdown>
        </div>
    );
};

export default UserProfileDropdown;

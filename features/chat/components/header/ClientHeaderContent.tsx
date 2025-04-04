"use client";
import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { ThemeSwitcherIcon } from "@/styles/themes/ThemeSwitcher";
import { TbListSearch } from "react-icons/tb";
import Link from "next/link";
import { IoCreateOutline } from "react-icons/io5";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch } from "@/lib/redux";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConversationSearchOverlay } from "@/features/chat/components/conversations/ConversationSearchOverlay";

interface ClientHeaderContentProps {
    baseRoute?: string;
}

const ClientHeaderContent: React.FC<ClientHeaderContentProps> = ({ baseRoute = "/chat" }) => {
    const dispatch = useAppDispatch();
    const chatActions = getChatActionsWithThunks();
    const isMobile = useIsMobile();
    
    // State for the search overlay
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    useEffect(() => {
        dispatch(chatActions.initialize());
    }, []);
    
    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata?.name || user.userMetadata?.fullName || user.email?.split("@")[0] || "User";
    const profilePhoto = user.userMetadata?.picture || null;
    
    // Handle opening and closing the search overlay
    const handleOpenSearch = () => {
        setIsSearchOpen(true);
    };
    
    const handleCloseSearch = () => {
        setIsSearchOpen(false);
    };
    
    return (
        <>
            <div className={`flex items-center ${isMobile ? 'pr-10 -pt-2 space-x-2' : 'space-x-3'}`}>
                {/* New Chat Button */}
                <Link href={`${baseRoute}`}>
                    <button className="p-1.5 rounded-full text-gray-800 dark:text-gray-200 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
                        <IoCreateOutline size={22} />
                    </button>
                </Link>
                
                {/* Theme Switcher */}
                <ThemeSwitcherIcon className="p-0.5" />
                
                {/* Search Button - Opens the Search Overlay */}
                <button 
                    className="p-1.5 rounded-full text-gray-800 dark:text-gray-200 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800"
                    onClick={handleOpenSearch}
                    aria-label="Search conversations"
                >
                    <TbListSearch size={22} />
                </button>
                
                {/* Profile */}
                <button className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                    {profilePhoto ? (
                        <Image
                            src={profilePhoto || "/happy-robot-avatar.jpg"}
                            className="h-5 w-5 rounded-full"
                            width={22}
                            height={22}
                            alt={`${displayName}'s profile`}
                        />
                    ) : (
                        <div className="h-5 w-5 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{displayName.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                </button>
            </div>
            
            {/* Conversation Search Overlay */}
            <ConversationSearchOverlay 
                isOpen={isSearchOpen}
                onClose={handleCloseSearch}
            />
        </>
    );
};

export default ClientHeaderContent;
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

const ClientHeaderContent: React.FC<ClientHeaderContentProps> = ({ baseRoute = "/dashboard" }) => {
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
            <div className={`flex items-center ${isMobile ? 'pr-10 -pt-2 space-x-3' : 'space-x-3'}`}>
                {/* New Chat Button */}
                <Link href={`${baseRoute}`}>
                    <button className={`rounded-full text-foreground hover:bg-accent ${
                        isMobile ? 'p-3' : 'p-1.5'
                    }`}>
                        <IoCreateOutline size={24} />
                    </button>
                </Link>
                
                {/* Search Button - Opens the Search Overlay */}
                <button 
                    className={`rounded-full text-foreground hover:bg-accent ${
                        isMobile ? 'p-3' : 'p-1.5'
                    }`}
                    onClick={handleOpenSearch}
                    aria-label="Search conversations"
                >
                    <TbListSearch size={24} />
                </button>
                
                {/* Theme Switcher */}
                <div className={`${isMobile ? 'p-1.5' : 'p-0'}`}>
                    <ThemeSwitcherIcon className={`${isMobile ? 'p-1.5' : 'p-0.5'}`} />
                </div>
                
                {/* Profile */}
                <button className={`rounded-full bg-accent ${
                    isMobile ? 'p-3' : 'p-1.5'
                }`}>
                    {profilePhoto ? (
                        <Image
                            src={profilePhoto || "/happy-robot-avatar.jpg"}
                            className="h-5 w-5 rounded-full"
                            width={24}
                            height={24}
                            alt={`${displayName}'s profile`}
                        />
                    ) : (
                        <div className="h-5 w-5 flex items-center justify-center">
                            <span className="text-xs font-medium text-foreground">{displayName.charAt(0).toUpperCase()}</span>
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
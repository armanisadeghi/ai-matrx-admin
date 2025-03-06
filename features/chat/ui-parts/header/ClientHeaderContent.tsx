// File: features/chat/ui-parts/layout/ClientHeaderContent.tsx

'use client';

import React from "react";
import { Bell, MessageSquare } from "lucide-react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { ThemeSwitcherIcon } from "@/styles/themes/ThemeSwitcher";
import { TbListSearch } from "react-icons/tb";

const ClientHeaderContent: React.FC = () => {
  // Get user data from Redux store
  const user = useSelector((state: RootState) => state.user);
  const displayName = user.userMetadata?.name || user.userMetadata?.fullName || 
                     (user.email?.split('@')[0]) || "User";
  const profilePhoto = user.userMetadata?.picture || null;

  return (
    <div className="flex items-center space-x-3">
      {/* Theme Switcher */}
      <ThemeSwitcherIcon className="p-0.5" />
      
      <button className="p-1.5 rounded-full text-gray-800 dark:text-gray-200 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
        <Bell size={18} />
      </button>
      <button className="p-1.5 rounded-full text-gray-800 dark:text-gray-200 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
        <TbListSearch size={18} />
      </button>
      <button className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
        {profilePhoto ? (
          <Image
            src={profilePhoto || "/happy-robot-avatar.jpg"}
            className="h-5 w-5 rounded-full"
            width={20}
            height={20}
            alt={`${displayName}'s profile`}
          />
        ) : (
          <div className="h-5 w-5 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

export default ClientHeaderContent;
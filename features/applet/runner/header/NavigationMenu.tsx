"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Menu, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { adminNavigationLinks, navigationLinks } from "@/constants/navigation-links";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/styles/themes/utils";

// Custom SubTrigger without the right chevron
const CustomSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
  </DropdownMenuPrimitive.SubTrigger>
));
CustomSubTrigger.displayName = "CustomSubTrigger";

interface NavigationItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  profileMenu?: boolean;
  dashboard?: boolean;
}

interface NavigationMenuProps {
  customLinks?: NavigationItem[];
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  position?: "left" | "right";
  mobileBreakpoint?: "sm" | "md" | "lg";
}

export const ADMIN_USER_IDS = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
];

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  customLinks,
  triggerClassName = "",
  contentClassName = "",
  itemClassName = "",
  position = "right",
  mobileBreakpoint = "md",
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const user = useAppSelector((state: RootState) => state.user);
  const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
  const profilePhoto = user.userMetadata.picture || null;
  const isAdmin = ADMIN_USER_IDS.includes(user.id);

  // Filter navigation links to only show those with profileMenu: true
  const defaultFilteredLinks = navigationLinks.filter(link => link.profileMenu);
  
  // Use custom links if provided, otherwise use default filtered links
  const menuLinks = customLinks || defaultFilteredLinks;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`flex items-center rounded-full pl-2 pr-1 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-pointer focus:outline-none ${triggerClassName}`}
        >
          <Menu size={18} className="ml-2 text-gray-600 dark:text-gray-400" />
          {profilePhoto ? (
            <div className="w-8 h-8 rounded-full ml-3 overflow-hidden">
              <Image 
                src={profilePhoto} 
                width={32} 
                height={32} 
                alt={displayName} 
                className="w-full h-full object-cover" 
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full ml-3 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={`w-56 ${contentClassName}`} 
        align={position === "right" ? "end" : "start"}
      >
        {/* User info section */}
        <div className="px-2 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-t-md">
          <div className="flex items-center gap-3">
            {profilePhoto ? (
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image 
                  src={profilePhoto} 
                  width={40} 
                  height={40} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-500 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {displayName}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Navigation links */}
        {menuLinks.map((link, index) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link
              href={link.href}
              className={`flex items-center gap-3 w-full px-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${itemClassName}`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {link.icon}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {link.label}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        
        {/* Admin section - only show if user is admin */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Admin
              </span>
            </div>
            
            {/* Group admin links by category */}
            {(() => {
              const categories = Array.from(new Set(adminNavigationLinks.map(link => link.category)));
              return categories.map((category) => {
                const categoryLinks = adminNavigationLinks.filter(link => link.category === category);
                
                // If category is "primary", show links directly without submenu
                if (category === "primary") {
                  return categoryLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 w-full px-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${itemClassName}`}
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          {link.icon}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {link.label}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ));
                }
                
                // For other categories, create submenus
                return (
                  <DropdownMenuSub key={category}>
                    <CustomSubTrigger 
                      className="px-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {category}
                        </span>
                      </div>
                    </CustomSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent 
                        className="w-64"
                        sideOffset={2}
                        alignOffset={-5}
                      >
                        {categoryLinks.map((link) => (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link
                              href={link.href}
                              className="flex items-center gap-3 w-full px-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                {link.icon}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                {link.label}
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                );
              });
            })()}
          </>
        )}
        
        {/* Sign out section */}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/logout"
            className="flex items-center gap-3 w-full px-2 py-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
              />
            </svg>
            <span className="text-sm font-medium">Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavigationMenu;
"use client";
import React from "react";
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
import { ChevronLeft, Crown } from "lucide-react";
import Link from "next/link";
import { adminNavigationLinks } from "@/constants/navigation-links";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/styles/themes/utils";

// Custom SubTrigger without the right chevron
const CustomSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
        inset?: boolean;
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


// Admin Menu component - Extract this to make the code more manageable
interface AdminMenuProps {
    isAdmin: boolean;
    itemClassName: string;
}

export const AdminMenu: React.FC<AdminMenuProps> = ({ isAdmin, itemClassName }) => {
    if (!isAdmin) return null;

    return (
        <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Admin</span>
            </div>

            {/* Group admin links by category */}
            {(() => {
                const categories = Array.from(new Set(adminNavigationLinks.map((link) => link.category)));
                return categories.map((category) => {
                    const categoryLinks = adminNavigationLinks.filter((link) => link.category === category);

                    // If category is "primary", show links directly without submenu
                    if (category === "primary") {
                        return categoryLinks.map((link) => (
                            <DropdownMenuItem key={link.href} asChild>
                                <Link
                                    href={link.href}
                                    className={`flex items-center gap-3 w-full px-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${itemClassName}`}
                                >
                                    <div className="w-5 h-5 flex items-center justify-center">{link.icon}</div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{link.label}</span>
                                </Link>
                            </DropdownMenuItem>
                        ));
                    }

                    // For other categories, create submenus
                    return (
                        <DropdownMenuSub key={category}>
                            <CustomSubTrigger className="px-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{category}</span>
                                </div>
                            </CustomSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-64" sideOffset={2} alignOffset={-5}>
                                    {categoryLinks.map((link) => (
                                        <DropdownMenuItem key={link.href} asChild>
                                            <Link
                                                href={link.href}
                                                className="flex items-center gap-3 w-full px-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center">{link.icon}</div>
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
    );
};

export default AdminMenu;

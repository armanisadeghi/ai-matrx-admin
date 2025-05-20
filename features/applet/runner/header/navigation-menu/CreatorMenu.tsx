"use client";
import React from "react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Crown, FileText, Server, Cpu, Paintbrush, Code, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";
import {
    selectTaskFirstListenerId,
    selectCurrentTaskId,
    selectCurrentTaskFirstListenerId,
} from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectResponseEndedByListenerId, selectResponseTextByListenerId } from "@/lib/redux/socket-io";
import { openOverlay, selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";

// Creator Menu component
export const CreatorMenu: React.FC = () => {
    const dispatch = useAppDispatch();

    // Get user role information from Redux
    const userIsCreator = useAppSelector((state) => brokerSelectors.selectValue(state, "APPLET_USER_IS_ADMIN"));
    const isAdmin = useAppSelector((state) => brokerSelectors.selectValue(state, "GLOBAL_USER_IS_ADMIN"));

    // If user is neither a creator nor admin, don't render anything
    if (!userIsCreator && !isAdmin) return null;

    // Get the current task ID and its first listener
    const currentTaskId = useAppSelector(selectCurrentTaskId);
    const firstListenerId = useAppSelector(selectCurrentTaskFirstListenerId);
    const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));

    // Determine if we have valid context for context-sensitive tools
    const hasValidContext = Boolean(firstListenerId && textResponse);

    // All menu items combined in a single array
    const menuItems = [
        // Admin tools/overlays
        {
            id: "brokerState",
            icon: <Cpu className="h-4 w-4 text-teal-500" />,
            label: "Broker State",
            type: "overlay",
            onClick: () => {
                dispatch(
                    openOverlay({
                        overlayId: "brokerState",
                        data: null,
                    })
                );
            },
        },
        {
            id: "markdownEditor",
            icon: <FileText className="h-4 w-4 text-purple-500" />,
            label: "Applet Content",
            type: "overlay",
            disabled: !hasValidContext,
            onClick: () => {
                if (!hasValidContext) return;
                dispatch(
                    openOverlay({
                        overlayId: "markdownEditor",
                        data: {
                            initialMarkdown: textResponse,
                            showSampleSelector: true,
                            showConfigSelector: true,
                        },
                    })
                );
            },
        },
        {
            id: "socketAccordion",
            icon: <Server className="h-4 w-4 text-orange-500" />,
            label: "Server Admin",
            type: "overlay",
            disabled: !hasValidContext,
            onClick: () => {
                if (!hasValidContext) return;
                dispatch(
                    openOverlay({
                        overlayId: "socketAccordion",
                        data: { taskId: currentTaskId },
                    })
                );
            },
        },
        // Creator links
        {
            id: "manage",
            icon: <Code className="h-4 w-4 text-emerald-500" />,
            label: "Manage Applets",
            type: "link",
            href: "/apps/builder",
        },
        {
            id: "edit",
            icon: <Paintbrush className="h-4 w-4 text-violet-500" />,
            label: "Edit Content",
            type: "link",
            href: "#",
        },
        {
            id: "analytics",
            icon: <Sparkles className="h-4 w-4 text-amber-500" />,
            label: "Analytics",
            type: "link",
            href: "#",
        },

        {
            id: "settings",
            icon: <Database className="h-4 w-4 text-blue-500" />,
            label: "Creator Settings",
            type: "link",
            href: "#",
        },
    ];

    return (
        <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
                <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase flex items-center">
                    <Crown size={12} className="mr-1" /> Creator Menu
                </span>
            </div>

            {menuItems.map((item) => {
                if (item.type === "overlay") {
                    return (
                        <DropdownMenuItem key={item.id} asChild>
                            <div
                                className={`flex items-center gap-3 w-full px-2 py-2 cursor-pointer ${
                                    item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                } group`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent dropdown from closing
                                    if (!item.disabled) {
                                        item.onClick();
                                    }
                                }}
                            >
                                <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                                    {item.icon}
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                            </div>
                        </DropdownMenuItem>
                    );
                } else if (item.type === "link") {
                    return (
                        <DropdownMenuItem key={item.id} asChild>
                            <Link
                                href={item.href}
                                className="flex items-center gap-3 w-full px-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group"
                            >
                                <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                                    {item.icon}
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                            </Link>
                        </DropdownMenuItem>
                    );
                }
                return null;
            })}
        </>
    );
};

export default CreatorMenu;

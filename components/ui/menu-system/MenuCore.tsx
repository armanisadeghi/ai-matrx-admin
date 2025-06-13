"use client";

import React from "react";
import { MenuDefinition, MenuRenderProps, MenuItemDefinition } from "./types";
import { MenuRegistry } from "./MenuRegistry";
import { GlobalMenuItems } from "./GlobalMenuItems";
import { useRouter } from "next/navigation";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";

interface MenuCoreProps extends MenuRenderProps {
    menuId: string;
    menuProps?: any; // Props to pass to the menu definition's customItems function
    // Override global item behaviors
    overrideGlobalItems?: {
        [key: string]: Partial<MenuItemDefinition>;
    };
}

export const MenuCore: React.FC<MenuCoreProps> = ({
    menuId,
    menuProps = {},
    overrideGlobalItems = {},
    renderMenuItem,
    renderSeparator,
}) => {
    const router = useRouter();
    const { mode, toggleMode } = useTheme();
    const dispatch = useAppDispatch();
    
    // Get the menu definition
    const menuDefinition = MenuRegistry.get(menuId);
    if (!menuDefinition) {
        console.warn(`Menu definition not found: ${menuId}`);
        return null;
    }

    // Generate custom items from the definition and override execute functionality
    const customItems = menuDefinition.customItems(menuProps)
        .map(item => {
            // Override execute functionality for workflow nodes
            if (item.id === 'execute' && menuId === 'workflow-node') {
                return {
                    ...item,
                    onClick: async () => {
                        try {
                            const { data, userInputs, onExecuteComplete, onExecuteError } = menuProps;
                            const taskId = await dispatch(createTaskFromPresetQuick({
                                presetName: "workflow_step_to_execute_single_step",
                                sourceData: {
                                    ...data,
                                    user_inputs: userInputs || [],
                                }
                            })).unwrap();
                            
                            onExecuteComplete?.(taskId);
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : String(err);
                            menuProps.onExecuteError?.(errorMessage);
                        }
                    }
                };
            }
            return item;
        });

    // Get global items and apply menu-specific visibility rules
    const globalItems = GlobalMenuItems.getAll()
        .filter(item => {
            // Check if this menu wants to hide this global item
            if (menuDefinition.hideGlobalItems?.includes(item.id)) {
                return false;
            }
            // Check legacy hide props
            if (item.id === 'profile' && menuDefinition.hideProfile) return false;
            if (item.id === 'theme' && menuDefinition.hideTheme) return false;
            if (item.id === 'logout' && menuDefinition.hideLogout) return false;
            return true;
        })
        .map(item => {
            // Apply overrides and real implementations
            let finalItem = { ...item };
            
            // Apply real implementations for core items
            if (item.id === 'theme') {
                finalItem = {
                    ...finalItem,
                    onClick: toggleMode,
                };
            } else if (item.id === 'logout') {
                finalItem = {
                    ...finalItem,
                    onClick: async () => {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        router.push('/login');
                    },
                };
            } else if (item.id === 'profile') {
                finalItem = {
                    ...finalItem,
                    onClick: () => router.push('/dashboard/profile'),
                };
            }

            // Apply any overrides passed to this instance
            if (overrideGlobalItems[item.id]) {
                finalItem = { ...finalItem, ...overrideGlobalItems[item.id] };
            }

            return finalItem;
        });

    const showSeparator = customItems.length > 0 && globalItems.length > 0;

    return (
        <>
            {/* Render custom items */}
            {customItems
                .filter(item => item.visible !== false)
                .map(item => renderMenuItem(item))}
            
            {/* Separator if we have both custom and global items */}
            {showSeparator && renderSeparator && renderSeparator()}
            
            {/* Render global items */}
            {globalItems
                .filter(item => item.visible !== false)
                .map(item => renderMenuItem(item))}
        </>
    );
}; 
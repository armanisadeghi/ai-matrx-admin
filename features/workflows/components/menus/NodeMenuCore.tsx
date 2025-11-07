"use client";

import React, { useState } from "react";
import { Edit, Copy, Trash2, Play, Zap, User, LogOut, Sun, Moon, Eye } from "lucide-react";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { DbFunctionNode } from "@/features/workflows/types";
import { useRouter } from "next/navigation";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { createClient } from "@/utils/supabase/client";

export interface NodeMenuCoreProps {
    data: DbFunctionNode;
    userInputs?: Array<{ broker_id: string; default_value: any, value?: any }>;
    onEdit: (nodeData: DbFunctionNode) => void;
    onDuplicate: (nodeId: string) => void;
    onDelete: (nodeId: string) => void;
    onExecuteComplete?: (taskId: string) => void;
    onExecuteError?: (error: string) => void;
    onShowResults?: (nodeData: DbFunctionNode) => void;
    // General menu options (shown by default)
    hideProfile?: boolean;
    hideLogout?: boolean;
    hideTheme?: boolean;
    // Render props for menu items
    renderMenuItem: (props: {
        icon: React.ReactNode;
        label: string;
        onClick: () => void;
        disabled?: boolean;
        destructive?: boolean;
    }) => React.ReactNode;
    renderSeparator?: () => React.ReactNode;
}

export const NodeMenuCore: React.FC<NodeMenuCoreProps> = ({
    data,
    userInputs,
    onEdit,
    onShowResults,
    onDuplicate,
    onDelete,
    onExecuteComplete,
    onExecuteError,
    hideProfile = false,
    hideLogout = false,
    hideTheme = false,
    renderMenuItem,
    renderSeparator,
}) => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { mode, toggleMode } = useTheme();
    const [isExecuting, setIsExecuting] = useState(false);

    const handleExecute = async () => {
        setIsExecuting(true);
        try {
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
            onExecuteError?.(errorMessage);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleProfileClick = () => {
        router.push('/settings/profile');
    };

    const showGeneralItems = !hideProfile || !hideLogout || !hideTheme;

    return (
        <>
            {onExecuteComplete && renderMenuItem({
                icon: isExecuting ? <Zap className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />,
                label: "Execute Step",
                onClick: handleExecute,
                disabled: isExecuting,
            })}
            {renderMenuItem({
                icon: <Edit className="h-4 w-4 mr-2" />,
                label: "Edit",
                onClick: () => onEdit(data),
            })}
            {renderMenuItem({
                icon: <Eye className="h-4 w-4 mr-2" />,
                label: "Show Results",
                onClick: () => onShowResults(data),
            })}
            {renderMenuItem({
                icon: <Copy className="h-4 w-4 mr-2" />,
                label: "Duplicate",
                onClick: () => onDuplicate(data.id),
            })}
            {renderMenuItem({
                icon: <Trash2 className="h-4 w-4 mr-2" />,
                label: "Delete",
                onClick: () => onDelete(data.id),
                destructive: true,
            })}
            
            {/* Separator and general items */}
            {showGeneralItems && renderSeparator && renderSeparator()}
            
            {!hideProfile && renderMenuItem({
                icon: <User className="h-4 w-4 mr-2" />,
                label: "Profile Settings",
                onClick: handleProfileClick,
            })}
            
            {!hideTheme && renderMenuItem({
                icon: mode === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />,
                label: mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
                onClick: toggleMode,
            })}
            
            {!hideLogout && renderMenuItem({
                icon: <LogOut className="h-4 w-4 mr-2" />,
                label: "Log out",
                onClick: handleLogout,
                destructive: true,
            })}
        </>
    );
}; 
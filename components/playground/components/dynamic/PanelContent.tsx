import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { DynamicToolbar, DynamicToolbarProps } from './DynamicToolbar';
import { DebugTabs, DebugTabsProps } from './DebugTabs';

// Most basic props required by any toolbar
export interface BaseToolbarProps {
    isCollapsed: boolean;
    onToggleCollapse?: () => void;
    onSave?: () => void;
    onDelete?: () => void;
    onDebugClick?: () => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;
}

// Most basic props required by any debug panel
export interface BaseDebugProps {
    tabs?: any[];
}

export interface PanelContentProps<TToolbar extends BaseToolbarProps = BaseToolbarProps, TDebug extends BaseDebugProps = BaseDebugProps> {
    // Core props
    id: string;
    isCollapsed: boolean;
    children: React.ReactNode;

    // Components
    toolbarComponent?: React.ComponentType<TToolbar>;
    debugComponent?: React.ComponentType<TDebug>;

    // Event handlers
    onToggleCollapse?: (id: string) => void;
    onSave?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;

    // Props for components
    toolbarProps?: Partial<TToolbar>;
    debugProps?: Partial<TDebug>;

    // Debug mode
    debug?: boolean;
    debugVisible?: boolean;
    onDebugVisibilityChange?: (visible: boolean) => void;

    // Loading state
    isLoading?: boolean;
    loadingComponent?: React.ReactNode;

    // Additional customization
    className?: string;
    contentClassName?: string;
}

export function PanelContent<TToolbar extends BaseToolbarProps, TDebug extends BaseDebugProps>({
    id,
    isCollapsed,
    children,
    toolbarComponent: CustomToolbar,
    debugComponent: CustomDebug,
    onToggleCollapse,
    onSave,
    onDelete,
    onDragDrop,
    toolbarProps = {} as Partial<TToolbar>,
    debugProps = {} as Partial<TDebug>,
    debug = false,
    debugVisible: externalDebugVisible,
    onDebugVisibilityChange,
    isLoading = false,
    loadingComponent,
    className = '',
    contentClassName = '',
}: PanelContentProps<TToolbar, TDebug>) {
    // State management
    const [isContentHidden, setIsContentHidden] = useState(isCollapsed);
    const [internalDebugVisible, setInternalDebugVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const debugVisible = typeof externalDebugVisible !== 'undefined' ? externalDebugVisible : internalDebugVisible;

    useEffect(() => {
        setIsContentHidden(isCollapsed);
    }, [isCollapsed]);

    const handleSave = useCallback(() => {
        if (isSaving || !onSave) return;
        setIsSaving(true);
        onSave(id);
        setTimeout(() => {
            setIsSaving(false);
        }, 500);
    }, [id, onSave, isSaving]);

    const handleToggleVisibility = useCallback(() => {
        setIsContentHidden((prev) => !prev);
        onToggleCollapse?.(id);
    }, [id, onToggleCollapse]);

    const handleToggleDebug = useCallback(() => {
        const newValue = !debugVisible;
        if (onDebugVisibilityChange) {
            onDebugVisibilityChange(newValue);
        } else {
            setInternalDebugVisible(newValue);
        }
    }, [debugVisible, onDebugVisibilityChange]);

    const Toolbar = (CustomToolbar || DynamicToolbar) as React.ComponentType<BaseToolbarProps & Partial<TToolbar>>;
    const Debug = (CustomDebug || DebugTabs) as React.ComponentType<BaseDebugProps & Partial<TDebug>>;

    const contentHeight = debugVisible ? 'h-[calc(100%-4rem)]' : 'h-[calc(100%-2rem)]';

    const combinedToolbarProps = {
        isCollapsed,
        onToggleCollapse: handleToggleVisibility,
        onDelete: onDelete ? () => onDelete(id) : undefined,
        onSave: handleSave,
        debug,
        onDebugClick: handleToggleDebug,
        onDragDrop,
        ...toolbarProps,
    } as BaseToolbarProps & Partial<TToolbar>;

    const combinedDebugProps = {
        tabs: debugProps.tabs || [],
        ...debugProps,
    } as BaseDebugProps & Partial<TDebug>;

    return (
        <Card className={`h-full p-0 overflow-hidden bg-background border-elevation2 ${className}`}>
            <Toolbar {...combinedToolbarProps} />

            {debugVisible && debug && <Debug {...combinedDebugProps} />}

            <div className={`transition-all duration-200 ${isContentHidden ? 'h-0 overflow-hidden' : contentHeight} ${contentClassName}`}>
                {isLoading && loadingComponent ? <div className='flex items-center justify-center h-full'>{loadingComponent}</div> : children}
            </div>
        </Card>
    );
}

export default PanelContent;

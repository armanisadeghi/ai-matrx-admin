"use client";
import React, { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabDefinition {
    id: string;
    label: string;
    content: ReactNode;
    className?: string;
}

export interface FullScreenOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    tabs: TabDefinition[];
    initialTab?: string;
    onTabChange?: (newTab: string) => void;
    footerContent?: ReactNode;
    showSaveButton?: boolean;
    onSave?: () => void;
    saveButtonLabel?: string;
    saveButtonDisabled?: boolean;
    showCancelButton?: boolean;
    onCancel?: () => void;
    cancelButtonLabel?: string;
    additionalButtons?: ReactNode;
    width?: string;
    height?: string;
    // New optional props for split view
    sidePanel?: ReactNode;
    sidePanelRatio?: number; // value between 0-1, defaults to 0.5 (50/50 split)
    sidePanelClassName?: string;
    // New optional props for left side panel
    leftSidePanel?: ReactNode;
    leftSidePanelRatio?: number; // value between 0-1, defaults to 0.15 (15% width)
    leftSidePanelClassName?: string;
    // New optional prop for shared header above all tabs content
    sharedHeader?: ReactNode;
    sharedHeaderClassName?: string;
}

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
    isOpen,
    onClose,
    title,
    description,
    tabs,
    initialTab,
    onTabChange,
    footerContent,
    showSaveButton = false,
    onSave,
    saveButtonLabel = "Save",
    saveButtonDisabled = false,
    showCancelButton = false,
    onCancel,
    cancelButtonLabel = "Cancel",
    additionalButtons,
    width = "90vw",
    height = "95dvh",
    sidePanel,
    sidePanelRatio = 0.5,
    sidePanelClassName,
    leftSidePanel,
    leftSidePanelRatio = 0.1,
    leftSidePanelClassName,
    sharedHeader,
    sharedHeaderClassName,
}) => {
    const [activeTab, setActiveTab] = React.useState<string>(initialTab || (tabs.length > 0 ? tabs[0].id : ""));
    const [isMobile, setIsMobile] = useState(false);

    // Sync activeTab when initialTab changes (e.g., reopening overlay with a different tab)
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        if (onTabChange) {
            onTabChange(newTab);
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave();
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            onClose();
        }
    };

    // Calculate the width percentages based on ratio (desktop only)
    const rightSidePanelWidth = sidePanel && !isMobile ? sidePanelRatio * 100 : 0;
    const leftSidePanelWidth = leftSidePanel && !isMobile ? leftSidePanelRatio * 100 : 0;
    const contentWidth = 100 - rightSidePanelWidth - leftSidePanelWidth;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className={cn(
                    "flex flex-col p-0 gap-0 border-2 border-solid border-slate-500",
                    isMobile ? "w-full h-dvh max-w-full max-h-dvh rounded-none" : "rounded-3xl"
                )}
                style={!isMobile ? { width, maxWidth: width, height, maxHeight: height } : undefined}
            >
                <DialogHeader className={cn(
                    "flex flex-col border-b px-4 flex-shrink-0",
                    isMobile ? "pt-3 pb-2 space-y-2" : "pt-2.5 pb-1"
                )}>
                    <div className="flex flex-row justify-between items-center">
                        <DialogTitle className={isMobile ? "text-lg" : "text-sm"}>{title}</DialogTitle>
                        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
                    </div>
                    
                    {/* Tabs - below title on mobile, inline on desktop */}
                    <Tabs value={activeTab} onValueChange={handleTabChange} className={cn(
                        "overflow-x-auto overflow-y-hidden scrollbar-none min-w-0 max-w-full",
                        isMobile ? "w-full" : "mx-auto"
                    )}>
                        <TabsList className={cn(
                            "rounded-3xl space-x-0.5 w-max",
                            isMobile ? "flex justify-start" : ""
                        )}>
                            {tabs.map((tab, index) => {
                                // Determine tab position styling
                                let positionClass = "rounded-none";
                                if (tabs.length === 1) {
                                    // If only one tab, it gets both rounded corners
                                    positionClass = "rounded-l-full rounded-r-full";
                                } else if (index === 0) {
                                    // First tab always gets left rounded corners
                                    positionClass = "rounded-l-full rounded-r-none";
                                } else if (index === tabs.length - 1) {
                                    // Last tab always gets right rounded corners
                                    positionClass = "rounded-l-none rounded-r-full";
                                }
                                
                                return (
                                    <TabsTrigger
                                        key={`header-${tab.id}`}
                                        className={cn(
                                            positionClass,
                                            "border-border hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-600 data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700",
                                            isMobile ? "px-6 py-3 text-base min-h-[44px]" : "text-xs px-2 py-0.5"
                                        )}
                                        value={tab.id}
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </DialogHeader>
                
                {sharedHeader && (
                    <div className={cn("border-b px-4 py-2 flex-shrink-0", sharedHeaderClassName)}>
                        {sharedHeader}
                    </div>
                )}
                
                <div className={cn(
                    "flex flex-1 overflow-hidden",
                    isMobile ? "flex-col" : "flex-row"
                )}>
                    {leftSidePanel && !isMobile && (
                        <div 
                            className={cn("border-r overflow-auto", leftSidePanelClassName)}
                            style={{ width: `${leftSidePanelWidth}%` }}
                        >
                            {leftSidePanel}
                        </div>
                    )}
                    
                    <div 
                        className="flex flex-col overflow-hidden" 
                        style={!isMobile ? { width: `${contentWidth}%` } : { width: '100%' }}
                    >
                        <Tabs value={activeTab} className="flex-grow flex flex-col overflow-hidden">
                            {tabs.map((tab) => (
                                <TabsContent 
                                    key={`content-${tab.id}`} 
                                    value={tab.id} 
                                    className={cn(
                                        "flex-grow mt-0 border-none overflow-auto outline-none ring-0",
                                        isMobile && "pb-safe"
                                    )}
                                >
                                    {tab.content}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                    
                    {sidePanel && !isMobile && (
                        <div 
                            className={cn("border-l overflow-auto", sidePanelClassName)}
                            style={{ width: `${rightSidePanelWidth}%` }}
                        >
                            {sidePanel}
                        </div>
                    )}
                </div>
                
                {(showSaveButton || showCancelButton || additionalButtons || footerContent) && (
                    <DialogFooter className={cn(
                        "border-t flex justify-end flex-shrink-0 p-1 pr-3",
                        isMobile ? "pb-safe gap-2 flex-col sm:flex-row" : ""
                    )}>
                        {additionalButtons}
                        {footerContent}
                        <div className={cn(
                            "flex gap-2",
                            isMobile ? "w-full" : ""
                        )}>
                            {showCancelButton && (
                                <Button 
                                    variant="outline" 
                                    onClick={handleCancel}
                                    className={cn(
                                        isMobile && "flex-1 min-h-[44px] text-base"
                                    )}
                                >
                                    {cancelButtonLabel}
                                </Button>
                            )}
                            {showSaveButton && (
                                <Button 
                                    onClick={handleSave} 
                                    disabled={saveButtonDisabled}
                                    className={cn(
                                        isMobile && "flex-1 min-h-[44px] text-base"
                                    )}
                                >
                                    <Save className={cn(
                                        isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2"
                                    )} />
                                    {saveButtonLabel}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default FullScreenOverlay;
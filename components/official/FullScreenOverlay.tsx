"use client";
import React, { ReactNode } from "react";
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
    height = "95vh",
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

    // Calculate the width percentages based on ratio
    const rightSidePanelWidth = sidePanel ? sidePanelRatio * 100 : 0;
    const leftSidePanelWidth = leftSidePanel ? leftSidePanelRatio * 100 : 0;
    const contentWidth = 100 - rightSidePanelWidth - leftSidePanelWidth;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className="flex flex-col p-0 gap-0 border-3 border-solid border-slate-500 rounded-3xl"
                style={{ width, maxWidth: width, height, maxHeight: height }}
            >
                <DialogHeader className="flex flex-row justify-between items-center border-b px-4 py-2 flex-shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="mx-auto overflow-x-auto py-1 overflow-y-hidden scrollbar-none">
                        <TabsList className="rounded-3xl space-x-2">
                            {tabs.map((tab, index) => {
                                // Determine tab position styling
                                let positionClass = "";
                                if (tabs.length === 1) {
                                    // If only one tab, it gets both rounded corners
                                    positionClass = "rounded-l-3xl rounded-r-3xl";
                                } else if (index === 0) {
                                    // First tab always gets left rounded corners
                                    positionClass = "rounded-l-3xl";
                                } else if (index === tabs.length - 1) {
                                    // Last tab always gets right rounded corners
                                    positionClass = "rounded-r-3xl";
                                }
                                
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        className={`${positionClass} px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-600 data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700`}
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
                
                <div className="flex flex-1 overflow-hidden">
                    {leftSidePanel && (
                        <div 
                            className={cn("border-r overflow-auto", leftSidePanelClassName)}
                            style={{ width: `${leftSidePanelWidth}%` }}
                        >
                            {leftSidePanel}
                        </div>
                    )}
                    
                    <div 
                        className="flex flex-col overflow-hidden" 
                        style={{ width: `${contentWidth}%` }}
                    >
                        <Tabs value={activeTab} className="flex-grow flex flex-col overflow-hidden">
                            {tabs.map((tab) => (
                                <TabsContent key={tab.id} value={tab.id} className="flex-grow mt-0 border-none overflow-auto outline-none ring-0">
                                    {tab.content}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                    
                    {sidePanel && (
                        <div 
                            className={cn("border-l overflow-auto", sidePanelClassName)}
                            style={{ width: `${rightSidePanelWidth}%` }}
                        >
                            {sidePanel}
                        </div>
                    )}
                </div>
                
                {(showSaveButton || showCancelButton || additionalButtons || footerContent) && (
                    <DialogFooter className="border-t p-4 flex justify-end flex-shrink-0">
                        {additionalButtons}
                        {footerContent}
                        {showCancelButton && (
                            <Button variant="outline" onClick={handleCancel}>
                                {cancelButtonLabel}
                            </Button>
                        )}
                        {showSaveButton && (
                            <Button onClick={handleSave} disabled={saveButtonDisabled}>
                                <Save className="h-4 w-4 mr-2" />
                                {saveButtonLabel}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default FullScreenOverlay;
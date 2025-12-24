"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ChatHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout";
import { ChatSidebarContent } from "@/features/chat/components/conversations/ChatSidebarContent";
import { useSidebarContent } from "@/hooks/useSidebarContent";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Inject chat list into the main app sidebar
    const SidebarContent = useSidebarContent(() => <ChatSidebarContent />);
    
    // Check if we're on a specific chat page (has an ID) or the welcome screen
    const isWelcomeScreen = pathname === '/chat' || pathname === '/chat/';

    return (
        <>
            {SidebarContent}
            <div className="h-page flex flex-col overflow-hidden bg-textured">
                {/* Render chat controls in main header */}
                <ChatHeader baseRoute="/chat" />
                
                <main className="flex-1 overflow-hidden">
                    {isWelcomeScreen ? (
                        // Welcome Screen - Let it control its own layout completely
                        <AdaptiveLayout
                            header={null}
                            rightPanel={
                                <div className="h-full w-full min-w-0 flex flex-col bg-textured relative overflow-hidden">
                                    {/* ResponseColumn is here but will be empty on welcome screen */}
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-w-0">
                                        <div className="w-full min-w-0 max-w-[800px] mx-auto pt-0">
                                            <ResponseColumn />
                                        </div>
                                    </div>
                                    
                                    {/* WelcomeScreen controls its own positioning */}
                                    {children}
                                </div>
                            }
                            mobileBreakpoint={768}
                        />
                    ) : (
                        // Chat Conversation - Layout controls positioning
                        <AdaptiveLayout
                            header={null}
                            rightPanel={
                                <div className="h-full w-full min-w-0 flex flex-col bg-textured relative overflow-hidden">
                                    {/* Messages - Scrollable area - pb-32 to prevent content hiding under input */}
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-32 md:pb-32 min-w-0">
                                        <div className="w-full min-w-0 max-w-[800px] mx-auto pt-0">
                                            <ResponseColumn />
                                        </div>
                                    </div>
                                    
                                    {/* Input Container - Fixed at bottom with safe area padding */}
                                    {/* Mobile: fixed to viewport, Desktop: absolute within container */}
                                    <div className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full bg-textured pb-safe pt-2 overflow-x-hidden min-w-0 z-10">
                                        <div className="w-full min-w-0 max-w-[800px] mx-auto px-1">
                                            {children}
                                        </div>
                                    </div>
                                </div>
                            }
                            mobileBreakpoint={768}
                        />
                    )}
                </main>
            </div>
        </>
    );
}

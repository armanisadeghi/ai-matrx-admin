'use client';

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppRuntimeLayoutType } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { AppLayoutOptions } from "./desktop/HeaderLogic";
import { HeaderLogic } from "./desktop/HeaderLogic";
import { HeaderTabGroup } from "./common/HeaderTabs";
import Link from "next/link";

export interface AppletHeaderCompactProps {
  appId?: string;
  isDemo?: boolean;
  isDebug?: boolean;
  activeAppletSlug?: string;
  isCreator?: boolean;
  isAdmin?: boolean;
  isPreview?: boolean;
}

export function AppletHeaderCompact({
  appId,
  isDemo = false,
  isDebug = false,
  activeAppletSlug,
  isCreator,
  isAdmin,
  isPreview = false,
}: AppletHeaderCompactProps) {
  const layoutType = useAppSelector(selectAppRuntimeLayoutType) as AppLayoutOptions;

  return (
    <HeaderLogic
      appId={appId}
      isDemo={isDemo}
      isPreview={isPreview}
    >
      {({
        activeAppIcon,
        appletList,
        extraButtons,
        config,
        displayName,
        profilePhoto,
        activeAppletSlug: currentActiveAppletSlug,
        handleAppletChange,
        isDemo: isDemoMode,
        isPreview: isPreviewMode
      }) => (
        <div className="flex items-center gap-2 h-full">
          {/* Mobile - Always dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {/* App home link */}
                <DropdownMenuItem asChild>
                  <Link href={`/apps/custom/${config.slug}`} className="flex items-center w-full">
                    <div className="h-4 w-4 mr-2 flex items-center justify-center">
                      {activeAppIcon}
                    </div>
                    {config.name || 'App Home'}
                  </Link>
                </DropdownMenuItem>
                
                {/* Applet navigation */}
                {appletList && appletList.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {appletList.map((applet) => (
                      <DropdownMenuItem key={applet.slug} asChild>
                        <Link 
                          href={`/apps/custom/${config.slug}/${applet.slug}`}
                          className="flex items-center w-full"
                        >
                          {applet.label}
                          {currentActiveAppletSlug === applet.slug && (
                            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Active</span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                
                {/* Extra buttons if any */}
                {extraButtons && extraButtons.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {extraButtons.map((button, index) => (
                      button.actionType === "link" && button.route ? (
                        <DropdownMenuItem key={index} asChild>
                          <Link href={button.route} className="flex items-center w-full">
                            {button.icon && (
                              <div className="h-4 w-4 mr-2 flex items-center justify-center">
                                {button.icon}
                              </div>
                            )}
                            {button.label}
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem key={index} onClick={button.onClick}>
                          {button.icon && (
                            <div className="h-4 w-4 mr-2 flex items-center justify-center">
                              {button.icon}
                            </div>
                          )}
                          {button.label}
                        </DropdownMenuItem>
                      )
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop - Inline controls with tight spacing */}
          <div className="hidden md:flex items-center gap-1 min-w-0 flex-1">
            {/* App Icon */}
            <div className="flex-shrink-0">
              {isPreview ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  {activeAppIcon}
                </div>
              ) : (
                <Link href={`/apps/custom/${config.slug}`} className="w-6 h-6 flex items-center justify-center hover:opacity-80">
                  {activeAppIcon}
                </Link>
              )}
            </div>

            {/* Dynamic content based on layout type */}
            {layoutType === "tabbedApplets" && appletList && appletList.length > 0 && (
              <div className="min-w-0 flex-1 ml-2">
                <div className="overflow-x-auto hide-scrollbar">
                  <HeaderTabGroup 
                    appletList={appletList}
                    activeAppletSlug={currentActiveAppletSlug}
                    handleAppletChange={handleAppletChange}
                    preserveTabOrder={true}
                  />
                </div>
              </div>
            )}

            {/* For other layout types, show a compact version */}
            {layoutType !== "tabbedApplets" && appletList && appletList.length > 0 && (
              <div className="ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      {appletList.find(a => a.slug === currentActiveAppletSlug)?.label || 'Select Applet'}
                      <MoreHorizontal className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {appletList.map((applet) => (
                      <DropdownMenuItem key={applet.slug} asChild>
                        <Link 
                          href={`/apps/custom/${config.slug}/${applet.slug}`}
                          className="flex items-center w-full"
                        >
                          {applet.label}
                          {currentActiveAppletSlug === applet.slug && (
                            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">•</span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Extra buttons - show on larger screens only */}
            {extraButtons && extraButtons.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 ml-2">
                {extraButtons.slice(0, 2).map((button, index) => (
                  button.actionType === "link" && button.route ? (
                    <Link key={index} href={button.route}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={button.label}
                      >
                        {button.icon}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={button.onClick}
                      className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={button.label}
                    >
                      {button.icon}
                    </Button>
                  )
                ))}
                {extraButtons.length > 2 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {extraButtons.slice(2).map((button, index) => (
                        button.actionType === "link" && button.route ? (
                          <DropdownMenuItem key={index + 2} asChild>
                            <Link href={button.route} className="flex items-center w-full">
                              {button.icon && (
                                <div className="h-4 w-4 mr-2 flex items-center justify-center">
                                  {button.icon}
                                </div>
                              )}
                              {button.label}
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem key={index + 2} onClick={button.onClick}>
                            {button.icon && (
                              <div className="h-4 w-4 mr-2 flex items-center justify-center">
                                {button.icon}
                              </div>
                            )}
                            {button.label}
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </HeaderLogic>
  );
}

"use client";
import React, { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import SectionCard from "@/components/official/cards/SectionCard";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectActiveAppletId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectAppletsByAppId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { setActiveApplet } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { PanelRight, LucideIcon } from "lucide-react";

interface AppletTabsWrapperProps {
  appId?: string;
  children: ((applet: AppletBuilder) => React.ReactNode) | React.ReactNode;
  title: string;
  description: string;
  onCreateNewApplet?: () => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: LucideIcon;
}

export const AppletTabsWrapper: React.FC<AppletTabsWrapperProps> = ({
  appId,
  children,
  title,
  description,
  onCreateNewApplet,
  emptyStateTitle = "Select an Applet to Continue",
  emptyStateDescription = "Please select an applet and group from the sidebar to start configuring fields for your component.",
  emptyStateIcon = PanelRight
}) => {
  const dispatch = useAppDispatch();
  const activeAppletId = useAppSelector((state: RootState) => selectActiveAppletId(state));
  const applets = useAppSelector((state) => (appId ? selectAppletsByAppId(state, appId) : [])) as AppletBuilder[];

  useEffect(() => {
    if (!activeAppletId && applets.length > 0) {
      dispatch(setActiveApplet(applets[0].id));
    }
  }, [activeAppletId, applets, dispatch]);

  const handleAppletChange = (value: string) => {
    dispatch(setActiveApplet(value));
  };

  // Create a button for "Create New Applet" if handler is provided
  const headerActions = onCreateNewApplet ? (
    <Button
      variant="outline"
      onClick={onCreateNewApplet}
      className="rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border text-blue-500 dark:text-blue-300 border-blue-500 dark:border-blue-600 hover:text-white flex items-center gap-2"
    >
      <PlusCircle className="h-4 w-4" />
      Create New Applet
    </Button>
  ) : undefined;

  // Create tabs for applets
  const appletTabs = (
    <TabsList className="bg-transparent border-none">
      {applets.map((applet) => (
        <TabsTrigger key={applet.id} value={applet.id} className="border border-blue-500 dark:border-blue-700">
          {applet.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  // Check if we should render the child component with applet props
  const renderChildren = (applet: AppletBuilder) => {
    // If children is a function, call it with applet data
    if (typeof children === 'function') {
      return children(applet);
    }
    
    // Otherwise, clone the children and pass applet ID as a prop
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { 
          appletId: applet.id,
          // You can pass more props here if needed
        } as any);
      }
      return child;
    });
  };

  return (
    <div className="w-full">
      <Tabs value={activeAppletId || ""} onValueChange={handleAppletChange} className="w-full">
        <SectionCard
          title={title}
          description={description}
          descriptionNode={applets.length > 0 ? appletTabs : undefined}
          headerActions={headerActions}
        >
          {applets.map((applet) => (
            <TabsContent key={applet.id} value={applet.id} className="my-6">
              {renderChildren(applet)}
            </TabsContent>
          ))}

          {applets.length === 0 && (
            <EmptyStateCard
              title={emptyStateTitle}
              description={emptyStateDescription}
              icon={emptyStateIcon}
            />
          )}
        </SectionCard>
      </Tabs>
    </div>
  );
};

export default AppletTabsWrapper;
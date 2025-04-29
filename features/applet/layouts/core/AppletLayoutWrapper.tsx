// File: features\applet\layouts\core\AppletLayoutWrapper.tsx
'use client';

import React, { useState, useEffect } from "react";
import { useAppletData } from "@/context/AppletDataContext";
import AppletInputLayoutManager from "@/features/applet/layouts/core/AppletInputLayoutManager";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "@/features/applet/sample-mock-data/constants";
import { AppletLayoutOption } from "../options/layout.types";

interface AppletLayoutWrapperProps {
  initialAppName?: string;
  layoutTypeOverride?: AppletLayoutOption;
  className?: string;
}

const AppletInputLayoutWrapper: React.FC<AppletLayoutWrapperProps> = ({
  initialAppName,
  layoutTypeOverride,
  className = "",
}) => {
  const { 
    activeTab, 
    appletDefinition, 
    customAppConfig, 
    submitButton, 
    appName: contextAppName,
    layoutType: contextLayoutType
  } = useAppletData();
  
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  // Use the app name from props if provided, otherwise use from context
  const appName = initialAppName || contextAppName;
  
  // Use provided layout type or fall back to context and then customAppConfig
  const layoutType: AppletLayoutOption = layoutTypeOverride || contextLayoutType || customAppConfig.layoutType || "horizontal";
  
  const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);
  
  useEffect(() => {
    setActiveFieldId(null);
  }, [activeTab]);
  
  // Add ml-2 margin to the submitButton for consistency with search bar components
  const actionButtonWithMargin = (
    <div className="ml-2">
      {submitButton}
    </div>
  );

  return (
    <AppletInputLayoutManager
      layoutType={layoutType}
      initialAppName={appName}
      appletDefinition={appletDefinition}
      activeTab={activeTab}
      activeFieldId={activeFieldId}
      setActiveFieldId={setActiveFieldId}
      actionButton={actionButtonWithMargin}
      className={className}
    />
  );
};

export default AppletInputLayoutWrapper;

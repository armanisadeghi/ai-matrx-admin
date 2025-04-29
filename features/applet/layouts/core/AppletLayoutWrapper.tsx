// File: components/search/SearchApplet.tsx
// Main component that ties everything together
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useAppletData } from "@/context/AppletDataContext";
import SearchLayoutManager from "@/features/applet/layouts/options/SearchLayoutManager";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "@/features/applet/sample-mock-data/constants";
import { CustomAppConfig } from "@/features/applet/runner/components/field-components/types";
import { AppletLayoutOption } from "../options/layout.types";


interface AppletLayoutWrapperProps {
  config: CustomAppConfig;
  layoutTypeOverride?: AppletLayoutOption;
  className?: string;
}

const AppletLayoutWrapper: React.FC<AppletLayoutWrapperProps> = ({
  config,
  layoutTypeOverride,
  className = "",
}) => {
  const { activeTab, availableApplets } = useAppletData();
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  const layoutType: AppletLayoutOption = layoutTypeOverride || config.layoutType || "horizontal";
  
  const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);
  
  useEffect(() => {
    setActiveFieldId(null);
  }, [activeTab]);
  
  const searchButton = (
    <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3">
      <Search size={24} />
    </div>
  );

  return (
    <SearchLayoutManager
      layoutType={layoutType}
      config={availableApplets}
      activeTab={activeTab}
      activeFieldId={activeFieldId}
      setActiveFieldId={setActiveFieldId}
      actionButton={searchButton}
      className={className}
    />
  );
};

export default AppletLayoutWrapper;

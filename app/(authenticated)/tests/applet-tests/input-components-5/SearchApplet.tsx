// File: components/search/SearchApplet.tsx
// Main component that ties everything together
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

import { useSearchTab } from "@/context/SearchTabContext";
import { SearchLayoutType } from "./types";
import SearchLayoutManager from "./layouts/SearchLayoutManager";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "../input-components-4/constants";
import { TabSearchConfig } from "../input-components-4/components/field-components/types";


interface SearchAppletProps {
  config: TabSearchConfig;
  layoutType?: SearchLayoutType;
  className?: string;
}

const SearchApplet: React.FC<SearchAppletProps> = ({
  config,
  layoutType = "horizontal",
  className = "",
}) => {
  const { activeTab } = useSearchTab();
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  // Fetch data brokers (if needed)
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
      config={config}
      activeTab={activeTab}
      activeFieldId={activeFieldId}
      setActiveFieldId={setActiveFieldId}
      actionButton={searchButton}
      className={className}
    />
  );
};

export default SearchApplet;

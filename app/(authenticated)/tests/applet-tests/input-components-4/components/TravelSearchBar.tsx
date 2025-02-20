"use client";

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import FieldRow from './field-components/FieldRow';
import SearchGroupField from './field-components/SearchGroupField';
import { useSearchTab } from '@/context/SearchTabContext';
import { TabSearchConfig } from './field-components/types';
import { useGetorFetchRecords } from '@/app/entities/hooks/records/useGetOrFetch';
import { ALL_BROKER_IDS } from '../constants';

interface TravelSearchBarProps {
  config: TabSearchConfig;
}

const TravelSearchBar: React.FC<TravelSearchBarProps> = ({ config }) => {
  const { activeTab } = useSearchTab();
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS)
  // Reset active field when tab changes
  useEffect(() => {
    setActiveFieldId(null);
  }, [activeTab]);

  const searchButton = (
    <div className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full p-3">
      <Search size={18} />
    </div>
  );

  // Get the search groups for the active tab
  const activeSearchGroups = config[activeTab] || [];

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-900 shadow-md rounded-xl">
      <FieldRow
        activeFieldId={activeFieldId}
        onActiveFieldChange={setActiveFieldId}
        actionButton={searchButton}
        className="mx-auto max-w-6xl"
      >
        {activeSearchGroups.map((group, index) => (
          <SearchGroupField
            key={group.id}
            id={group.id}
            label={group.label}
            placeholder={group.placeholder}
            fields={group.fields}
            isActive={activeFieldId === group.id}
            onClick={() => {}} // This will be managed by FieldRow
            onOpenChange={() => {}} // This will be managed by FieldRow
            isLast={index === activeSearchGroups.length - 1}
          />
        ))}
      </FieldRow>
    </div>
  );
};

export default TravelSearchBar;
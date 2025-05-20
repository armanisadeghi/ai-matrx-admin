'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectAppletById,
  selectAppletLoading,
} from '@/lib/redux/app-builder/selectors/appletSelectors';
import { setActiveAppletWithFetchThunk } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { toast } from '@/components/ui/use-toast';
import { 
  LayoutIcon, 
  Database, 
  Code, 
  ArrowRight, 
  Link, 
  Workflow, 
  Info,
  History
} from 'lucide-react';

// Tab Components
import EditTabLayout from './components/EditTabLayout';
import OverviewEditTab from './components/OverviewEditTab';
import ContainersEditTab from './components/ContainersEditTab';
import DataSourceEditTab from './components/DataSourceEditTab';
import JsonConfigEditTab from './components/JsonConfigEditTab';
import ReferencesEditTab from './components/ReferencesEditTab';
import BrokerMappingsEditTab from './components/BrokerMappingsEditTab';
import LegacyEditorTab from './components/LegacyEditorTab';

// Types
import { AppletBuilder } from '../page';

export default function AppletEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;

  const dispatch = useAppDispatch();
  
  // Get applet data from Redux
  const applet = useAppSelector((state) => selectAppletById(state, id));
  const isLoading = useAppSelector(selectAppletLoading);

  // Local state for edit mode
  const [editedApplet, setEditedApplet] = useState<AppletBuilder | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Set active applet when component mounts
  useEffect(() => {
    if (id) {
      dispatch(setActiveAppletWithFetchThunk(id)).unwrap()
        .catch(error => {
          console.error("Failed to set active applet:", error);
          toast({
            title: "Error",
            description: "Failed to set active applet.",
            variant: "destructive",
          });
        });
    }
  }, [id, dispatch]);

  // Initialize editedApplet state when the original applet data is loaded
  useEffect(() => {
    if (applet) {
      setEditedApplet({ ...applet });
    }
  }, [applet]);

  // Handle updates to the applet data
  const handleFieldUpdate = (field: string, value: any) => {
    if (!editedApplet) return;
    
    setEditedApplet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value
      };
    });
    setHasChanges(true);
  };

  // Handle updating containers
  const handleContainersUpdate = (containers: any[]) => {
    handleFieldUpdate('containers', containers);
  };

  // Handle updating data source config
  const handleDataSourceUpdate = (dataSourceConfig: any) => {
    handleFieldUpdate('dataSourceConfig', dataSourceConfig);
  };

  // Handle updating broker mappings
  const handleBrokerMappingsUpdate = (brokerMap: any[]) => {
    handleFieldUpdate('brokerMap', brokerMap);
  };

  // Handle updating JSON configurations
  const handleJsonConfigUpdate = (field: string, value: any) => {
    handleFieldUpdate(field, value);
  };

  // Handle saving all changes
  const handleSave = async () => {
    console.log("Saving changes:", editedApplet);
    // This would typically dispatch a thunk to save the changes to the server
    // For now, we'll just log the changes
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset the changes flag
    setHasChanges(false);
    
    return Promise.resolve();
  };
  
  // Loading state
  if (isLoading || !applet || !editedApplet) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Info className="h-4 w-4" />,
      content: (
        <OverviewEditTab 
          id={editedApplet.id}
          name={editedApplet.name}
          description={editedApplet.description}
          slug={editedApplet.slug}
          creator={editedApplet.creator}
          imageUrl={editedApplet.imageUrl}
          primaryColor={editedApplet.primaryColor}
          accentColor={editedApplet.accentColor}
          appletIcon={editedApplet.appletIcon}
          appletSubmitText={editedApplet.appletSubmitText}
          layoutType={editedApplet.layoutType}
          overviewLabel={editedApplet.overviewLabel}
          onUpdate={handleFieldUpdate}
        />
      ),
    },
    {
      id: 'containers',
      label: 'Containers',
      icon: <LayoutIcon className="h-4 w-4" />,
      content: (
        <ContainersEditTab 
          containers={editedApplet.containers} 
          onUpdate={handleContainersUpdate} 
        />
      ),
    },
    {
      id: 'datasource',
      label: 'Data Source',
      icon: <Database className="h-4 w-4" />,
      content: (
        <DataSourceEditTab 
          dataSourceConfig={editedApplet.dataSourceConfig} 
          onUpdate={handleDataSourceUpdate} 
        />
      ),
    },
    {
      id: 'result',
      label: 'Result Config',
      icon: <Code className="h-4 w-4" />,
      content: (
        <JsonConfigEditTab 
          title="Result Component Configuration"
          description="Configure how results are displayed after form submission."
          data={editedApplet.resultComponentConfig}
          onUpdate={(value) => handleJsonConfigUpdate('resultComponentConfig', value)}
        />
      ),
    },
    {
      id: 'nextStep',
      label: 'Next Steps',
      icon: <ArrowRight className="h-4 w-4" />,
      content: (
        <JsonConfigEditTab 
          title="Next Step Configuration"
          description="Configure what happens after form submission."
          data={editedApplet.nextStepConfig}
          onUpdate={(value) => handleJsonConfigUpdate('nextStepConfig', value)}
        />
      ),
    },
    {
      id: 'references',
      label: 'References',
      icon: <Link className="h-4 w-4" />,
      content: (
        <ReferencesEditTab 
          appId={editedApplet.appId}
          compiledRecipeId={editedApplet.compiledRecipeId}
          subcategoryId={editedApplet.subcategoryId}
          onUpdate={handleFieldUpdate}
        />
      ),
    },
    {
      id: 'brokers',
      label: 'Broker Mappings',
      icon: <Workflow className="h-4 w-4" />,
      content: (
        <BrokerMappingsEditTab 
          brokerMap={editedApplet.brokerMap} 
          onUpdate={handleBrokerMappingsUpdate} 
        />
      ),
    },
    {
      id: 'legacy',
      label: 'Legacy Editor',
      icon: <History className="h-4 w-4" />,
      content: <LegacyEditorTab applet={editedApplet} />,
    },
  ];
  
  return (
    <EditTabLayout 
      title={editedApplet.name || 'Untitled Applet'} 
      subtitle={`ID: ${editedApplet.id}`}
      tabs={tabs}
      id={editedApplet.id}
      onSave={handleSave}
      hasChanges={hasChanges}
    />
  );
} 
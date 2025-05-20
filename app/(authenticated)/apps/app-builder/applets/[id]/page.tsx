'use client';

import React, { useEffect } from 'react';
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
  Info 
} from 'lucide-react';

// Tab Components
import TabLayout from './components/TabLayout';
import OverviewTab from './components/OverviewTab';
import ContainersTab from './components/ContainersTab';
import DataSourceTab from './components/DataSourceTab';
import JsonConfigTab from './components/JsonConfigTab';
import ReferencesTab from './components/ReferencesTab';
import BrokerMappingsTab from './components/BrokerMappingsTab';

// Types
import { ComponentType, ComponentProps, FieldOption } from '@/types/customAppTypes';

export interface FieldDefinition {
  id: string;
  label: string;
  description: string;
  helpText: string;
  component: ComponentType;
  required: boolean;
  placeholder: string;
  componentProps: ComponentProps;
  includeOther: boolean;
  group?: string;
  iconName?: string;
  defaultValue?: any;
  options?: FieldOption[];
}

export type AppletContainer = {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  hideDescription?: boolean;
  helpText?: string;
  gridCols?: string;
  fields: FieldDefinition[];
};

export interface WorkflowSourceConfig {
  sourceType: "workflow";
  id: string;
  workflowId: string;
  [key: string]: any;
}

export interface ApiSourceConfig {
  sourceType: "api";
  id: string;
  [key: string]: any;
}

export interface DatabaseSourceConfig {
  sourceType: "database";
  id: string;
  [key: string]: any;
}

export interface OtherSourceConfig {
  sourceType: "other";
  id: string;
  [key: string]: any;
}

export interface NeededBroker {
  id: string;
  name: string;
  required: boolean;
  dataType: string;
  defaultValue: string;
}

export interface RecipeSourceConfig {
  id: string;
  compiledId: string;
  version: number;
  neededBrokers: NeededBroker[];
}

export interface AppletSourceConfig {
  sourceType?: "recipe" | "workflow" | "api" | "database" | "other" | string;
  config?: RecipeSourceConfig | WorkflowSourceConfig | ApiSourceConfig | DatabaseSourceConfig | OtherSourceConfig;
}


export interface Broker {
  id: string;
  name: string;
  required: boolean;
  dataType: string;
  defaultValue: string;
  inputComponent: string;
}

export interface BrokerMapping {
  appletId: string;
  fieldId: string;
  brokerId: string;
}

export type AppletLayoutOption =
    | "horizontal"
    | "vertical"
    | "stepper"
    | "flat"
    | "open"
    | "oneColumn"
    | "twoColumn"
    | "threeColumn"
    | "fourColumn"
    | "tabs"
    | "accordion"
    | "minimalist"
    | "floatingCard"
    | "sidebar"
    | "carousel"
    | "cardStack"
    | "contextual"
    | "chat"
    | "mapBased"
    | "fullWidthSidebar"
    | "stepper-field"
    | "flat-accordion";

export type CustomAppletConfig = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  appletIcon?: string;
  appletSubmitText?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  layoutType?: AppletLayoutOption;
  containers?: AppletContainer[];
  dataSourceConfig?: AppletSourceConfig;
  resultComponentConfig?: any;
  nextStepConfig?: any;
  compiledRecipeId?: string;
  subcategoryId?: string;
  imageUrl?: string;
  appId?: string;
  brokerMap?: BrokerMapping[];
  overviewLabel?: string;  // "This will replace the message for Minimalist Layout as well as show after submission if things are put together. (eg. What are you looking for?)"
};

export interface AppletBuilder extends CustomAppletConfig {
  isPublic?: boolean;
  authenticatedRead?: boolean;
  publicRead?: boolean;
  isDirty?: boolean;
  isLocal?: boolean;
  slugStatus?: 'unchecked' | 'unique' | 'notUnique';
}



export default function AppletViewPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;

  const dispatch = useAppDispatch();
  
  // Get applet data from Redux
  const applet = useAppSelector((state) => selectAppletById(state, id));
  const isLoading = useAppSelector(selectAppletLoading);
  
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
  
  // Loading state
  if (isLoading || !applet) {
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
        <OverviewTab 
          id={applet.id}
          name={applet.name}
          description={applet.description}
          slug={applet.slug}
          creator={applet.creator}
          imageUrl={applet.imageUrl}
          primaryColor={applet.primaryColor}
          accentColor={applet.accentColor}
          appletIcon={applet.appletIcon}
          appletSubmitText={applet.appletSubmitText}
          layoutType={applet.layoutType}
          overviewLabel={applet.overviewLabel}
        />
      ),
    },
    {
      id: 'containers',
      label: 'Containers',
      icon: <LayoutIcon className="h-4 w-4" />,
      content: <ContainersTab containers={applet.containers} />,
    },
    {
      id: 'datasource',
      label: 'Data Source',
      icon: <Database className="h-4 w-4" />,
      content: <DataSourceTab dataSourceConfig={applet.dataSourceConfig} />,
    },
    {
      id: 'result',
      label: 'Result Config',
      icon: <Code className="h-4 w-4" />,
      content: (
        <JsonConfigTab 
          title="Result Component Configuration"
          description="Configuration for the component that displays results after form submission."
          data={applet.resultComponentConfig}
          emptyMessage="No result component configuration defined for this applet."
        />
      ),
    },
    {
      id: 'nextStep',
      label: 'Next Steps',
      icon: <ArrowRight className="h-4 w-4" />,
      content: (
        <JsonConfigTab 
          title="Next Step Configuration"
          description="Configuration for what happens after form submission."
          data={applet.nextStepConfig}
          emptyMessage="No next step configuration defined for this applet."
        />
      ),
    },
    {
      id: 'references',
      label: 'References',
      icon: <Link className="h-4 w-4" />,
      content: (
        <ReferencesTab 
          appId={applet.appId}
          compiledRecipeId={applet.compiledRecipeId}
          subcategoryId={applet.subcategoryId}
        />
      ),
    },
    {
      id: 'brokers',
      label: 'Broker Mappings',
      icon: <Workflow className="h-4 w-4" />,
      content: <BrokerMappingsTab brokerMap={applet.brokerMap} />,
    },
  ];
  
  return (
    <TabLayout 
      title={applet.name || 'Untitled Applet'} 
      subtitle={`ID: ${applet.id}`}
      tabs={tabs}
      id={applet.id}
    />
  );
} 
'use client';

import { useState, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { BrokerComponentType, BROKER_COMPONENTS } from "@/components/brokers/value-components";
import SingleBrokerSectionUI from "@/components/brokers/value-sections/single-broker/SingleBrokerSectionUI";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DEFAULT_VALUES } from "./_dev/component-schemas";
import ComponentConfigurator from "./_dev/ComponentConfigurator";

const DEMO_COMPONENTS = Object.entries(BROKER_COMPONENTS).reduce((acc, [key, Component]) => {
    acc[key] = Component;
    return acc;
}, {} as typeof BROKER_COMPONENTS);

export default function ComponentEditor() {
    const componentId = useMemo(() => uuidv4(), []);
    const [selectedComponent, setSelectedComponent] = useState<BrokerComponentType | null>(null);
    const [config, setConfig] = useState<any>(null);

    const inputComponents = useMemo(() => {
        if (!selectedComponent || !config) return {};
        
        return {
            [componentId]: {
                ...config,
                component: selectedComponent,
                isDemo: true,
                additionalParams: {
                    ...config.additionalParams,
                    isDemo: true
                }
            }
        };
    }, [componentId, config, selectedComponent]);

    const handleComponentChange = (value: BrokerComponentType) => {
        setSelectedComponent(value);
        const initialConfig = {
            ...DEFAULT_VALUES[value],
            id: componentId,
            component: value,
            isDemo: true,
            name: '',
            description: '',
        };
        setConfig(initialConfig);
    };

    const handleConfigChange = (newConfig: any) => {
        setConfig(prevConfig => ({
            ...prevConfig,
            ...newConfig,
            id: componentId,
            component: selectedComponent,
            isDemo: true,
            additionalParams: {
                ...prevConfig?.additionalParams,
                ...newConfig?.additionalParams,
                isDemo: true
            }
        }));
    };

    const renderComponent = useMemo(() => {
        if (!selectedComponent || !config) return null;
        
        const Component = DEMO_COMPONENTS[selectedComponent];
        if (!Component) return null;
        
        return (
            <Component
                inputComponent={config}
            />
        );
    }, [selectedComponent, config]);

    return (
        <div className="flex gap-4">
            <div className="w-64 space-y-4">
                <Select
                    value={selectedComponent || ''}
                    onValueChange={handleComponentChange}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a component" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(BROKER_COMPONENTS).map((key) => (
                            <SelectItem key={key} value={key}>
                                {key}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {selectedComponent && config && (
                    <ComponentConfigurator
                        selectedComponent={selectedComponent}
                        config={config}
                        onChange={handleConfigChange}
                    />
                )}
            </div>
            
            <div className="flex-1">
                {selectedComponent && (
                    <SingleBrokerSectionUI
                        sectionTitle="Preview"
                        isLoading={false}
                        isComponentsReady={true}
                        brokerComponent={renderComponent}
                        isDemo={true}
                    />
                )}
            </div>
        </div>
    );
}
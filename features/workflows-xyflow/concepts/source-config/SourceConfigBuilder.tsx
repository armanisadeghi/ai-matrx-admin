import { useState } from "react";
import { createEmptyConfigGeneric } from "./utils";
import { BrokerSourceConfig, SourceType } from "./types";
import { Button } from "@/components/ui/button";
import { Download, Copy, Trash2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BaseConfigForm from "./BaseConfigForm";
import DatabaseConfigForm from "./DatabaseConfigForm";
import APIConfigForm from "./ApiConfigForm";
import FileConfigForm from "./FileConfigForm";
import StateConfigForm from "./StateConfigForm";
import ComputedConfigForm from "./ComputedConfigForm";
import FunctionConfigForm from "./FunctionConfigForm";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { useEffect } from "react";


const SourceConfigBuilder = () => {
    const [configs, setConfigs] = useState([]);
    const [activeTab, setActiveTab] = useState("0");
    const { dataBrokerRecordsById, fetchDataBrokerAll } = useDataBrokerWithFetch();

    useEffect(() => {
        if (Object.keys(dataBrokerRecordsById).length === 0) {
            fetchDataBrokerAll();
        }
    }, [dataBrokerRecordsById, fetchDataBrokerAll]);

    // Helper function to get broker name from ID
    const getBrokerName = (brokerId: string) => {
        const broker = dataBrokerRecordsById[brokerId];
        return broker?.name || brokerId;
    };

    // Helper function to generate tab label
    const getTabLabel = (config: BrokerSourceConfig, index: number) => {
        if (config.broker_id) {
            return getBrokerName(config.broker_id);
        }
        return `${config.source_type.charAt(0).toUpperCase() + config.source_type.slice(1)} ${index + 1}`;
    };

    const addConfig = (sourceType: SourceType) => {
        const newConfig = createEmptyConfigGeneric(sourceType);
        const newConfigs = [...configs, newConfig];
        setConfigs(newConfigs);
        setActiveTab(String(newConfigs.length - 1));
    };

    const updateConfig = (index: number, newConfig: BrokerSourceConfig) => {
        const newConfigs = [...configs];
        newConfigs[index] = newConfig;
        setConfigs(newConfigs);
    };

    const removeConfig = (index: number) => {
        const newConfigs = configs.filter((_, i) => i !== index);
        setConfigs(newConfigs);
        if (activeTab === String(index)) {
            setActiveTab("0");
        }
    };

    const duplicateConfig = (index: number) => {
        const configToDuplicate = { ...configs[index] };
        // Clear broker_id so user can select a new one - don't create invalid IDs
        configToDuplicate.broker_id = "";
        const newConfigs = [...configs, configToDuplicate];
        setConfigs(newConfigs);
        setActiveTab(String(newConfigs.length - 1));
    };

    const exportConfigs = () => {
        const dataStr = JSON.stringify(configs, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "source_configs.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderSpecificConfigForm = (config: BrokerSourceConfig, index: number) => {
        const commonProps = {
            config,
            onChange: (newConfig) => updateConfig(index, newConfig),
        };

        switch (config.source_type) {
            case SourceType.DATABASE:
                return <DatabaseConfigForm {...commonProps} />;
            case SourceType.API:
                return <APIConfigForm {...commonProps} />;
            case SourceType.FILE:
                return <FileConfigForm {...commonProps} />;
            case SourceType.STATE:
                return <StateConfigForm {...commonProps} />;
            case SourceType.COMPUTED:
                return <ComputedConfigForm {...commonProps} />;
            case SourceType.FUNCTION:
                return <FunctionConfigForm {...commonProps} />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Source Configuration Builder</h1>
                <div className="flex gap-2">
                    <Button onClick={exportConfigs} variant="outline" disabled={configs.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Configs
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Source</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(SourceType).map(([key, value]) => (
                            <Button key={value} onClick={() => addConfig(value)} variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                {key.toLowerCase()}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {configs.length > 0 && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 lg:grid-cols-6">
                        {configs.map((config, index) => (
                            <TabsTrigger key={index} value={String(index)} className="text-xs">
                                {getTabLabel(config, index)}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {configs.map((config, index) => (
                        <TabsContent key={index} value={String(index)}>
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2">
                                            <Badge variant="secondary">{config.source_type}</Badge>
                                            {getTabLabel(config, index)}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button onClick={() => duplicateConfig(index)} variant="outline" size="sm">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button onClick={() => removeConfig(index)} variant="outline" size="sm">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Base Configuration</h3>
                                        <BaseConfigForm config={config} onChange={(newConfig) => updateConfig(index, newConfig)} />
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                                            {config.source_type.charAt(0).toUpperCase() + config.source_type.slice(1)} Configuration
                                        </h3>
                                        {renderSpecificConfigForm(config, index)}
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-gray-100">Generated JSON</h4>
                                        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto max-h-120 text-gray-900 dark:text-gray-100">
                                            {JSON.stringify(config, null, 2)}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {configs.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No source configurations created yet.</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Click on a source type above to get started.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SourceConfigBuilder;

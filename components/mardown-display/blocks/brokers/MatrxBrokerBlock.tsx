import React, { useState, useEffect, useCallback } from "react";
import { LuVariable } from "react-icons/lu";
import { cn } from "@/lib/utils";
import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FancyInput } from "@/components/ui/input";
import { FancyTextarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaveIcon, RotateCcwIcon } from "lucide-react";
import { MatrxMetadata, MatrxStatus, encodeMatrxMetadata } from "@/features/rich-text-editor/utils/patternUtils";
import { getAllColorOptions } from "@/features/rich-text-editor/utils/colorUitls";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { DataBrokerData } from "@/types";
import FieldListTableOverlay from '@/features/applet/builder/modules/field-builder/FieldListTableOverlay';

/* TODO:

- Connect this to Entities slice to attempt to fetch the broker by id.
- If the broker is found, then it's 'connected' and if it's not, then it's 'disconnected'
- The user also needs the ability to connect this instance of a broker to any broker they already have.
- We need a way to display a list of available brokers for them to connect to.
- However, if they make a change in the connection, we have to be careful about allowing changes because they will then be changing a broker that might already be used in other workflows.
   - They can certainly do that, but we need a way to separate what they do that impacts only this instance and what will modify the actual broker system-wide.
   - There must be a clear separation between the aspect of a broker which are 'local' and those which are going to impact that broker anywhere.

*/






// Define component and data type options
const COMPONENT_OPTIONS = [
    { value: "button", label: "Button" },
    { value: "select", label: "Select" },
    { value: "input", label: "Input" },
    { value: "textarea", label: "Textarea" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio" },
    { value: "slider", label: "Slider" },
    { value: "multiselect", label: "Multi-select" },
    { value: "custom", label: "Custom" },
];

const DATA_TYPE_OPTIONS = [
    { value: "str", label: "Text (String)" },
    { value: "bool", label: "Boolean" },
    { value: "dict", label: "Dictionary" },
    { value: "float", label: "Decimal (Float)" },
    { value: "int", label: "Integer" },
    { value: "list", label: "List" },
    { value: "url", label: "URL" },
];

// Helper function to get status color
const getStatusColor = (status: MatrxStatus | undefined) => {
    switch (status) {
        case "active":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
        case "new":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
        case "disconnected":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
        case "deleted":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
};

interface MatrxBrokerBlockProps {
    content: string;
    metadata: MatrxMetadata;
    onUpdate?: (updatedBrokerContent: string, originalBrokerContent: string) => void;
    onDelete?: () => void;
}

const MatrxBrokerBlock: React.FC<MatrxBrokerBlockProps> = ({ content, metadata, onUpdate, onDelete }) => {
    const [editedMetadata, setEditedMetadata] = useState<MatrxMetadata>({ ...metadata });
    const [originalMetadata, setOriginalMetadata] = useState<MatrxMetadata>({ ...metadata });
    const { toast } = useToast();
    const colorOptions = getAllColorOptions();
    const colorStyle = colorOptions.find((option) => option.color === metadata.color)?.className || "";

    const elevationStyles = "border border-gray-200 dark:border-gray-600 shadow-sm";
    const { fetchDataBrokerAll, dataBrokerActions, dataBrokerRecordsById } = useDataBrokerWithFetch();

    // Look up the actual broker data from the store
    const brokerData = metadata.id ? dataBrokerRecordsById[metadata.id] : undefined;

    const updateBroker = useCallback((brokerId: string, updatedData: Partial<DataBrokerData>) => {
        dataBrokerActions.directUpdateRecord({matrxRecordId: `id:${brokerId}`, data: updatedData});
    }, [dataBrokerActions]);



    useEffect(() => {
        fetchDataBrokerAll();
    }, []);


    useEffect(() => {
        setEditedMetadata({ ...metadata });
        setOriginalMetadata({ ...metadata });
    }, [metadata]);

    const handleSave = () => {
        const updatedContent = encodeMatrxMetadata(editedMetadata);

        if (onUpdate) {
            onUpdate(updatedContent, content);
        }

        setOriginalMetadata({ ...editedMetadata });

        toast({
            title: "Broker updated",
            description: "Your broker has been saved successfully",
        });
    };

    const handleRevert = () => {
        setEditedMetadata({ ...originalMetadata });

        toast({
            title: "Changes reverted",
            description: "Your changes have been discarded",
        });
    };

    const isBroken = !metadata.id;

    // Display broker name from fetched data, fallback to metadata, then "Unknown Broker"
    const displayName = brokerData?.name || metadata.name || "Unknown Broker";

    return (
        <ChatCollapsibleWrapper
            icon={<LuVariable className="h-6 w-6 text-blue-500 dark:text-blue-400" />}
            title={`Broker: ${displayName}`}
            className={cn("group relative", isBroken && "border-red-300 dark:border-red-700")}
            initialOpen={false}
        >
            <div className="space-y-2">
                {/* ID field with copy button */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-muted-foreground w-24 flex-shrink-0">ID:</label>
                    <div className="flex-1">
                        <FancyInput
                            value={editedMetadata.id || ""}
                            onChange={(e) => setEditedMetadata({ ...editedMetadata, id: e.target.value })}
                            className={cn("font-mono text-sm w-full", elevationStyles)}
                        />
                    </div>
                </div>

                {/* Name field with copy button - now on same line as label */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-muted-foreground w-24 flex-shrink-0">Name:</label>
                    <div className="flex-1">
                        <FancyInput
                            value={brokerData?.name || editedMetadata.name || ""}
                            onChange={(e) => setEditedMetadata({ ...editedMetadata, name: e.target.value })}
                            className={cn("text-sm w-full", elevationStyles)}
                        />
                    </div>
                </div>

                {/* Field Component ID - now using Select instead of DropdownMenu */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-muted-foreground w-24 flex-shrink-0">Field Component:</label>
                    <Select
                        value={brokerData?.fieldComponentId || editedMetadata.defaultComponent || "none"}
                        onValueChange={(value) =>
                            setEditedMetadata({ ...editedMetadata, defaultComponent: value === "none" ? undefined : value })
                        }
                    >
                        <SelectTrigger className={cn("w-full", elevationStyles)}>
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {COMPONENT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Output Component selector */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-muted-foreground w-24 flex-shrink-0">Output Component:</label>
                    <Select
                        value={brokerData?.outputComponent || editedMetadata.outputComponent || "none"}
                        onValueChange={(value) =>
                            setEditedMetadata({ ...editedMetadata, outputComponent: value === "none" ? undefined : value })
                        }
                    >
                        <SelectTrigger className={cn("w-full", elevationStyles)}>
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {COMPONENT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Data type selector - now using Select instead of DropdownMenu */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-muted-foreground w-24 flex-shrink-0">Data Type:</label>
                    <Select
                        value={brokerData?.dataType || editedMetadata.dataType || "none"}
                        onValueChange={(value) => setEditedMetadata({ ...editedMetadata, dataType: value === "none" ? undefined : value })}
                    >
                        <SelectTrigger className={cn("w-full", elevationStyles)}>
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {DATA_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Default value field with copy button - textarea on new line and full width */}
                <div className="my-4 border border-gray-200 dark:border-gray-600 shadow-sm rounded-t-xl">
                    <label className="pl-2 mt-2 text-sm text-muted-foreground block mb-2">Default Value:</label>
                    <FancyTextarea
                        className={cn("min-h-[100px] font-mono text-sm w-full resize-y", elevationStyles)}
                        value={brokerData?.defaultValue || editedMetadata.defaultValue || ""}
                        onChange={(e) => setEditedMetadata({ ...editedMetadata, defaultValue: e.target.value })}
                        placeholder="Enter default value"
                    />
                </div>

                {isBroken && (
                    <div className="rounded-md bg-red-50 p-2 text-red-800 dark:bg-red-950 dark:text-red-200 text-sm">
                        Warning: This broker entry is broken or incomplete (missing ID).
                    </div>
                )}

                {/* Bottom action buttons */}
                <div className="flex justify-between items-center gap-2 pt-2">
                    <Badge className={cn("text-sm px-4 py-1 rounded-full", editedMetadata.status && getStatusColor(editedMetadata.status))}>
                        {editedMetadata.status ? editedMetadata.status.charAt(0).toUpperCase() + editedMetadata.status.slice(1) : "None"}
                    </Badge>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRevert} className="flex items-center gap-1">
                            <RotateCcwIcon className="h-4 w-4" />
                            Revert
                        </Button>
                        <Button onClick={handleSave} className="flex items-center gap-1">
                            <SaveIcon className="h-4 w-4" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </ChatCollapsibleWrapper>
    );
};

export default MatrxBrokerBlock;

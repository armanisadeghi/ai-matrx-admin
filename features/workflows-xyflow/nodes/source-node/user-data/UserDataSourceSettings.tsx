"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowLeft, Database, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import TableReferenceIcon from "@/components/user-generated-table-data/TableReferenceIcon";
import { UserDataReference } from "@/components/user-generated-table-data/tableReferences";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowsSelectors, workflowActions } from "@/lib/redux/workflow";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";
import { toast } from "sonner";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { BrokerMapEntry } from "@/lib/redux/brokerSlice/types";
import BrokerSelect from "@/features/workflows-xyflow/common/BrokerSelect";

interface UserDataSourceSettingsProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    brokerId?: string;
    onSuccess?: () => void;
    onBack?: () => void;
}

const UserDataSourceSettings: React.FC<UserDataSourceSettingsProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    brokerId,
    onSuccess,
    onBack,
}) => {
    const dispatch = useAppDispatch();
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();

    // Check if mapping exists in Redux
    const existingSource = useAppSelector((state) =>
        brokerId ? workflowsSelectors.userDataSourceByBrokerId(state, workflowId, brokerId) : null
    );

    // Local state for the form
    const [formData, setFormData] = useState({
        brokerId: brokerId || "",
        selectedReference: null as UserDataReference | null,
        source: "workflow",
        sourceId: workflowId,
    });

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize form data from Redux state if mapping exists
    useEffect(() => {
        if (existingSource?.sourceDetails) {
            setFormData({
                brokerId: existingSource.brokerId,
                selectedReference: existingSource.sourceDetails as UserDataReference,
                source: existingSource.scope || "workflow",
                sourceId: workflowId,
            });
        } else {
            // Reset form when no existing source or when brokerId changes
            setFormData({
                brokerId: brokerId || "",
                selectedReference: null,
                source: "workflow",
                sourceId: workflowId,
            });
        }
    }, [existingSource, brokerId, workflowId]);

    const handleBrokerChange = useCallback((newBrokerId: string) => {
        setFormData((prev) => ({ ...prev, brokerId: newBrokerId }));
    }, []);

    const handleSourceChange = useCallback(
        (newSource: string) => {
            setFormData((prev) => ({
                ...prev,
                source: newSource,
                sourceId: newSource === "workflow" ? workflowId : prev.sourceId,
            }));
        },
        [workflowId]
    );

    const handleSourceIdChange = useCallback((sourceId: string) => {
        setFormData((prev) => ({ ...prev, sourceId }));
    }, []);

    const handleReferenceSelect = useCallback((reference: UserDataReference) => {
        setFormData((prev) => ({ ...prev, selectedReference: reference }));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!formData.brokerId.trim() || !formData.selectedReference) {
            toast.error("Please select both a broker and data reference.");
            return;
        }

        setIsSubmitting(true);

        try {
            const mapEntry: BrokerMapEntry = {
                brokerId: formData.brokerId,
                mappedItemId: formData.selectedReference.table_id || formData.selectedReference.table_name,
                source: formData.source,
                sourceId: formData.sourceId,
            };

            const sourceConfig: BrokerSourceConfig<"user_data"> = {
                sourceType: "user_data" as const,
                brokerId: formData.brokerId,
                scope: formData.source as any,
                relays: [],
                extraction: null,
                sourceDetails: formData.selectedReference,
                metadata: {},
            };

            // If there's an existing source, remove it first
            if (existingSource) {
                dispatch(
                    workflowActions.removeSourceByBrokerId({
                        id: workflowId,
                        brokerId: existingSource.brokerId,
                    })
                );

                // If broker ID changed, remove old registry entry
                if (existingSource.sourceDetails && formData.brokerId !== existingSource.brokerId) {
                    dispatch(brokerActions.removeRegisterEntry({
                        source: existingSource.scope || "workflow",
                        mappedItemId: (existingSource.sourceDetails as UserDataReference).table_id || (existingSource.sourceDetails as UserDataReference).table_name,
                    }));
                }
            }

            // Add the source (create or update)
            dispatch(
                workflowActions.addSource({
                    id: workflowId,
                    source: sourceConfig,
                })
            );

            // Update broker registry
            dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));

            toast.success("Data source saved successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error saving data source:", error);
            toast.error("Failed to save data source");
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, existingSource, workflowId, dispatch, onOpenChange, onSuccess]);

    const handleDelete = useCallback(async () => {
        if (!existingSource) return;

        setIsDeleting(true);

        try {
            // Remove from workflow sources
            dispatch(
                workflowActions.removeSourceByBrokerId({
                    id: workflowId,
                    brokerId: existingSource.brokerId,
                })
            );

            // Remove from broker registry
            if (existingSource.sourceDetails) {
                dispatch(brokerActions.removeRegisterEntry({
                    source: existingSource.scope || "workflow",
                    mappedItemId: (existingSource.sourceDetails as UserDataReference).table_id || (existingSource.sourceDetails as UserDataReference).table_name,
                }));
            }

            toast.success("Data source deleted successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error deleting data source:", error);
            toast.error("Failed to delete data source");
        } finally {
            setIsDeleting(false);
        }
    }, [existingSource, workflowId, dispatch, onOpenChange, onSuccess]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // Helper function to render reference details in a structured format
    const renderReferenceDetails = (reference: UserDataReference) => {
        const details = [
            { label: "Type", value: reference.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) },
            { label: "Table Name", value: reference.table_name },
            { label: "Table ID", value: reference.table_id },
        ];

        // Add conditional fields based on reference type
        if (reference.column_name) {
            details.push({ label: "Column Name", value: reference.column_name });
        }
        if (reference.row_id) {
            details.push({ label: "Row ID", value: reference.row_id });
        }
        if (reference.column_display_name) {
            details.push({ label: "Column Display Name", value: reference.column_display_name });
        }

        // Add description last
        details.push({ label: "Description", value: reference.description || "No description" });

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <Database className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Data Reference Details</span>
                </div>
                <Table>
                    <TableBody>
                        {details.map((detail, index) => (
                            <TableRow
                                key={index}
                                className={cn(
                                    "border-b transition-colors hover:bg-muted/50",
                                    index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : "bg-slate-100/50 dark:bg-slate-700/30"
                                )}
                            >
                                <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400 w-32 py-2">
                                    {detail.label}:
                                </TableCell>
                                <TableCell className="text-sm text-slate-900 dark:text-slate-100 font-mono px-2 py-1 rounded flex-1 break-all">
                                    {detail.value}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const isFormValid = formData.brokerId.trim() && formData.selectedReference;
    const hasChanges = !existingSource || !existingSource.sourceDetails || (
        formData.brokerId !== existingSource.brokerId ||
        JSON.stringify(formData.selectedReference) !== JSON.stringify(existingSource.sourceDetails) ||
        formData.source !== (existingSource.scope || "workflow") ||
        formData.sourceId !== workflowId
    );

    // Get broker display name
    const brokerDisplayName = brokerId && dataBrokerRecordsById[brokerId]?.name || brokerId;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl aria-describedby={undefined}">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onBack} 
                                className="p-1 h-auto"
                                disabled={isSubmitting || isDeleting}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <DialogTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                            Data Source{brokerDisplayName ? ` - ${brokerDisplayName}` : ""}
                        </DialogTitle>
                        <DialogDescription className="sr-only">Manage data sources for this workflow.</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Configure the data table to use as a source for this workflow. The selected table's data will be available to workflow nodes.
                    </div>

                    {/* Broker Selection */}
                    <BrokerSelect 
                        value={formData.brokerId} 
                        onValueChange={handleBrokerChange} 
                        disabled={isSubmitting || isDeleting} 
                    />

                    {/* Data Reference Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Data Reference</Label>
                        {formData.selectedReference ? (
                            <div className="p-4 bg-background rounded-lg border">{renderReferenceDetails(formData.selectedReference)}</div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 p-6 bg-background border-2 border-dashed border-muted-foreground/30 rounded-2xl">
                                <Database className="w-8 h-8 text-muted-foreground" />
                                <div className="text-center">
                                    <div className="text-sm font-medium text-foreground mb-1">Select Data Reference</div>
                                    <div className="text-xs text-muted-foreground">Choose table, row, column, or cell</div>
                                </div>
                                <TableReferenceIcon
                                    onReferenceSelect={handleReferenceSelect}
                                    size="md"
                                    variant="outline"
                                    title="Select Data Reference"
                                />
                            </div>
                        )}
                    </div>

                    {/* Source (Scope) */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Source</Label>
                        <Select 
                            value={formData.source} 
                            onValueChange={handleSourceChange} 
                            disabled={isSubmitting || isDeleting}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">global</SelectItem>
                                <SelectItem value="session">session</SelectItem>
                                <SelectItem value="task">task</SelectItem>
                                <SelectItem value="organization">organization</SelectItem>
                                <SelectItem value="user">user</SelectItem>
                                <SelectItem value="workflow">workflow</SelectItem>
                                <SelectItem value="action">action</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Source ID */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Source ID</Label>
                        <Input
                            value={formData.sourceId}
                            onChange={(e) => handleSourceIdChange(e.target.value)}
                            placeholder="Enter source ID"
                            disabled={isSubmitting || isDeleting}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {existingSource && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDelete} 
                            disabled={isSubmitting || isDeleting} 
                            className="mr-auto"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    )}

                    <Button 
                        variant="outline" 
                        onClick={handleCancel} 
                        disabled={isSubmitting || isDeleting}
                    >
                        Cancel
                    </Button>
                    
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!isFormValid || !hasChanges || isSubmitting || isDeleting}
                    >
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserDataSourceSettings;

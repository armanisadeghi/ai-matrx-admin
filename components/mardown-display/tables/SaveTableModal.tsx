"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToastManager } from "@/hooks/useToastManager";
import { cn } from "@/lib/utils";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { supabase } from "@/utils/supabase/client";
import {
  createTable,
  addRow,
  type FieldDefinition,
} from "@/utils/user-table-utls/table-utils";
import { sanitizeFieldName } from "@/utils/user-table-utls/field-name-sanitizer";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openQuickDataWindow } from "@/lib/redux/slices/overlaySlice";

// Public response shape — kept stable so parents (`SavedTableInfo` in
// MarkdownTable / StreamingTableRenderer) and downstream consumers continue
// working without changes.
export interface SaveTableResponse {
  table_id: string;
  table_name: string;
  row_count: string;
  field_count: string;
}

const getLoadingStates = (rowCount: number) => {
  const baseMessages = [
    { text: "Initializing table structure..." },
    { text: "Analyzing data patterns..." },
    { text: "Optimizing columns and rows..." },
    { text: "Creating database entries..." },
    { text: "Generating table metadata..." },
    { text: "Setting up data relationships..." },
    { text: "Finalizing table creation..." },
    { text: "Almost there! Preparing your table..." },
  ];

  if (rowCount > 20) {
    baseMessages.splice(3, 0, { text: "Processing data records..." });
    baseMessages.splice(5, 0, { text: "Validating data integrity..." });
  }

  if (rowCount > 50) {
    baseMessages.splice(2, 0, { text: "Optimizing for large dataset..." });
    baseMessages.splice(7, 0, { text: "Running performance checks..." });
  }

  return baseMessages;
};

interface SaveTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete?: (tableInfo: SaveTableResponse) => void;
  /** Normalized rows from the table — `Array<{ [displayHeader]: cellValue }>`. */
  tableData: Array<Record<string, string>>;
}

const SaveTableModal: React.FC<SaveTableModalProps> = ({
  isOpen,
  onClose,
  onSaveComplete,
  tableData,
}) => {
  const dispatch = useAppDispatch();
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [stage, setStage] = useState<"form" | "saving">("form");
  const toast = useToastManager();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Derive headers from the first row's keys. Object key order is
  // insertion-order-preserved per ES2015+ for string keys, and the upstream
  // `normalizedData` is built from the headers array in order — so this
  // matches the visible column order.
  const displayHeaders = useMemo(() => {
    const first = tableData?.[0];
    return first ? Object.keys(first) : [];
  }, [tableData]);

  const rowCount = Array.isArray(tableData) ? tableData.length : 0;

  // Reset form shortly after close so reopening starts fresh.
  useEffect(() => {
    if (isOpen) return;
    const timeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      setStage("form");
      setTableName("");
      setTableDescription("");
    }, 300);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  const handleSave = async () => {
    if (!tableName.trim()) {
      toast.error("Table name is required");
      return;
    }
    if (!tableDescription.trim()) {
      toast.error("Table description is required");
      return;
    }
    if (displayHeaders.length === 0 || rowCount === 0) {
      toast.error("Table is empty — nothing to save");
      return;
    }
    if (stage === "saving") return;

    setStage("saving");

    try {
      // Build field schema. First column is required (acts as the row key);
      // the rest are optional. All cells from a markdown table are strings.
      const fields: FieldDefinition[] = displayHeaders.map((header, index) => ({
        field_name: sanitizeFieldName(header) || `column_${index + 1}`,
        display_name: header,
        data_type: "string",
        field_order: index + 1,
        is_required: index === 0,
      }));

      const createResult = await createTable(supabase, {
        tableName: tableName.trim(),
        description: tableDescription.trim(),
        isPublic: false,
        authenticatedRead: false,
        fields,
      });

      if (!createResult.success || !createResult.tableId) {
        throw new Error(createResult.error ?? "Failed to create table");
      }

      const tableId = createResult.tableId;

      // Map display-header → sanitized field_name so row payloads match the
      // schema we just created.
      const headerToFieldName = new Map(
        displayHeaders.map((header, index) => [
          header,
          fields[index].field_name,
        ]),
      );

      const insertResults = await Promise.all(
        tableData.map((row) => {
          const payload: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            const fieldName =
              headerToFieldName.get(key) ?? sanitizeFieldName(key);
            if (fieldName) payload[fieldName] = value;
          }
          return addRow(supabase, { tableId, data: payload });
        }),
      );

      const failedCount = insertResults.filter((r) => !r.success).length;
      if (failedCount > 0) {
        const firstError = insertResults.find((r) => !r.success)?.error;
        toast.warning(
          `${failedCount} of ${rowCount} row(s) failed to save${
            firstError ? `: ${firstError}` : ""
          }`,
        );
      }

      if (!isMountedRef.current) return;

      const response: SaveTableResponse = {
        table_id: tableId,
        table_name: tableName.trim(),
        row_count: String(rowCount - failedCount),
        field_count: String(fields.length),
      };

      // Hand the new table off to the Data Tables window — it shows the new
      // table pre-selected with the full table sidebar so the user can keep
      // working in the rest of the app while reviewing/editing it. This
      // replaces the old in-modal `UserTableViewer` result stage.
      dispatch(openQuickDataWindow({ tableId: response.table_id }));

      toast.success(`Table "${response.table_name}" saved`);
      onSaveComplete?.(response);
      onClose();
    } catch (err) {
      if (!isMountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to create table";
      toast.error(message);
      setStage("form");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      tableName.trim() &&
      tableDescription.trim() &&
      stage === "form"
    ) {
      e.preventDefault();
      handleSave();
    }
  };

  const isLoading = stage === "saving";

  // While stage === "saving", the MultiStepLoader takes the entire screen.
  // Rendering the Dialog at the same time produced an awkward empty modal
  // box layered against the loader's backdrop, which also blocked clicks.
  // We unmount the Dialog during saving and let the loader own the surface.
  const showDialog = isOpen && stage !== "saving";

  return (
    <>
      {showDialog && (
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <DialogContent
            className={cn(
              "bg-textured text-gray-900 dark:text-gray-100 overflow-hidden",
              "sm:max-w-[425px] p-6",
            )}
          >
            <DialogHeader className="flex flex-row items-center justify-between mb-2">
              <DialogTitle className="text-xl font-semibold">
                Save Table
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="table-name"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Table Name*
                </Label>
                <Input
                  id="table-name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Enter table name"
                  className="border border-border bg-textured"
                  disabled={isLoading}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="table-description"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Description*
                </Label>
                <Textarea
                  id="table-description"
                  value={tableDescription}
                  onChange={(e) => setTableDescription(e.target.value)}
                  placeholder="Enter table description"
                  rows={3}
                  className="border border-border bg-textured resize-none"
                  disabled={isLoading}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-border"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={
                  isLoading || !tableName.trim() || !tableDescription.trim()
                }
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Save Table"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen loader owns the screen while saving */}
      <MultiStepLoader
        loadingStates={getLoadingStates(rowCount)}
        loading={isLoading}
        duration={600}
        loop={false}
      />
    </>
  );
};

export default SaveTableModal;

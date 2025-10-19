"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import UserTableViewer from "@/components/user-generated-table-data/UserTableViewer";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";
import { DbFunctionNode } from "@/features/workflows/types";


interface TableData {
    table_id: string;
    table_name?: string;
    row_count?: string;
    field_count?: string;
    success?: boolean;
    errors?: any;
    execution_time_ms?: number;
}


interface ViewTablePageProps {
  nodeData: DbFunctionNode;
  brokerId?: string;
  tableId?: string;
}

const ViewTablePage: React.FC<ViewTablePageProps> = ({ nodeData, brokerId, tableId }) => {
    if (!brokerId) {
        brokerId = nodeData.return_broker_overrides[0];
    }

    const data = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId)) as TableData;

    const dataToUse = useMemo(() => {
        if (!tableId) {
            return data;
        }
        return {
          table_id: tableId,
        } as TableData;
    }, [data, tableId]);

    if (!dataToUse) {
        return <div>Content not available</div>;
    }

    const handleOpenInNewTab = () => {
        if (dataToUse.table_id) {
            window.open(`/data/${dataToUse.table_id}`, "_blank");
        }
    };

    return (
        <div className={cn("bg-textured text-gray-900 dark:text-gray-100 w-full h-full flex flex-col")}>
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-textured">
                    <UserTableViewer tableId={dataToUse.table_id} showTableSelector={false} />
                </div>
            </div>

            <div className="flex items-center gap-2 mt-2 pt-2">
                <div className="flex justify-end w-full gap-2">
                    <Button
                        variant="outline"
                        onClick={handleOpenInNewTab}
                        className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 border border-blue-300 dark:border-blue-700"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ViewTablePage;

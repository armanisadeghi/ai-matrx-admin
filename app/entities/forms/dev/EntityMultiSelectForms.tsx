'use client';

import React from "react";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import QuickRefMultiSelect from "../../quick-reference/QuickRefMultiSelect";
import { ScrollArea } from "@/components/ui";
import EntityFormRecordSelections from "../EntityFormRecordSelections";

interface EntityMultiSelectFormsProps extends UnifiedLayoutProps {
  onRecordsChange?: (records: QuickReferenceRecord[]) => void;
}

const EntityMultiSelectForms: React.FC<EntityMultiSelectFormsProps> = ({
    onRecordsChange = () => {},
    ...unifiedLayoutProps
  }) => {
    return (
      <div className="flex flex-col h-full py-3">
        <div className="mb-3">
          <QuickRefMultiSelect
            entityKey={"broker"}
            onRecordsChange={onRecordsChange}
          />
        </div>
        
        <ScrollArea className="flex-1">
          <div className="pr-3">
            <EntityFormRecordSelections {...unifiedLayoutProps} />
          </div>
        </ScrollArea>
      </div>
    );
  };
  
  export default EntityMultiSelectForms;
  
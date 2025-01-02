'use client';

import React from "react";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import QuickRefMultiSelect from "../quick-reference/QuickRefMultiSelect";
import { EntityFormRecordSelections } from "./EntityFormRecordSelections";
import { ScrollArea } from "@/components/ui";

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
            entityKey={unifiedLayoutProps.layoutState.selectedEntity}
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
  
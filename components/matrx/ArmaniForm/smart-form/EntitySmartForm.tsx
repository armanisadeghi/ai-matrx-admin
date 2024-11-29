import React from "react";
import {EntityKeys} from "@/types/entityTypes";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import {SmartForm} from "@/lib/redux/concepts/fields/component-examples/SmartForm";
import {FormMode} from "@/lib/redux/concepts/fields/types";


export const ArmaniSmartForm: React.FC<{
    primaryEntityKey: EntityKeys;
    primaryActiveRecordId: MatrxRecordId | 'new';
    foreignEntityKeys?: EntityKeys[];
    inverseEntityKeys?: EntityKeys[];
    manyToManyEntityKeys?: EntityKeys[];
    foreignActiveRecordIds?: Record<EntityKeys, MatrxRecordId>;
    formMode?: FormMode;
    onSubmitUpdate?: (entityKey: EntityKeys, recordId: MatrxRecordId, data: any) => void;
    onSubmitCreate?: (entityKey: EntityKeys, data: any) => void;
    onSubmitDelete?: (entityKey: EntityKeys, recordId: MatrxRecordId) => void;
}> = ({
          primaryEntityKey,
          primaryActiveRecordId,
          foreignEntityKeys,
          inverseEntityKeys,
          manyToManyEntityKeys,
          foreignActiveRecordIds,
          formMode = 'display',
          onSubmitUpdate,
          onSubmitCreate,
          onSubmitDelete
      }) => {
    const foreignKeys = foreignEntityKeys?.map(key => ({
        entityKey: key,
        recordId: foreignActiveRecordIds?.[key] || 'new'
    }));

    return (
        <SmartForm
            entityKey={primaryEntityKey}
            recordId={primaryActiveRecordId}
            mode={formMode}
            foreignKeys={foreignKeys}
            inverseKeys={inverseEntityKeys}
            manyToManyKeys={manyToManyEntityKeys}
        >
            {/* Primary entity fields */}
        </SmartForm>
    );
};

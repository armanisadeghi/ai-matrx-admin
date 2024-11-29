import { FieldIdentifier, FormMode } from "./types";
import { EntityKeys, AllEntityFieldKeys } from "@/types/entityTypes";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";

export const createFieldId = ({ entityKey, fieldName, recordId }: FieldIdentifier): string => {
    return `${entityKey}__${fieldName}__${recordId}`;
};

export const parseFieldId = (id: string): FieldIdentifier => {
    const [entityKey, fieldName, recordId] = id.split('__') as [EntityKeys, AllEntityFieldKeys, MatrxRecordId | 'new'];
    return { entityKey, fieldName, recordId };
};

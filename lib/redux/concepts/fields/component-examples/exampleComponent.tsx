// @ts-nocheck
// Example usage in your app:


import {EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import { SmartForm } from "./SmartForm";
import { SmartField } from "./SmartField";

const MyEntityForm: React.FC<{
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
}> = ({ entityKey, recordId }) => {
    const handleSubmit = async (values: any) => {
        // Handle form submission
        console.log('Form values:', values);
    };

    return (
        <SmartForm
            entityKey={entityKey}
            recordId={recordId}
            initialMode="create"
            onSubmit={handleSubmit}
        >
            <SmartField
                entityKey={entityKey}
                fieldName="name"
                recordId={recordId}
                initialValue=""
                mode="create"
            />
            <SmartField
                entityKey={entityKey}
                fieldName="description"
                recordId={recordId}
                initialValue=""
                mode="create"
            />
        </SmartForm>
    );
};

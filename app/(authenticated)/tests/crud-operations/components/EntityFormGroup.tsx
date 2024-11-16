import React from 'react';
import {Button} from '@/components/ui/button';
import {X, Save, Plus} from 'lucide-react';
import {DeleteRecordAction} from './helperComponents';
import {SimpleFormField} from './SimpleFormField';
import {useEntityForm} from "@/lib/redux/entity/hooks/useEntityForm";
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {LoadingState, MatrxRecordId} from '@/lib/redux/entity/types';
import NormalFormField from './NormalFormField';
import FormContent from "./NormalFormFieldTwo";
import ComponentBasedFieldView from "@/app/(authenticated)/tests/crud-operations/components/NormalFormFieldThree";

// Updated component props and types
export type FormMode = 'view' | 'edit' | 'create';

export interface UseEntityFormState<TEntity extends EntityKeys> {
    // State
    viewMode: FormMode;
    formData: Partial<EntityData<TEntity>>;
    validationErrors: Record<string, string>;
    loadingState: LoadingState
    lastOperation?: string;

    // Metadata
    entityDisplayName: string;
    fieldInfo: any[];
    activeRecord: EntityData<TEntity> | null;
    matrxRecordId: MatrxRecordId | null;
    defaultValues: Partial<EntityData<TEntity>>;

    // Actions
    handleNew: () => void;
    handleEdit: () => void;
    handleCancel: () => void;
    handleSave: () => Promise<void>;
    handleDelete: () => void;
    handleFieldChange: (fieldName: string, newValue: any) => Promise<void>;

    // Utilities
    isFieldReadOnly: (fieldName: string) => boolean;
    getFieldValue: (fieldName: string) => any;
    getDisplayValue: (record: EntityData<TEntity>) => string;

    // Feature flags
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

interface FormHeaderProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

const FormHeader = <TEntity extends EntityKeys>({form}: FormHeaderProps<TEntity>) => {
    return (
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
                {form.viewMode === 'create'
                 ? `New ${form.entityDisplayName}`
                 : form.activeRecord ? form.getDisplayValue(form.activeRecord) : ''}
            </h1>
            <div className="flex gap-2">
                {form.viewMode === 'view' && form.canCreate && (
                    <Button
                        onClick={form.handleNew}
                        size="sm"
                        variant="secondary"
                    >
                        <Plus className="h-4 w-4 mr-1"/>
                        New
                    </Button>
                )}
                {form.viewMode === 'view' && form.activeRecord && form.canEdit && (
                    <Button
                        onClick={form.handleEdit}
                        size="sm"
                    >
                        Edit
                    </Button>
                )}
                {form.viewMode === 'view' && form.activeRecord && form.canDelete && (
                    <DeleteRecordAction onDelete={form.handleDelete}/>
                )}
            </div>
        </div>
    );
};

interface FormContentProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

/*
const FormContentOne = <TEntity extends EntityKeys>({form}: FormContentProps<TEntity>) => {
    const renderField = React.useCallback((field) => (
        <NormalFormField
            key={field.name}
            field={field}
            value={form.getFieldValue(field.name)}
            isReadOnly={form.isFieldReadOnly(field.name)}
            onChange={(newValue) => form.handleFieldChange(field.name, newValue)}
            error={form.validationErrors[field.name]}
        />
    ), [form]);

    return (
        <div className="space-y-4">
            {form.fieldInfo.map(renderField)}
        </div>
    );
};
*/

interface FormActionsProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

const FormActions = <TEntity extends EntityKeys>({form}: FormActionsProps<TEntity>) => {
    if (form.viewMode === 'view') return null;

    return (
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={form.handleCancel}>
                <X className="h-4 w-4 mr-1"/>
                Cancel
            </Button>
            <Button onClick={form.handleSave}>
                <Save className="h-4 w-4 mr-1"/>
                {form.viewMode === 'create' ? 'Create' : 'Save'}
            </Button>
        </div>
    );
};

interface EntityFormGroupProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
}

export interface EntityFormGroupRefs {
    handleCreateNew: () => void;
}

// Updated EntityFormGroup
function EntityFormGroup<TEntity extends EntityKeys>(
    {
        entityKey,
        allowCreate = true,
        allowEdit = true,
        allowDelete = true,
    }: EntityFormGroupProps<TEntity>,
    ref: React.ForwardedRef<EntityFormGroupRefs>
) {
    const form = useEntityForm<TEntity>(entityKey, {
        allowCreate,
        allowEdit,
        allowDelete
    });

    React.useImperativeHandle(ref, () => ({
        handleCreateNew: () => {
            form.handleNew();
        }
    }));

    return (
        <div className="space-y-6">
            <FormHeader form={form}/>
            <div className="space-y-6">
                {/*<FormContent form={form}/>*/}
                <ComponentBasedFieldView entityKey={entityKey}/>
                <FormActions form={form}/>
            </div>
        </div>
    );
}

const ForwardedEntityFormGroup = React.forwardRef(EntityFormGroup);
export default ForwardedEntityFormGroup;

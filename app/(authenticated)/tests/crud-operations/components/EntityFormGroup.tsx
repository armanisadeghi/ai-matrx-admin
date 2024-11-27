import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Save, Plus, Edit } from 'lucide-react';
import { DeleteRecordAction } from './helperComponents';
import { useEntityForm, UseEntityFormState } from "@/lib/redux/entity/hooks/useEntityForm";
import { EntityKeys } from '@/types/entityTypes';
import ComponentBasedFieldView from './ComponentBasedFieldView';
import {Form, useToast} from '@/components/ui';

interface FormHeaderProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

export const FormHeader = <TEntity extends EntityKeys>({form}: FormHeaderProps<TEntity>) => {
    const isEditing = form.viewMode === 'edit';
    const isCreating = form.viewMode === 'create';

    return (
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
                {isCreating
                 ? `New ${form.entityDisplayName}`
                 : form.activeRecord ? form.getDisplayValue(form.activeRecord) : ''}
            </h1>
            <div className="flex gap-2">
                {!isCreating && !isEditing && form.canCreate && (
                    <Button
                        onClick={form.handleNew}
                        size="sm"
                        variant="secondary"
                    >
                        <Plus className="h-4 w-4 mr-1"/>
                        New
                    </Button>
                )}
                {!isCreating && form.activeRecord && form.canEdit && (
                    <Button
                        onClick={isEditing ? form.handleSave : form.handleEdit}
                        size="sm"
                        disabled={isEditing}
                    >
                        {isEditing ? (
                            <><Save className="h-4 w-4 mr-1"/>Save</>
                        ) : (
                             <><Edit className="h-4 w-4 mr-1"/>Edit</>
                         )}
                    </Button>
                )}
                {!isCreating && !isEditing && form.activeRecord && form.canDelete && (
                    <DeleteRecordAction onDelete={form.handleDelete}/>
                )}
                {(isEditing || isCreating) && (
                    <Button
                        variant="outline"
                        onClick={form.handleCancel}
                        size="sm"
                    >
                        <X className="h-4 w-4 mr-1"/>
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );
};

interface FormActionsProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

const FormActions = <TEntity extends EntityKeys>({form}: FormActionsProps<TEntity>) => {
    const isEditing = form.viewMode === 'edit';
    const isCreating = form.viewMode === 'create';

    if (!isEditing && !isCreating) return null;

    return (
        <div className="flex justify-end gap-2 sticky bottom-0 bg-background p-4 border-t">
            <Button
                variant="outline"
                onClick={form.handleCancel}
                type="button"
            >
                <X className="h-4 w-4 mr-1"/>
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={form.isSubmitting}
            >
                <Save className="h-4 w-4 mr-1"/>
                {isCreating ? 'Create' : 'Save'}
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

function EntityFormGroup<TEntity extends EntityKeys>(
    {
        entityKey,
        allowCreate = true,
        allowEdit = true,
        allowDelete = true,
    }: EntityFormGroupProps<TEntity>,
    ref: React.ForwardedRef<EntityFormGroupRefs>
) {
    const { toast } = useToast();
    const firstFieldRef = React.useRef<HTMLInputElement>(null);

    const form = useEntityForm<TEntity>(entityKey, {
        allowCreate,
        allowEdit,
        allowDelete,
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
        onSuccess: (message) => {
            toast({
                title: "Success",
                description: message,
    });
        }
    });

    // Focus first field when entering create mode
    React.useEffect(() => {
        if (form.viewMode === 'create' && firstFieldRef.current) {
            firstFieldRef.current.focus();
        }
    }, [form.viewMode]);

    React.useImperativeHandle(ref, () => ({
        handleCreateNew: () => {
            form.handleNew();
        }
    }));

    return (
        <div className="space-y-6">
            <FormHeader form={form}/>
            <div className="space-y-6">
                <Form {...form.form}>
                    <form onSubmit={form.form.handleSubmit(form.handleSave)} noValidate className="space-y-6">
                        <ComponentBasedFieldView
                            entityKey={entityKey}
                            form={form.form}
                            isReadOnly={form.viewMode === 'view'}
                            firstFieldRef={firstFieldRef}
                        />
                        <FormActions form={form}/>
                    </form>
                </Form>
            </div>
        </div>
    );
}

const ForwardedEntityFormGroup = React.forwardRef(EntityFormGroup);
export default ForwardedEntityFormGroup;

'use client';

import React, { useState, useMemo } from 'react';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import { EntityData, EntityKeys } from '@/types/entityTypes';
import { FormLoadingTwoColumn } from "@/components/matrx/LoadingComponents";
import ArmaniForm from "@/components/matrx/ArmaniForm/ArmaniForm";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import {UnifiedCrudHandlers, UnifiedLayoutProps } from "@/components/matrx/Entity";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";
import { useEntityCrud } from '@/lib/redux/entity/hooks/useEntityCrud';
import {useEntityToasts} from '@/lib/redux/entity/hooks/useEntityToasts';
import ArmaniFormSmart from '@/components/matrx/ArmaniForm/smart-form/ArmaniFormSmart';

export const SmartEntityContent: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity;
    const className = unifiedLayoutProps.className || "p-2";
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const { crud, activeRecordCrud } = useEntityCrud(entityKey);
    const toasts = useEntityToasts(entityKey);


    if (!entityKey) return null;

    const entity = useEntity(entityKey);
    const [formData, setFormData] = useState<EntityData<EntityKeys>>({});


    const crudHandlers: UnifiedCrudHandlers = useMemo(() => ({
        handleFieldUpdate: (fieldName: string, value: any) => {
            if (!activeRecordId) return;

            activeRecordCrud.updateField(fieldName, value);
        },

        handleFetchOne: (matrxRecordId: MatrxRecordId, options?: { showToast?: boolean }) => {
            entity.fetchOne(
                matrxRecordId,
                (result) => {
                    if (!result.success && options?.showToast) {
                        toasts.handleError(result.error, 'fetch', {showToast: true});
                    }
                }
            );
        },

        handleFetchOneWithFkIfk: (matrxRecordId: MatrxRecordId, options?: { showToast?: boolean }) => {
            entity.fetchOneWithFkIfk(
                matrxRecordId,
                (result) => {
                    if (!result.success && options?.showToast) {
                        toasts.handleError(result.error, 'fetch', {showToast: true});
                    }
                }
            );
        },

        handleUpdate: (options?: { showToast?: boolean }) => {
            if (!activeRecordId) return;

            entity.updateRecord(
                activeRecordId,
                (result) => {
                    if (result.success && options?.showToast) {
                        toasts.handleUpdateSuccess({showToast: true});
                    } else if (!result.success && options?.showToast) {
                        toasts.handleError(result.error, 'update', {showToast: true});
                    }
                }
            );
        },

        handleCreate: (tempRecordId: MatrxRecordId, options?: { showToast?: boolean }) => {
            entity.createRecord(
                tempRecordId,
                (result) => {
                    if (result.success && options?.showToast) {
                        toasts.handleCreateSuccess({showToast: true});
                    } else if (!result.success && options?.showToast) {
                        toasts.handleError(result.error, 'create', {showToast: true});
                    }
                }
            );
        },

        handleDelete: (options?: { showToast?: boolean }) => {
            if (!activeRecordId) return;

            entity.deleteRecord(
                activeRecordId,
                (result) => {
                    if (result.success && options?.showToast) {
                        toasts.handleDeleteSuccess({showToast: true});
                    } else if (!result.success && options?.showToast) {
                        toasts.handleError(result.error, 'delete', {showToast: true});
                    }
                }
            );
        }
    }), [entity, activeRecordId, toasts, activeRecordCrud]);



    if (!entity.entityMetadata) {
        return <FormLoadingTwoColumn/>;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    const completeUnifiedProps = {
        ...unifiedLayoutProps,
        activeRecordId,
        unifiedCrudHandlers: crudHandlers
    };

    return (
        <div className={className}>
            {unifiedLayoutProps.defaultFormComponent === 'ArmaniFormSmart' ? (
                <ArmaniFormSmart {...completeUnifiedProps} />
            ) : (
                 (entity.activeRecord || !entity.primaryKeyMetadata) && (
                     <ArmaniForm {...completeUnifiedProps} />
                 )
             )}
        </div>
    );
}

export default SmartEntityContent;

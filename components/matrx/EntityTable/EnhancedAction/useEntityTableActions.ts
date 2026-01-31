// hooks/useEntityTableActions.ts
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import {createCustomAction} from "@/components/matrx/EntityTable/EnhancedAction/createCustomAction";
import {standardActions} from "@/components/matrx/EntityTable/EnhancedAction/EntityMatrxActions";
import { useEntityActions } from '@/lib/redux/entity/hooks/coreHooks';


export function useEntityTableActions<TEntity extends EntityKeys>(
    entityKey: TEntity,
    options?: {
        onModalOpen?: (type: string, data: EntityData<TEntity>) => void;
        onSuccess?: (action: string, result: any) => void;
        onError?: (action: string, error: any) => void;
    }
) {
    const dispatch = useDispatch();
    const router = useRouter();
    const entityActions = useEntityActions(entityKey);

    // Create enhanced versions of standard actions
    const enhancedStandardActions = {
        view: createCustomAction({
            name: 'view',
            label: standardActions.view.label,
            icon: standardActions.view.icon,
            instructions: [
                {
                    type: 'sequence',
                    payload: [
                        {
                            type: 'dispatch',
                            payload: (context) => ({
                                type: `${entityKey}/setSelectedItem`,
                                payload: context.data
                            })
                        },
                        {
                            type: 'custom',
                            payload: (context) => {
                                options?.onModalOpen?.('view', context.data);
                            }
                        }
                    ]
                }
            ]
        }),

        edit: createCustomAction({
            name: 'edit',
            label: standardActions.edit.label,
            icon: standardActions.edit.icon,
            instructions: [
                {
                    type: 'sequence',
                    payload: [
                        {
                            type: 'dispatch',
                            payload: (context) => ({
                                type: `${entityKey}/setSelectedItem`,
                                payload: context.data
                            })
                        },
                        {
                            type: 'custom',
                            payload: (context) => {
                                options?.onModalOpen?.('edit', context.data);
                            }
                        }
                    ]
                }
            ]
        }),

        delete: createCustomAction({
            name: 'delete',
            label: standardActions.delete.label,
            icon: standardActions.delete.icon,
            instructions: [
                {
                    type: 'sequence',
                    payload: [
                        {
                            type: 'confirm',
                            payload: {
                                title: 'Confirm Delete',
                                message: 'Are you sure you want to delete this item?'
                            }
                        },
                        {
                            type: 'dispatch',
                            payload: (context) =>
                                entityActions.dispatch(entityActions.actions.deleteRecord({matrxRecordId: context.data.id}))
                        }
                    ]
                }
            ],
            options: {
                onSuccess: (result, context) => {
                    options?.onSuccess?.('delete', result);
                },
                onError: (error, context) => {
                    options?.onError?.('delete', error);
                }
            }
        })
    };

    // Handler that connects to both old and new systems
    const handleAction = useCallback((
        actionName: string,
        rowData: EntityData<TEntity>
    ) => {
        const action = enhancedStandardActions[actionName];
        if (action) {
            const context = {
                data: rowData,
                entityKey,
                dispatch,
                router,
                state: {
                    loading: false,
                    selected: false
                }
            };

            action.handler(context);
        }
    }, [entityKey, dispatch, router]);

    return {
        actions: enhancedStandardActions,
        handleAction
    };
}


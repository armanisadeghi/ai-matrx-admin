// components/FieldAction.tsx
import React from 'react';
import { useDispatch } from 'react-redux';
import { ActionButton } from './ActionButton';
import { useFieldActionContext } from '../hooks/useFieldActionContext';
import { ActionConfig, FieldConfig } from '../types';
import {generateUniqueId} from "@/components/matrx/Entity/field-actions/utils";
import { ActionContent } from '../contexts/ActionContent';
import { ActionContainerManager } from '../containers/BaseContainer';

export const FieldAction: React.FC<{
    action: ActionConfig;
    field: FieldConfig;
    value: any;
    onChange: (e: { target: { value: any } }) => void;
}> = ({ action, field, value, onChange }) => {
    const dispatch = useDispatch();
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { renderInSection } = useFieldActionContext();

    const handleAction = async () => {
        setError(null);
        setLoading(true);

        try {
            if (action.handleAction) {
                await action.handleAction(field, value);
            }

            setIsOpen(true);

            // If we have a target section, render there
            if (action.target?.location === 'section' && action.target.sectionId) {
                const contentId = generateUniqueId('content-');
                renderInSection(
                    action.target.sectionId,
                    <ActionContent
                        key={contentId}
                        component={action.component!}
                        props={{ field, value, onChange }}
                    />,
                    action.target
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (action.target?.clearOnClose) {
            // Clear the section if needed
        }
    };

    // Don't render if shouldShow returns false
    if (action.shouldShow && !action.shouldShow(field)) {
        return null;
    }

    return (
        <>
            <ActionButton
                action={action}
                onClick={handleAction}
                loading={loading}
                disabled={!!error}
            />

            {error && (
                <div className="text-sm text-destructive mt-1">
                    {error}
                </div>
            )}

            {isOpen && action.component && (
                <ActionContainerManager
                    presentation={action.presentation}
                    onClose={handleClose}
                    {...action.containerProps}
                >
                    <ActionContent
                        component={action.component}
                        props={{ field, value, onChange }}
                    />
                </ActionContainerManager>
            )}
        </>
    );
};


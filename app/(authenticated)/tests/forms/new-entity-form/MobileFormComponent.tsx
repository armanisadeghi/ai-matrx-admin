import React from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from "@/lib/redux/store";
import { submitForm } from "@/lib/redux/slices/formSlice";
import { FlexAnimatedForm } from "@/components/matrx/AnimatedForm";
import { EntityKeys } from "@/types/entityTypes";
import { useFormStateManager } from "@/app/(authenticated)/tests/forms/new-entity-form/useFormStateManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileFormComponentProps {
    entityKey: EntityKeys;
}

const MobileFormComponent: React.FC<MobileFormComponentProps> = ({ entityKey }) => {
    const dispatch = useDispatch<AppDispatch>();
    const formState = useAppSelector(state => state.form);

    const {
        formFields,
        handleUpdateField,
    } = useFormStateManager(entityKey);

    const handleSubmit = () => {
        dispatch(submitForm(formState));
    };

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <ScrollArea className="w-full">
                <FlexAnimatedForm
                    fields={formFields}
                    formState={formState}
                    onUpdateField={handleUpdateField}
                    onSubmit={handleSubmit}
                    isSinglePage={true}
                    layout="grid"
                    direction="column"
                    columns={1}
                    enableSearch={false}
                    className="space-y-2"
                />
            </ScrollArea>

            <div className="flex-shrink-0 p-4 bg-background border-t border-border">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium
                             hover:bg-primary/90 transition-colors active:bg-primaryActive
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export default MobileFormComponent;

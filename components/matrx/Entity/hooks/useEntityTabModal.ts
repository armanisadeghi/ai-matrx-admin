import {useState, useEffect, useCallback} from 'react';
import {EntityModalFormState, EntityTabModalProps} from "@/components/matrx/Entity/types/entityForm";

export const useEntityTabModal = (
    {
        isOpen: externalIsOpen,
        onClose: externalOnClose,
        onSubmit: externalOnSubmit,
        formState: externalFormState = {},
        onUpdateField: externalOnUpdateField,
        tabs,
        activeTab: externalActiveTab,
        onTabChange: externalOnTabChange,
    }: Partial<EntityTabModalProps>) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [internalFormState, setInternalFormState] = useState<EntityModalFormState>(externalFormState);
    const [internalActiveTab, setInternalActiveTab] = useState(tabs ? tabs[0].value : '');

    const isControlled = externalIsOpen !== undefined;
    const isOpen = isControlled ? externalIsOpen : internalIsOpen;
    const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

    useEffect(() => {
        if (isControlled) {
            setInternalIsOpen(externalIsOpen);
        }
    }, [externalIsOpen, isControlled]);

    useEffect(() => {
        setInternalFormState(externalFormState);
    }, [externalFormState]);

    const openModal = useCallback(() => setInternalIsOpen(true), []);
    const closeModal = useCallback(() => {
        if (isControlled && externalOnClose) {
            externalOnClose();
        } else {
            setInternalIsOpen(false);
        }
    }, [isControlled, externalOnClose]);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, closeModal]);

    const handleSubmit = useCallback(() => {
        if (externalOnSubmit) {
            if (typeof externalOnSubmit === 'function') {
                if (externalOnSubmit.length > 0) {
                    (externalOnSubmit as (formData: EntityModalFormState) => void)(internalFormState);
                } else {
                    (externalOnSubmit as () => void)();
                }
            }
        }
        closeModal();
    }, [externalOnSubmit, internalFormState, closeModal]);

    const handleUpdateField = useCallback((name: string, value: any) => {
        const newState = {...internalFormState, [name]: value};
        setInternalFormState(newState);
        if (externalOnUpdateField) {
            externalOnUpdateField(name, value);
        }
    }, [internalFormState, externalOnUpdateField]);

    const handleTabChange = useCallback((tab: string) => {
        if (externalOnTabChange) {
            externalOnTabChange(tab);
        } else {
            setInternalActiveTab(tab);
        }
    }, [externalOnTabChange]);

    return {
        isOpen,
        activeTab,
        internalFormState,
        openModal,
        closeModal,
        handleSubmit,
        handleUpdateField,
        handleTabChange,
    };
};

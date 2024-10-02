// components/matrx/AnimatedForm/AnimatedTabModal.tsx

'use client';

import React, {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/styles/themes/utils';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import AnimatedForm from './FormComponent';
import {AnimatedTabModalProps, FormState, TabButton, TabData} from './types';
import AnimatedButton from './AnimatedButton';

const AnimatedTabModal: React.FC<AnimatedTabModalProps & { className?: string }> = (
    {
        isOpen: externalIsOpen,
        onClose: externalOnClose,
        onSubmit: externalOnSubmit,
        triggerButton,
        fields = [],
        formState: externalFormState = {},
        onUpdateField: externalOnUpdateField,
        currentStep = 0,
        onNextStep = () => {
        },
        onPrevStep = () => {
        },
        isSinglePage = false,
        title,
        description,
        tabs,
        footer,
        className,
        activeTab: externalActiveTab,
        onTabChange: externalOnTabChange,
        ...props
    }) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [internalFormState, setInternalFormState] = useState<FormState>(externalFormState);
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

    const openModal = () => setInternalIsOpen(true);
    const closeModal = () => {
        if (isControlled && externalOnClose) {
            externalOnClose();
        } else {
            setInternalIsOpen(false);
        }
    };

    const handleSubmit = () => {
        if (externalOnSubmit) {
            if (typeof externalOnSubmit === 'function') {
                if (externalOnSubmit.length > 0) {
                    (externalOnSubmit as (formData: FormState) => void)(internalFormState);
                } else {
                    (externalOnSubmit as () => void)();
                }
            }
        }
        closeModal();
    };

    const handleUpdateField = (name: string, value: any) => {
        const newState = {...internalFormState, [name]: value};
        setInternalFormState(newState);
        if (externalOnUpdateField) {
            externalOnUpdateField(name, value);
        }
    };

    const handleTabChange = (tab: string) => {
        if (externalOnTabChange) {
            externalOnTabChange(tab);
        } else {
            setInternalActiveTab(tab);
        }
    };

    const renderForm = (fieldsToRender: AnimatedTabModalProps['fields'] = []) => (
        <AnimatedForm
            fields={fieldsToRender}
            formState={internalFormState}
            onUpdateField={handleUpdateField}
            onSubmit={handleSubmit}
            currentStep={currentStep}
            onNextStep={onNextStep}
            onPrevStep={onPrevStep}
            isSinglePage={isSinglePage}
        />
    );

    const renderTabButtons = (buttons?: TabButton[]) => {
        if (!buttons) return null;
        return (
            <div className="flex justify-end space-x-2 mt-4">
                {buttons.map((button, index) => (
                    <AnimatedButton
                        key={index}
                        onClick={button.onClick}
                        className={button.className}
                    >
                        {button.label}
                    </AnimatedButton>
                ))}
            </div>
        );
    };

    return (
        <>
            {triggerButton && React.cloneElement(triggerButton as React.ReactElement, {onClick: openModal})}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className={cn("fixed inset-0 z-50 flex items-center justify-center", className)}
                    >
                        <motion.div
                            initial={{opacity: 0, scale: 0.8}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.8}}
                    className={cn(
                        "bg-background p-6 rounded-lg shadow-xl max-w-md w-full relative z-10 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary",
                        className
                    )} // Added overflow-y-auto and scrollbar styling for scrolling
                    style={{ maxHeight: "90vh" }} // Ensures modal doesn't exceed 90% of viewport height
                            {...props}
                        >
                            <button
                                onClick={closeModal}
                                className="absolute top-2 right-2 text-foreground hover:text-primary"
                            >
                                &times;
                            </button>

                            {(title || description) && (
                                <div className="mb-4">
                                    {title && <h2 className="text-lg font-semibold">{title}</h2>}
                                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                                </div>
                            )}

                            {tabs ? (
                                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                                        {tabs.map((tab) => (
                                            <TabsTrigger key={tab.value} value={tab.value}>
                                                {tab.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {tabs.map((tab) => (
                                        <TabsContent key={tab.value} value={tab.value}>
                                            {renderForm(tab.fields)}
                                            {renderTabButtons(tab.buttons)}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            ) : (
                                renderForm(fields)
                            )}

                            {footer && <div className="mt-4">{footer}</div>}
                        </motion.div>
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AnimatedTabModal;

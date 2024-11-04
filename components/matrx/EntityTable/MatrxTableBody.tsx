'use client';

import React, {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {TableBody} from "@/components/ui/table";
import {AnimatedTabModal} from "@/components/matrx/AnimatedForm";
import {generateStandardTabData} from "@/components/matrx/EntityTable/utils";
import MatrxTableCell from "@/components/matrx/EntityTable/EnhancedCell/MatrxTableCell";
import {FormState, TabData} from "@/types/AnimatedFormTypes";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    Table as TanStackTable,
    Row as TanStackRow,
    Cell as TanStackCell,
} from '@tanstack/react-table';
import {EntityCommandName, EntityCommandContext} from "@/components/matrx/MatrxCommands/EntityCommand";


export interface MatrxTableBodyProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    page: TanStackRow<EntityData<TEntity>>[];
    prepareRow: (row: TanStackRow<EntityData<TEntity>>) => void;
    truncateAt?: number;

    commands?: {
        [key in EntityCommandName]?: boolean | {
        useCallback?: boolean;
        setActiveOnClick?: boolean;
        hidden?: boolean;
    };
    };

    onCommandExecute?: (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => Promise<void> | void;

    onModalOpen?: (
        actionName: EntityCommandName,
        data: EntityData<TEntity>
    ) => void;
    onModalClose?: () => void;

    onRowSelect?: (data: EntityData<TEntity>) => void;

    onFormStateChange?: (state: FormState) => void;

    onTabChange?: (tab: string) => void;

    customModalContent?: (rowData: EntityData<TEntity>) => React.ReactNode;
    CustomModal?: React.ComponentType<any>;

    useParentModal?: boolean;
    useParentRowHandling?: boolean;
    useParentFormState?: boolean;

    visibleColumns?: string[];
}

const MatrxTableBody = <TEntity extends EntityKeys>(
    {
        entityKey,
        page,
        prepareRow,
        commands = {
            view: true,
            edit: {useCallback: true},
            delete: {useCallback: true},
            expand: true
        },
        onCommandExecute,
        onModalOpen,
        onModalClose,
        onRowSelect,
        onFormStateChange,
        onTabChange,
        customModalContent,
        CustomModal,
        useParentModal = false,
        useParentRowHandling = false,
        useParentFormState = false,
        truncateAt = 100,
        visibleColumns
    }: MatrxTableBodyProps<TEntity>) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("view");
    const [selectedRow, setSelectedRow] = useState<EntityData<TEntity> | null>(null);
    const [formState, setFormState] = useState<FormState>({});

    const handleModalOpen = (actionName: EntityCommandName, data: EntityData<TEntity>) => {
        if (onModalOpen) {
            onModalOpen(actionName, data);
        } else if (!useParentModal) {
            setIsModalOpen(true);
        }
    };

    const handleModalClose = () => {
        if (onModalClose) {
            onModalClose();
        } else if (!useParentModal) {
            setIsModalOpen(false);
        }
    };

    const handleRowSelect = (data: EntityData<TEntity>) => {
        if (onRowSelect) {
            onRowSelect(data);
        } else if (!useParentRowHandling) {
            setSelectedRow(data);
        }
    };

    const handleFormStateChange = (newState: FormState) => {
        if (onFormStateChange) {
            onFormStateChange(newState);
        } else if (!useParentFormState) {
            setFormState(newState);
        }
    };

    const handleTabChange = (tab: string) => {
        if (onTabChange) {
            onTabChange(tab);
        } else {
            setActiveTab(tab);
        }
    };

    // Command execution with parent override capability
    const handleCommandExecute = async (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => {
        // Always allow parent to handle first if they want to
        if (onCommandExecute) {
            await onCommandExecute(actionName, context);
            return;
        }

        const rowData = context.data;
        handleRowSelect(rowData);
        handleFormStateChange(rowData as FormState);

        switch (actionName) {
            case 'view':
            case 'edit':
            case 'delete':
                handleTabChange(actionName);
                handleModalOpen(actionName, rowData);
                break;
        }
    };

    const handleUpdateField = (name: string, value: any) => {
        const newState = {...formState, [name]: value};
        handleFormStateChange(newState);
    };

    const tabs: TabData[] = generateStandardTabData(
        selectedRow,
        handleTabChange,
        handleModalClose,
        formState,
        (actionName, data) => {
            if (selectedRow) {
                renderModal();
            }
            /*
                        if (selectedRow) {
                            const context: EntityCommandContext<TEntity> = {
                                type: 'entity',
                                scope: 'single',
                                entityKey,
                                data: selectedRow,
                                index: page.findIndex(row => row.original === selectedRow),
                                dispatch: () => {
                                }, // Provide actual dispatch
                                selectors: {} as any // Provide actual selectors
                            };
                            handleCommandExecute(actionName as EntityCommandName, context);
                        }
            */
        }
    );

    const renderModal = () => {
        if (useParentModal || !selectedRow) return null;

        if (CustomModal) {
            return (
                <CustomModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    data={selectedRow}
                    activeTab={activeTab}
                    formState={formState}
                />
            );
        }

        return (
            <AnimatedTabModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={() => {
                }}
                onUpdateField={handleUpdateField}
                formState={formState}
                title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item`}
                description={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} item details`}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isSinglePage={true}
            >
                {customModalContent ? customModalContent(selectedRow) : null}
            </AnimatedTabModal>
        );
    };

    return (
        <>
            <TableBody>
                <AnimatePresence>
                    {page.map((row, i) => (
                        <motion.tr
                            key={row.id}
                            initial={{opacity: 0, y: -10}}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 20,
                                    delay: i * 0.05,
                                },
                            }}
                            exit={{opacity: 0, y: 10}}
                            whileHover={{
                                y: -10,
                                transition: {duration: 0.2},
                            }}
                            className="bg-card hover:bg-accent/50 cursor-pointer scrollbar-hide"
                            onClick={() => renderModal()}

                            // onClick={() => handleCommandExecute('view', {
                            //     type: 'entity',
                            //     scope: 'single',
                            //     entityKey,
                            //     data: row.original,
                            //     index: i,
                            //     dispatch: () => {},
                            //     selectors: {} as any
                            // })}
                        >
                            {row.getVisibleCells().map((cell, cellIndex) => (
                                <MatrxTableCell
                                    key={cell.id}
                                    cell={cell}
                                    entityKey={entityKey}
                                    index={i}
                                    rowData={row.original}
                                    commands={commands}
                                    onCommandExecute={handleCommandExecute}
                                    truncateAt={truncateAt}
                                />
                            ))}
                        </motion.tr>
                    ))}
                </AnimatePresence>
            </TableBody>
            {renderModal()}
        </>
    );
};

export default MatrxTableBody;

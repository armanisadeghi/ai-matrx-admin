// app/(authenticated)/tests/matrx-table/components/MatrxTableBody.tsx
'use client';

import React, {useState, useMemo} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {TableBody} from "@/components/ui/table";
import {useTable} from "react-table";
import {AnimatedTabModal, TabData, FormState} from "@/components/matrx/AnimatedForm";
import {TableData} from "./table.types";
import {generateStandardTabData} from "./StandardTabUtil";
import MatrxTableCell from "./MatrxTableCell";


interface MatrxTableBodyProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    visibleColumns?: string[];
    truncateAt?: number;
    customModalContent?: (rowData: TableData) => React.ReactNode;
    getTableBodyProps?: () => any;
}


const MatrxTableBody: React.FC<MatrxTableBodyProps> = (
    {
        data,
        actions = ['edit', 'delete', 'view', 'expand'],
        onAction,
        visibleColumns,
        truncateAt = 100,
        customModalContent,
    }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("view");
    const [selectedRow, setSelectedRow] = useState<TableData | null>(null);
    const [formState, setFormState] = useState<FormState>({});

    const getRowId = (row: TableData, index: number) => row.id || `row-${index}`;

    const createColumns = useMemo(() => {
        if (data.length === 0) return [];
        const dataColumns = Object.keys(data[0]).map(key => ({
            Header: key.charAt(0).toUpperCase() + key.slice(1),
            // accessor: key,
        }));
        return [
            ...dataColumns,
            {
                // id: 'actions',
                Header: 'Actions',
                Cell: () => null // We'll render this separately
            }
        ];
    }, [data]);

    const columns = visibleColumns
        ? createColumns.filter(col => visibleColumns.includes(col.Header))
        : createColumns;

    const {
        getTableBodyProps,
        rows,
        prepareRow,
    } = useTable({
        columns,
        data,
        getRowId,
    });

    const handleAction = (actionName: string, rowData: TableData) => {
        setSelectedRow(rowData);
        setFormState(rowData);
        if (actionName === 'view' || actionName === 'edit') {
            setActiveTab(actionName);
            setIsModalOpen(true);
        } else if (actionName === 'delete') {
            setActiveTab('delete');
            setIsModalOpen(true);
        } else if (onAction) {
            onAction(actionName, rowData);
        }
    };

    const handleUpdateField = (name: string, value: any) => {
        setFormState(prev => ({...prev, [name]: value}));
    };

    // Refactored to use the function to generate tabs
    const tabs: TabData[] = generateStandardTabData(selectedRow, setActiveTab, setIsModalOpen, formState, onAction);

    return (
        <>
            <TableBody {...getTableBodyProps()}>
                <AnimatePresence>
                    {rows.map((row, i) => {
                        prepareRow(row);
                        return (
                            <motion.tr
                                key={row.id}
                                {...row.getRowProps()}
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
                                    scale: 1.02,
                                    transition: {duration: 0.2},
                                }}
                                className="bg-card hover:bg-accent/50 cursor-pointer"
                                onClick={() => handleAction('view', row.original)}
                            >
                                {row.cells.map((cell) => (
                                    <MatrxTableCell
                                        key={cell.getCellProps().key}
                                        cell={cell}
                                        actions={actions}
                                        rowData={row.original}
                                        onAction={handleAction}
                                        truncateAt={truncateAt}
                                    />
                                ))}
                            </motion.tr>
                        );
                    })}
                </AnimatePresence>
            </TableBody>
            {selectedRow && (
                <AnimatedTabModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={() => {}}
                    onUpdateField={handleUpdateField}
                    formState={formState}
                    title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item`}
                    description={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} item details`}
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isSinglePage={true}
                >
                    {customModalContent ? customModalContent(selectedRow) : null}
                </AnimatedTabModal>
            )}
        </>
    );
};

export default MatrxTableBody;

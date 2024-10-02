// app/(authenticated)/tests/matrx-table/components/MatrxTableBody.tsx

import React, {useState, useMemo} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {TableBody, TableCell} from "@/components/ui/table";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {Cell, Row, useTable} from "react-table";
import {Edit, Eye, Maximize2, Trash} from "lucide-react";
import {AnimatedTabModal, FormField, TabData, FormFieldType, FormState} from "@/components/matrx/AnimatedForm";

type TableData = Record<string, any>;

interface ActionDefinition {
    name: string;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

const actionDefinitions: Record<string, ActionDefinition> = {
    edit: {
        name: 'edit',
        label: "Edit this item",
        icon: <Edit className="h-3 w-3"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },
    delete: {
        name: 'delete',
        label: "Delete this item",
        icon: <Trash className="h-4 w-4"/>,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
    },
    view: {
        name: 'view',
        label: "View this item",
        icon: <Eye className="h-4 w-4"/>,
        className: "text-primary hover:bg-secondary hover:text-secondary-foreground",
    },
    expand: {
        name: 'expand',
        label: "Expand view",
        icon: <Maximize2 className="h-4 w-4"/>,
        className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",
    },
};

interface CustomTableBodyProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    visibleColumns?: string[];
    truncateAt?: number;
    customModalContent?: (rowData: TableData) => React.ReactNode;
}

const truncateText = (text: unknown, maxLength: number = 100): string => {
    if (typeof text !== 'string') {
        return String(text);
    }
    if (maxLength === 0 || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

const TableActionIcon: React.FC<{
    actionName: string;
    data: TableData;
    onAction: (actionName: string, data: TableData) => void;
}> = ({actionName, data, onAction}) => {
    const action = actionDefinitions[actionName];
    if (!action) return null;

    const {name, label, icon, className} = action;

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    onAction(name, data);
                }}
                size="xs"
                variant="ghost"
                className={`p-1 ${className || "transition-all duration-300 hover:scale-105"}`}
            >
                {React.cloneElement(icon as React.ReactElement, {className: 'w-3 h-3'})}
            </Button>
        </MatrxTooltip>
    );
};

const CustomTableCell: React.FC<{
    cell: Cell<TableData>;
    actions: string[];
    rowData: TableData;
    onAction: (actionName: string, rowData: TableData) => void;
    truncateAt: number;
}> = ({cell, actions, rowData, onAction, truncateAt}) => {
    if (cell.column.id === 'actions') {
        return (
            <TableCell className="text-card-foreground">
                <div className="flex items-center space-x-1">
                    {actions.map((actionName, index) => (
                        <TableActionIcon
                            key={index}
                            actionName={actionName}
                            data={rowData}
                            onAction={onAction}
                        />
                    ))}
                </div>
            </TableCell>
        );
    }

    const cellContent = truncateText(cell.value, truncateAt);

    return (
        <TableCell {...cell.getCellProps()} className="text-card-foreground">
            <MatrxTooltip content={cell.value} placement="top">
                <motion.div
                    initial={false}
                    animate={{
                        scale: 1,
                        transition: {type: "spring", stiffness: 300, damping: 10},
                    }}
                >
                    {cellContent}
                </motion.div>
            </MatrxTooltip>
        </TableCell>
    );
};

const CustomTableBody: React.FC<CustomTableBodyProps> = (
    {
        data,
        actions = ['edit', 'delete', 'view', 'expand'],
        onAction,
        visibleColumns,
        truncateAt = 100,
        customModalContent
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
            accessor: key,
        }));
        return [
            ...dataColumns,
            {
                id: 'actions',
                Header: 'Actions',
                Cell: () => null // We'll render this separately
            }
        ];
    }, [data]);

    const columns = visibleColumns
        ? createColumns.filter(col => visibleColumns.includes(col.accessor as string) || col.id === 'actions')
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

    const generateFormFields = (rowData: TableData): FormField[] => {
        return Object.entries(rowData).map(([key, value]): FormField => {
            let type: FormFieldType = 'text';
            if (typeof value === 'number') type = 'number';
            if (typeof value === 'boolean') type = 'checkbox';
            if (typeof value === 'string' && value.length > 100) type = 'textarea';
            if (key.toLowerCase().includes('email')) type = 'email';
            if (key.toLowerCase().includes('password')) type = 'password';
            if (key.toLowerCase().includes('date')) type = 'date';
            if (key.toLowerCase().includes('time')) type = 'time';
            if (key.toLowerCase().includes('color')) type = 'color';
            if (key.toLowerCase().includes('url')) type = 'url';
            if (key.toLowerCase().includes('tel')) type = 'tel';

            return {
                name: key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                type,
                required: false,
                disabled: false,
            };
        });
    };

    const handleUpdateField = (name: string, value: any) => {
        setFormState(prev => ({...prev, [name]: value}));
    };

    const tabs: TabData[] = selectedRow ? [
        {
            value: "view",
            label: "View",
            fields: generateFormFields(selectedRow).map(field => ({...field, disabled: true})),
            buttons: [
                {label: 'Edit', onClick: () => setActiveTab('edit'), className: 'bg-primary text-primary-foreground'},
            ]
        },
        {
            value: "edit",
            label: "Edit",
            fields: generateFormFields(selectedRow),
            buttons: [
                {
                    label: 'Cancel',
                    onClick: () => setActiveTab('view'),
                    className: 'bg-secondary text-secondary-foreground'
                },
                {
                    label: 'Save', onClick: () => {
                        if (onAction) onAction('save', formState);
                        setIsModalOpen(false);
                    }, className: 'bg-primary text-primary-foreground'
                },
            ]
        },
        {
            value: "delete",
            label: "Delete",
            fields: generateFormFields(selectedRow).map(field => ({...field, disabled: true})),
            buttons: [
                {
                    label: 'Confirm Delete', onClick: () => {
                        if (onAction) onAction('delete', selectedRow);
                        setIsModalOpen(false);
                    }, className: 'bg-destructive text-destructive-foreground'
                },
            ]
        }
    ] : [];

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
                                    <CustomTableCell
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
                    onSubmit={() => {
                    }}
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

export default CustomTableBody;

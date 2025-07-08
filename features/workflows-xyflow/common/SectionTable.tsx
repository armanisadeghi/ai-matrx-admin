import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SectionContainer } from "./SectionContainer";

export interface TableRowData {
    key: string;
    label: string;
    content: React.ReactNode;
}

export interface SectionTableProps {
    title: string;
    headers?: string[];
    rows?: TableRowData[];
    data?: any[];
    renderRow?: (item: any, index: number) => React.ReactNode;
    emptyMessage?: string;
    alternatingRows?: boolean;
}

export const SectionTable: React.FC<SectionTableProps> = ({
    title,
    headers,
    rows,
    data,
    renderRow,
    emptyMessage = "No data available",
    alternatingRows = true,
}) => {
    const hasData = (rows && rows.length > 0) || (data && data.length > 0);

    return (
        <SectionContainer title={title}>
            {hasData ? (
                <Table>
                    {headers && (
                        <TableHeader>
                            <TableRow className="bg-muted/20 dark:bg-muted/20">
                                {headers.map((header, index) => (
                                    <TableHead 
                                        key={index} 
                                        className={`font-semibold text-center border-r border-border dark:border-border ${index === 0 ? 'w-64' : ''}`}
                                    >
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                    )}
                    <TableBody>
                        {rows && rows.map((row, index) => (
                            <TableRow
                                key={row.key}
                                className={alternatingRows && index % 2 === 1 ? "bg-muted/30 dark:bg-muted/30" : "bg-background dark:bg-background"}
                            >
                                <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                                    {row.label}
                                </TableCell>
                                <TableCell>
                                    {row.content}
                                </TableCell>
                            </TableRow>
                        ))}
                        {data && renderRow && data.map((item, index) => (
                            <TableRow
                                key={index}
                                className={alternatingRows && index % 2 === 1 ? "bg-muted/30 dark:bg-muted/30" : "bg-background dark:bg-background"}
                            >
                                {renderRow(item, index)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="p-4 bg-muted/30 dark:bg-muted/30">
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">{emptyMessage}</p>
                </div>
            )}
        </SectionContainer>
    );
};

export default SectionTable;
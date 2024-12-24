// components/FileManager/FilePreview/SpreadsheetPreview.tsx
import React, { useState, useEffect } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Loader2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import * as XLSX from 'xlsx';

interface SpreadsheetPreviewProps {
    file: NodeStructure;
}

export const SpreadsheetPreview: React.FC<SpreadsheetPreviewProps> = ({ file }) => {
    const { downloadFile, currentBucket } = useFileSystem();
    const [rowData, setRowData] = useState<any[]>([]);
    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                const blob = await downloadFile(currentBucket!, file.path);
                if (blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer);
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length > 0) {
                        const columns = Object.keys(jsonData[0]).map(key => ({
                            field: key,
                            sortable: true,
                            filter: true,
                            resizable: true,
                        }));
                        setColumnDefs(columns);
                        setRowData(jsonData);
                    }
                }
            } catch (error) {
                console.error('Error loading spreadsheet content:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadContent();
    }, [file.path]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full ag-theme-alpine-dark">
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{
                    flex: 1,
                    minWidth: 100,
                    sortable: true,
                    filter: true,
                }}
                pagination={true}
                paginationAutoPageSize={true}
            />
        </div>
    );
};


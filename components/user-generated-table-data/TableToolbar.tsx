'use client'

import AddColumnModal from './AddColumnModal';
import AddRowModal from './AddRowModal';
import EditRowModal from './EditRowModal';
import DeleteRowModal from './DeleteRowModal';
import TableSettingsModal from './TableSettingsModal';
import ExportTableModal from './ExportTableModal';
import TableReferenceOverlay from './TableReferenceOverlay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Download, Pencil, Trash, Settings, Plus, Link } from 'lucide-react';

interface TableToolbarProps {
  tableId: string;
  tableInfo: any;
  fields: any[];
  loadTableData: (forceReload?: boolean) => void;
  selectedRowId: string | null;
  selectedRowData: Record<string, any> | null;
  
  // Search props
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  clearSearch: () => void;
  
  // Modal visibility state
  showEditModal: boolean;
  showDeleteModal: boolean;
  showAddColumnModal: boolean;
  showAddRowModal: boolean;
  showExportModal: boolean;
  showTableSettingsModal: boolean;
  showReferenceOverlay: boolean;
  
  // Modal visibility state setters
  setShowEditModal: (show: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
  setShowAddColumnModal: (show: boolean) => void;
  setShowAddRowModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowTableSettingsModal: (show: boolean) => void;
  setShowReferenceOverlay: (show: boolean) => void;
  
  // Success callbacks
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export default function TableToolbar({ 
  tableId,
  tableInfo,
  fields,
  loadTableData,
  selectedRowId,
  selectedRowData,
  
  // Search props
  searchTerm,
  setSearchTerm,
  handleSearch,
  clearSearch,
  
  // Modal visibility state
  showEditModal,
  showDeleteModal,
  showAddColumnModal,
  showAddRowModal,
  showExportModal,
  showTableSettingsModal,
  showReferenceOverlay,
  
  // Modal visibility state setters
  setShowEditModal,
  setShowDeleteModal,
  setShowAddColumnModal,
  setShowAddRowModal,
  setShowExportModal,
  setShowTableSettingsModal,
  setShowReferenceOverlay,
  
  // Success callbacks
  onEditSuccess = () => loadTableData(),
  onDeleteSuccess = () => loadTableData()
}: TableToolbarProps) {
  return (
    <>
      {/* Toolbar UI */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center w-full md:w-auto space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowAddColumnModal(true)}
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Column</span>
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowAddRowModal(true)}
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Row</span>
          </Button>
        </div>
        
        <div className="flex-1 w-full max-w-full md:max-w-md">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pr-8"
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button size="sm" type="submit" className="pb-1 h-9 whitespace-nowrap">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
        
        <div className="flex items-center w-full md:w-auto justify-end space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowReferenceOverlay(true)}
            className="whitespace-nowrap"
            title="Create Table Reference"
          >
            <Link className="h-4 w-4 md:mr-2" />
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="whitespace-nowrap"
          >
            <Download className="h-4 w-4 md:mr-2" />
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowTableSettingsModal(true)}
            className="whitespace-nowrap"
          >
            <Settings className="h-4 w-4 md:mr-2" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <AddColumnModal
        tableId={tableId}
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onSuccess={() => loadTableData(true)}
      />
      <AddRowModal
        tableId={tableId}
        isOpen={showAddRowModal}
        onClose={() => setShowAddRowModal(false)}
        onSuccess={() => loadTableData()}
      />
      <EditRowModal
        tableId={tableId}
        rowId={selectedRowId}
        rowData={selectedRowData}
        fields={fields}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onEditSuccess}
      />
      <DeleteRowModal
        rowId={selectedRowId}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={onDeleteSuccess}
      />
      <TableSettingsModal
        tableId={tableId}
        isOpen={showTableSettingsModal}
        onClose={() => setShowTableSettingsModal(false)}
        onSuccess={() => loadTableData()}
      />
      <ExportTableModal
        tableId={tableId}
        tableName={tableInfo?.table_name || 'table'}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <TableReferenceOverlay
        isOpen={showReferenceOverlay}
        onClose={() => setShowReferenceOverlay(false)}
        tableId={tableId}
        tableInfo={tableInfo}
        fields={fields}
      />
    </>
  );
}

'use client'
import TableCards from "@/components/user-generated-table-data/TableCards";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import CreateTableModal from "@/components/user-generated-table-data/CreateTableModal";
import { FcTemplate } from "react-icons/fc";

export default function UserGeneratedDataPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle the create from template button click
  const handleCreateFromTemplate = () => {
    console.log("Create from template clicked");
  };

  // Handle successful table creation
  const handleTableCreated = (tableId: string) => {
    router.push(`/data/${tableId}`);
  };

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-4 rounded-lg space-y-4 scrollbar-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Data Tables</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage your data tables</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleCreateFromTemplate}
            className="flex items-center bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
          >
            <FcTemplate className="h-4 w-4 mr-2" />
            Create From Template
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Table
          </Button>
        </div>
      </div>
      
      <TableCards />

      {/* Create Table Modal */}
      <CreateTableModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTableCreated}
      />
    </div>
  );
}
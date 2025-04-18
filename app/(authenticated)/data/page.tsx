'use client'
import TableCards from "@/components/user-generated-table-data/TableCards";
import { useRouter } from 'next/navigation';

export default function UserGeneratedDataPage() {
  const router = useRouter();

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-4 rounded-lg space-y-4 scrollbar-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Data Tables</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage your data tables</p>
        </div>
      </div>
      
      <TableCards />
    </div>
  );
}
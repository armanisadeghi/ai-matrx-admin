'use client';

import { ReactNode } from 'react';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { useAppSelector } from '@/lib/redux';
import { selectAppName } from '@/lib/redux/app-builder/selectors/appSelectors';

export default function AppEditLayout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: { id: string }
}) {
  const appName = useAppSelector((state) => selectAppName(state, params.id)) || 'App';
  
  return (
    <StructuredSectionCard
      title={`Edit App: ${appName}`}
      description="Configure your app settings and components."
      className="w-full my-4"
    >
      <div className="px-1 py-2">
        {children}
      </div>
    </StructuredSectionCard>
  );
} 
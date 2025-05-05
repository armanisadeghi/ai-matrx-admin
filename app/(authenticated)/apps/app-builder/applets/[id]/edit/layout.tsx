'use client';

import React, { ReactNode } from 'react';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { useAppSelector } from '@/lib/redux';
import { selectAppletName } from '@/lib/redux/app-builder/selectors/appletSelectors';

export default function AppletEditLayout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: Promise<{ id: string }>
}) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  
  const appletName = useAppSelector((state) => selectAppletName(state, id)) || 'Applet';
  
  return (
    <StructuredSectionCard
      title={`Edit Applet: ${appletName}`}
      description="Configure your applet component for reuse throughout your applications."
      className="w-full my-4"
    >
      <div className="px-1 py-2">
        {children}
      </div>
    </StructuredSectionCard>
  );
} 
'use client';

import { ReactNode } from 'react';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { useAppSelector } from '@/lib/redux';
import { selectAppletName } from '@/lib/redux/app-builder/selectors/appletSelectors';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AppletViewLayout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: { id: string }
}) {
  const router = useRouter();
  const appletName = useAppSelector((state) => selectAppletName(state, params.id)) || 'Applet';
  
  const handleEdit = () => {
    router.push(`/apps/app-builder/applets/${params.id}/edit`);
  };
  
  return (
    <StructuredSectionCard
      title={`${appletName}`}
      description="Applet component details"
      className="w-full my-4"
      headerActions={[
        <Button 
          key="edit"
          size="sm"
          onClick={handleEdit}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit Applet
        </Button>
      ]}
    >
      <div className="px-1 py-2">
        {children}
      </div>
    </StructuredSectionCard>
  );
} 
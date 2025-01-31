import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Database, Palette, Settings, Hash, Box } from 'lucide-react';
import { BrokerMetaData } from '../../../types/editor.types';

interface MetadataDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: BrokerMetaData | null;
}

const MetadataDialog: React.FC<MetadataDialogProps> = ({
  isOpen,
  onOpenChange,
  metadata
}) => {
  if (!metadata) return null;

  const metadataFields = [
    { 
      icon: <Hash className="w-4 h-4" />,
      label: "Record ID",
      value: metadata.matrxRecordId,
      description: "Unique identifier for this record"
    },
    { 
      icon: <Info className="w-4 h-4" />,
      label: "Name",
      value: metadata.name,
      description: "Display name"
    },
    { 
      icon: <Database className="w-4 h-4" />,
      label: "Data Type",
      value: metadata.dataType,
      description: "Type of data this field contains"
    },
    { 
      icon: <Box className="w-4 h-4" />,
      label: "Default Value",
      value: metadata.defaultValue,
      description: "Default value if none is specified"
    },
    { 
      icon: <Palette className="w-4 h-4" />,
      label: "Color",
      value: metadata.color,
      description: "Associated color code"
    },
    { 
      icon: <Settings className="w-4 h-4" />,
      label: "Status",
      value: metadata.status,
      description: "Current status"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Metadata Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {metadataFields.map((field, index) => (
            field.value && (
              <Card key={index} className="border border-neutral-200 dark:border-neutral-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 text-neutral-500 dark:text-neutral-400">
                      {field.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {field.label}
                      </div>
                      <div className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        {field.value}
                      </div>
                      <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {field.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>

        {metadata.defaultComponent && (
          <div className="px-4 pb-4">
            <Badge variant="secondary" className="text-sm">
              Default Component: {metadata.defaultComponent}
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MetadataDialog;
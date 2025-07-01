'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import TableSelectionModal from './TableSelectionModal';
import { UserDataReference } from '@/components/user-generated-table-data/tableReferences';

interface TableReferenceIconProps {
  onReferenceSelect: (reference: UserDataReference) => void;
  // Optional customization props
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
  title?: string;
  disabled?: boolean;
  // Modal customization
  modalTitle?: string;
  modalDescription?: string;
}

export default function TableReferenceIcon({
  onReferenceSelect,
  size = 'md',
  variant = 'ghost',
  className = '',
  title = 'Select Table Reference',
  disabled = false,
  modalTitle = 'Select Table for Reference',
  modalDescription = 'Choose a table to create references for workflows'
}: TableReferenceIconProps) {
  const [showModal, setShowModal] = useState(false);

  const handleReferenceSelect = (reference: UserDataReference) => {
    onReferenceSelect(reference);
    setShowModal(false);
  };

  // Size mappings for button and icon
  const sizeConfig = {
    sm: {
      buttonSize: 'sm' as const,
      iconClass: 'h-3.5 w-3.5'
    },
    md: {
      buttonSize: 'sm' as const,
      iconClass: 'h-4 w-4'
    },
    lg: {
      buttonSize: 'default' as const,
      iconClass: 'h-5 w-5'
    }
  };

  const config = sizeConfig[size];

  return (
    <>
      <Button
        variant={variant}
        size={config.buttonSize}
        onClick={() => setShowModal(true)}
        disabled={disabled}
        title={title}
        className={`flex items-center justify-center ${className}`}
      >
        <Database className={config.iconClass} />
      </Button>

      <TableSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onReferenceSelect={handleReferenceSelect}
        title={modalTitle}
        description={modalDescription}
      />
    </>
  );
} 
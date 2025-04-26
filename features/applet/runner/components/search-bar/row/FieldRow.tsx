// FieldRow.tsx
import React from 'react';
import { useSearchTab } from "@/context/SearchTabContext";
import DesktopFieldRow from './DesktopFieldRow';
import MobileFieldRow from './MobileFieldRow';

interface FieldRowProps {
  children: React.ReactNode;
  activeFieldId?: string | null;
  onActiveFieldChange?: (id: string | null) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const FieldRow: React.FC<FieldRowProps> = (props) => {
  const { isMobile } = useSearchTab();
  
  // Conditionally render either the mobile or desktop version
  return isMobile ? (
    <MobileFieldRow {...props} />
  ) : (
    <DesktopFieldRow {...props} />
  );
};

export default FieldRow;
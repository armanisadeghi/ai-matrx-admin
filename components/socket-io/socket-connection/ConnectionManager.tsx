'use client';
import React from 'react';
import ConnectionForm from './ConnectionForm';
import ConnectionList from './ConnectionList';
import AccordionWrapper from '@/components/matrx/matrx-collapsible/AccordionWrapper';
import { useSelector } from 'react-redux';
import { selectAllConnections } from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import { cn } from '@/lib/utils';

export interface ConnectionManagerProps {
  className?: string;
  title?: string;
  defaultOpen?: boolean;
  hideForm?: boolean;
  accordionId?: string;
  maxHeight?: string | number;
  disableAccordion?: boolean;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  className,
  title,
  defaultOpen = false,
  hideForm = false,
  accordionId = "socket-connections",
  maxHeight,
  disableAccordion = false,
}) => {
  const connections = useSelector(selectAllConnections);
  const connectionCount = connections.length;
  const displayTitle = title || `Socket Connections (${connectionCount})`;

  // Content of the component
  const content = (
    <div className={cn("space-y-2 p-1", maxHeight && "overflow-y-auto", className)}>
      {!hideForm && <ConnectionForm />}
      <ConnectionList />
    </div>
  );

  // If accordion is disabled, just render the content directly
  if (disableAccordion) {
    return content;
  }

  // Otherwise, wrap it in the accordion
  return (
    <AccordionWrapper 
      title={displayTitle}
      value={accordionId}
      defaultOpen={defaultOpen}
      className={cn("border border-zinc-200 dark:border-zinc-700 rounded-3xl", className)}
    >
      {content}
    </AccordionWrapper>
  );
};

export default ConnectionManager;
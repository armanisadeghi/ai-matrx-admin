'use client';
import React from 'react';
import {
  addConnection,
  updateFormUrl,
  updateFormNamespace,
  selectPredefinedConnection,
} from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { selectConnectionForm } from '@/lib/redux/socket-io/selectors';
import { selectPredefinedConnections } from '@/lib/redux/socket-io/selectors';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { v4 as uuidv4 } from "uuid";

const ConnectionForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectConnectionForm);
  const predefinedConnections = useAppSelector(selectPredefinedConnections);
  const isCustom = form.selectedPredefined === 'custom';
  
  const handleAddConnection = () => {
    if (form.url && form.namespace) {
      const connectionId = uuidv4();
      dispatch(addConnection({ connectionId, url: form.url, namespace: form.namespace }));
    }
  };
  
  const handlePredefinedChange = (value: string) => {
    dispatch(selectPredefinedConnection(value));
  };
  
  const handleCancelCustom = () => {
    // Reset to empty selection or default state
    dispatch(selectPredefinedConnection(''));
  };
  
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex-1 min-w-[180px] border border-zinc-200 dark:border-zinc-700 rounded-3xl">
        <Select value={form.selectedPredefined} onValueChange={handlePredefinedChange}>
          <SelectTrigger className="h-10 text-sm rounded-3xl">
            <SelectValue placeholder="Add connection..." />
          </SelectTrigger>
          <SelectContent className="rounded-3xl">
            <SelectItem value="custom">Custom Connection...</SelectItem>
            {predefinedConnections.map(opt => (
              <SelectItem key={opt.name} value={opt.name}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isCustom && (
        <>
          <div className="flex-1 min-w-[180px]">
            <Input
              value={form.url}
              onChange={(e) => dispatch(updateFormUrl(e.target.value))}
              placeholder="URL"
              size={20}
              className="h-8 text-sm rounded-3xl"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Input
              value={form.namespace}
              onChange={(e) => dispatch(updateFormNamespace(e.target.value))}
              placeholder="Namespace"
              size={15}
              className="h-8 text-sm rounded-3xl"
            />
          </div>
          <IconButton
            onClick={handleCancelCustom}
            variant="ghost"
            size="default"
            tooltip="Cancel custom connection"
            icon={<X className="h-4 w-4" />}
            className="text-zinc-500"
            showTooltipOnDisabled={true}
          />
        </>
      )}
      {isCustom && (
        <Button 
          onClick={handleAddConnection} 
          disabled={!form.url || !form.namespace}
          size="sm"
          className="shrink-0 h-8 rounded-3xl"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      )}
    </div>
  );
};

export default ConnectionForm;
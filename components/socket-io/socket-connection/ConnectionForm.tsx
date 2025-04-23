'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import {
  addConnection,
  updateFormUrl,
  updateFormNamespace,
  selectPredefinedConnection,
  selectConnectionForm,
  selectPredefinedConnections,
} from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const ConnectionForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const form = useSelector(selectConnectionForm);
  const predefinedConnections = useSelector(selectPredefinedConnections);
  const isCustom = form.selectedPredefined === 'custom';

  const handleAddConnection = () => {
    if (form.url && form.namespace) {
      const id = crypto.randomUUID();
      dispatch(addConnection({ id, url: form.url, namespace: form.namespace }));
    }
  };

  const handlePredefinedChange = (value: string) => {
    dispatch(selectPredefinedConnection(value));
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex-1 min-w-[180px] border border-zinc-200 dark:border-zinc-700 rounded-3xl">
        <Select value={form.selectedPredefined} onValueChange={handlePredefinedChange}>
          <SelectTrigger className="h-10 text-sm rounded-3xl">
            <SelectValue placeholder="Add connection..." />
          </SelectTrigger>
          <SelectContent className="rounded-3xl">
            <SelectItem value="custom">Custom Connection</SelectItem>
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
        </>
      )}

      <Button 
        onClick={handleAddConnection} 
        disabled={!form.url || !form.namespace}
        size="sm"
        className="shrink-0 h-8 rounded-3xl"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
};

export default ConnectionForm; 
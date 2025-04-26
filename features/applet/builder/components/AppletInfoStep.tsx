import React from 'react';
import { AppletConfig } from '../ConfigBuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface AppletInfoStepProps {
  config: Partial<AppletConfig>;
  updateConfig: (updates: Partial<AppletConfig>) => void;
}

export const AppletInfoStep: React.FC<AppletInfoStepProps> = ({ config, updateConfig }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateConfig({ [name]: value });
  };

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Applet Name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter applet name"
              value={config.name || ''}
              onChange={handleChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="id" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Applet ID
            </Label>
            <Input
              id="id"
              name="id"
              placeholder="Enter unique applet ID"
              value={config.id || ''}
              onChange={handleChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              A unique identifier for your applet. Use lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter applet description"
              value={config.description || ''}
              onChange={handleChange}
              rows={4}
              className="resize-none border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              A brief description of your applet and what it does.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
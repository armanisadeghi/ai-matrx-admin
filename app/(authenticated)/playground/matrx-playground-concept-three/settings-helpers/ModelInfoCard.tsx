// ModelInfoCard.tsx
'use client';



export type ModelSettings = {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    streamResponse: boolean;
    responseFormat: string;
    enabledTools: string[];
  };
  

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export const ModelInfoCard = ({ model, version, context }: { 
  model: string; 
  version: string; 
  context: string;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-elevation2 rounded-lg p-2"
  >
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-medium text-sm">{model}</h4>
        <p className="text-xs text-muted-foreground">{context} · {version}</p>
      </div>
      <Button variant="ghost" size="sm">
        <Info size={16} />
      </Button>
    </div>
  </motion.div>
);

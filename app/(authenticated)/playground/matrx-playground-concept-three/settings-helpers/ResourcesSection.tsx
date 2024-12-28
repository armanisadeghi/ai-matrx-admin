// ResourcesSection.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Globe, 
  Files, 
  Github, 
  GraduationCap 
} from 'lucide-react';

export const ResourcesSection = () => (
  <Card className="bg-elevation1 p-2 rounded-lg mx-2 mb-2 border">
    <h4 className="text-sm font-medium mb-2">Resources</h4>
    <div className="space-y-1">
      <ResourceButton icon={<Globe size={14} />} label="API Reference" />
      <ResourceButton icon={<Files size={14} />} label="Documentation" />
      <ResourceButton icon={<Github size={14} />} label="GitHub" />
      <ResourceButton icon={<GraduationCap size={14} />} label="Matrix University" />
    </div>
  </Card>
);

const ResourceButton = ({ icon, label }: { 
  icon: React.ReactNode; 
  label: string;
}) => (
  <Button variant="ghost" size="sm" className="w-full justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <ChevronRight size={14} />
  </Button>
);


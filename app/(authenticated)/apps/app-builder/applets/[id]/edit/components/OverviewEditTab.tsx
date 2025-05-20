'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OverviewEditTabProps {
  id: string;
  name: string;
  description?: string;
  slug: string;
  creator?: string;
  onUpdate: (field: string, value: string) => void;
}

export default function OverviewEditTab({
  id,
  name,
  description,
  slug,
  creator,
  onUpdate
}: OverviewEditTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="applet-id">ID (read-only)</Label>
            <Input id="applet-id" value={id} disabled />
          </div>

          <div>
            <Label htmlFor="applet-name">Name</Label>
            <Input 
              id="applet-name" 
              value={name} 
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Enter applet name"
            />
          </div>
          
          <div>
            <Label htmlFor="applet-slug">Slug</Label>
            <Input 
              id="applet-slug" 
              value={slug} 
              onChange={(e) => onUpdate('slug', e.target.value)}
              placeholder="Enter slug"
            />
          </div>
          
          <div>
            <Label htmlFor="applet-creator">Created by</Label>
            <Input 
              id="applet-creator" 
              value={creator || ''} 
              onChange={(e) => onUpdate('creator', e.target.value)}
              placeholder="Enter creator name"
            />
          </div>
          
          <div>
            <Label htmlFor="applet-description">Description</Label>
            <Textarea 
              id="applet-description" 
              value={description || ''} 
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="Enter description"
              rows={4}
            />
          </div>
        </div>
      </Card>
    </div>
  );
} 
'use client';

import React, { useState, useEffect } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useEditorContext } from '../../provider/EditorProvider';
import { Switch } from '@/components/ui';



export const EditorStats = ({ state }: { state: any }) => (
    <div className="flex gap-4 text-sm">
        <div>
            <span className="text-muted-foreground">Chips:</span>
            <span className="ml-1">{state.chipCounter}</span>
        </div>
        <div>
            <span className="text-muted-foreground">Dragging:</span>
            <span className="ml-1">{state.draggedChip ? 'Yes' : 'No'}</span>
        </div>
        <div>
            <span className="text-muted-foreground">Colors:</span>
            <span className="ml-1">{state.colorAssignments?.value?.length || 0}</span>
        </div>
    </div>
);


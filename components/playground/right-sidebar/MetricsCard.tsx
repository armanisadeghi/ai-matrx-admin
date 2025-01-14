'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart2, Clock, Zap, Cpu } from 'lucide-react';

const MetricsCard = () => {
  return (
    <Card className="bg-elevation2 p-2 rounded-none mb-0 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <BarChart2 size={14} className="text-primary" />
            <span className="text-xs font-medium">Usage</span>
          </div>
          <span className="text-xl font-semibold">2.4K</span>
          <span className="text-xs ml-1 text-muted-foreground">tokens</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-info" />
            <span className="text-xs font-medium">Latency</span>
          </div>
          <span className="text-xl font-semibold">127</span>
          <span className="text-xs text-muted-foreground">ms</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Zap size={14} className="text-warning" />
            <span className="text-xs font-medium">Requests</span>
          </div>
          <span className="text-xl font-semibold">845</span>
          <span className="text-xs text-muted-foreground">/hour</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Cpu size={14} className="text-success" />
            <span className="text-xs font-medium">Success</span>
          </div>
          <span className="text-xl font-semibold">99.8</span>
          <span className="text-xs ml-1 text-muted-foreground">%</span>
        </div>
      </div>
    </Card>
  );
};

export default MetricsCard;

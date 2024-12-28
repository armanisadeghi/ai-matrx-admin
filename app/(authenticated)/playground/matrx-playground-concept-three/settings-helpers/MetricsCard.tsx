// MetricsCard.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart2, Clock, Zap, Cpu } from 'lucide-react';

export const MetricsCard = () => (
  <Card className="bg-elevation2 p-2 rounded-lg mx-2 mb-2">
    <div className="grid grid-cols-2 gap-2">
      <MetricItem
        icon={<BarChart2 size={14} className="text-primary" />}
        label="Usage"
        value="2.4K"
        unit="tokens/min"
      />
      <MetricItem
        icon={<Clock size={14} className="text-info" />}
        label="Latency"
        value="127"
        unit="ms"
      />
      <MetricItem
        icon={<Zap size={14} className="text-warning" />}
        label="Requests"
        value="845"
        unit="/hour"
      />
      <MetricItem
        icon={<Cpu size={14} className="text-success" />}
        label="Success"
        value="99.8"
        unit="%"
      />
    </div>
  </Card>
);

const MetricItem = ({ icon, label, value, unit }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
    <span className="text-xl font-semibold">{value}</span>
    <span className="text-xs text-muted-foreground">{unit}</span>
  </div>
);

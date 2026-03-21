'use client';

import { STATUS_CONFIG, STATUS_TRANSITIONS, STATUS_PHASES } from '../constants';
import type { ContextItemStatus } from '../types';
import {
  Lightbulb, FileText, Download, PieChart, Eye, Sparkles,
  Pencil, Clock, CheckCircle, ShieldAlert, Clock4, AlertTriangle,
  ArrowRightLeft, Archive, Trash2,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb, FileText, Download, PieChart, Eye, Sparkles,
  Pencil, Clock, CheckCircle, ShieldAlert, Clock4, AlertTriangle,
  ArrowRightLeft, Archive, Trash2,
};

type BadgeSize = 'sm' | 'md' | 'lg';

type ContextStatusBadgeProps = {
  status: ContextItemStatus;
  size?: BadgeSize;
  interactive?: boolean;
  onStatusChange?: (status: ContextItemStatus, note?: string) => void;
};

export function ContextStatusBadge({ status, size = 'sm', interactive = false, onStatusChange }: ContextStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = ICON_MAP[config.iconName];
  const [noteText, setNoteText] = useState('');
  const [open, setOpen] = useState(false);

  const badge = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.colorBg} ${config.colorText} ${interactive ? 'cursor-pointer hover:ring-1 hover:ring-current/20 transition-shadow' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.colorDot}`} />
      {Icon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
      {size !== 'sm' && (
        <span className="text-[10px] opacity-70 ml-0.5">— {config.tagline}</span>
      )}
    </span>
  );

  if (!interactive || !onStatusChange) return badge;

  const suggested = STATUS_TRANSITIONS[status] ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggested next</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map(s => {
              const sc = STATUS_CONFIG[s];
              const SIcon = ICON_MAP[sc.iconName];
              return (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className={`h-7 text-xs gap-1 ${sc.colorText}`}
                  onClick={() => {
                    onStatusChange(s, noteText || undefined);
                    setNoteText('');
                    setOpen(false);
                  }}
                >
                  {SIcon && <SIcon className="h-3 w-3" />}
                  {sc.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="p-3 max-h-60 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">All statuses</p>
          {STATUS_PHASES.map(phase => (
            <div key={phase.key} className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{phase.label}</p>
              <div className="flex flex-wrap gap-1">
                {phase.statuses.map(s => {
                  const sc = STATUS_CONFIG[s];
                  const SIcon = ICON_MAP[sc.iconName];
                  const isCurrent = s === status;
                  return (
                    <button
                      key={s}
                      disabled={isCurrent}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors ${isCurrent ? 'bg-foreground/10 font-semibold' : 'hover:bg-muted'} ${sc.colorText}`}
                      onClick={() => {
                        onStatusChange(s, noteText || undefined);
                        setNoteText('');
                        setOpen(false);
                      }}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.colorDot}`} />
                      {SIcon && <SIcon className="h-2.5 w-2.5" />}
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <Input
            placeholder="Status note (optional)"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

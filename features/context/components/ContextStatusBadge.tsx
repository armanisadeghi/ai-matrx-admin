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

  // ─── LG variant: full card with description ───
  if (size === 'lg') {
    const inner = (
      <div className={`flex items-start gap-3 rounded-lg border p-3 ${config.colorBg} ${interactive ? 'cursor-pointer hover:ring-1 hover:ring-current/20 transition-shadow' : ''}`}>
        <div className={`h-8 w-8 rounded-lg ${config.colorBg} flex items-center justify-center shrink-0`}>
          {Icon && <Icon className={`h-4 w-4 ${config.colorText}`} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${config.colorDot}`} />
            <span className={`text-sm font-semibold ${config.colorText}`}>{config.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.tagline}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1 capitalize">Phase: {config.phase}</p>
        </div>
      </div>
    );

    if (!interactive || !onStatusChange) return inner;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{inner}</PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <StatusPickerPanel status={status} onStatusChange={(s, n) => { onStatusChange(s, n); setNoteText(''); setOpen(false); }} noteText={noteText} setNoteText={setNoteText} />
        </PopoverContent>
      </Popover>
    );
  }

  // ─── SM / MD variants ───
  const badge = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.colorBg} ${config.colorText} ${interactive ? 'cursor-pointer hover:ring-1 hover:ring-current/20 transition-shadow' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.colorDot}`} />
      {Icon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
      {size === 'md' && (
        <span className="text-[10px] opacity-70 ml-0.5">— {config.tagline}</span>
      )}
    </span>
  );

  if (!interactive || !onStatusChange) return badge;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <StatusPickerPanel status={status} onStatusChange={(s, n) => { onStatusChange(s, n); setNoteText(''); setOpen(false); }} noteText={noteText} setNoteText={setNoteText} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Shared status picker popover content ────────────────────────

function StatusPickerPanel({ status, onStatusChange, noteText, setNoteText }: {
  status: ContextItemStatus;
  onStatusChange: (s: ContextItemStatus, note?: string) => void;
  noteText: string;
  setNoteText: (v: string) => void;
}) {
  const suggested = STATUS_TRANSITIONS[status] ?? [];

  return (
    <>
      {/* Suggested next */}
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
                onClick={() => onStatusChange(s, noteText || undefined)}
              >
                {SIcon && <SIcon className="h-3 w-3" />}
                {sc.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* All statuses grouped by phase */}
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
                    onClick={() => onStatusChange(s, noteText || undefined)}
                    title={sc.tagline}
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

      {/* Status note */}
      <div className="p-3 border-t border-border">
        <Input
          placeholder="Status note (optional)"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </>
  );
}

// ─── Form status selector (visual stepper with phases) ──────────

type StatusStepperProps = {
  value: ContextItemStatus;
  onChange: (status: ContextItemStatus) => void;
  statusNote: string;
  onStatusNoteChange: (note: string) => void;
};

export function ContextStatusStepper({ value, onChange, statusNote, onStatusNoteChange }: StatusStepperProps) {
  const currentPhase = STATUS_CONFIG[value].phase;

  return (
    <div className="space-y-3">
      {/* Phase stepper indicator */}
      <div className="flex items-center gap-1">
        {STATUS_PHASES.map((phase, i) => {
          const isActive = phase.key === currentPhase;
          const phaseIdx = STATUS_PHASES.findIndex(p => p.key === currentPhase);
          const isPast = i < phaseIdx;
          return (
            <div key={phase.key} className="flex items-center gap-1 flex-1">
              <div className={`flex-1 h-1 rounded-full transition-colors ${isActive ? 'bg-primary' : isPast ? 'bg-primary/40' : 'bg-muted'}`} />
              <span className={`text-[9px] whitespace-nowrap ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Statuses grouped by phase */}
      {STATUS_PHASES.map(phase => (
        <div key={phase.key}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{phase.label}</p>
          <div className="flex flex-wrap gap-1">
            {phase.statuses.map(s => {
              const config = STATUS_CONFIG[s];
              const Icon = ICON_MAP[config.iconName];
              const isSelected = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-all border ${isSelected ? `${config.colorBg} ${config.colorText} border-current/20 ring-1 ring-current/10` : 'border-transparent hover:bg-muted text-muted-foreground'}`}
                  onClick={() => onChange(s)}
                  title={config.tagline}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${config.colorDot}`} />
                  {Icon && <Icon className="h-3 w-3" />}
                  {config.label}
                  {isSelected && <span className="text-[9px] opacity-60 ml-0.5">— {config.tagline}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Status note */}
      <Input
        value={statusNote}
        onChange={e => onStatusNoteChange(e.target.value)}
        placeholder="Add a note about why this status was set (optional)"
        className="h-7 text-xs"
      />
    </div>
  );
}

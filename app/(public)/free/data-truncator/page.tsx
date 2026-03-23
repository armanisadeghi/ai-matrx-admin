'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Copy, ChevronRight, ChevronDown, Scissors, RefreshCw,
  AlertCircle, Check, FileJson, Trash2, Search, X, PackageX, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface FieldEntry {
  path: string[];
  pathStr: string;
  keyName: string;
  type: 'string' | 'array' | 'object';
  size: number;
  charCount: number;
  value: JsonValue;
}

interface TruncateOpts {
  leadChars: number;
  tailChars: number;
  replacement: string;
}

const DEFAULT_OPTS: TruncateOpts = {
  leadChars: 15,
  tailChars: 15,
  replacement: '...[TRUNCATED]...',
};

const AUTO_TRUNCATE_LS_KEY = 'data-truncator:auto-threshold';
const DEFAULT_AUTO_THRESHOLD = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJsonSize(val: JsonValue): number {
  return JSON.stringify(val).length;
}

function getKeyName(path: string[]): string {
  for (let i = path.length - 1; i >= 0; i--) {
    if (!/^\d+$/.test(path[i])) return path[i];
  }
  return path[path.length - 1] ?? '(root)';
}

function collectFields(val: JsonValue, path: string[] = []): FieldEntry[] {
  const entries: FieldEntry[] = [];

  if (typeof val === 'string') {
    entries.push({
      path, pathStr: formatPath(path), keyName: getKeyName(path),
      type: 'string', size: val.length, charCount: val.length, value: val,
    });
  } else if (Array.isArray(val)) {
    const charCount = getJsonSize(val);
    if (charCount > 100) {
      entries.push({
        path, pathStr: formatPath(path), keyName: getKeyName(path),
        type: 'array', size: val.length, charCount, value: val,
      });
    }
    val.forEach((item, i) => entries.push(...collectFields(item, [...path, String(i)])));
  } else if (val !== null && typeof val === 'object') {
    const charCount = getJsonSize(val);
    if (path.length > 0 && charCount > 100) {
      entries.push({
        path, pathStr: formatPath(path), keyName: getKeyName(path),
        type: 'object', size: Object.keys(val).length, charCount, value: val,
      });
    }
    for (const key of Object.keys(val)) {
      entries.push(...collectFields((val as { [k: string]: JsonValue })[key], [...path, key]));
    }
  }

  return entries;
}

function formatPath(path: string[]): string {
  if (path.length === 0) return '(root)';
  return path.map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i === 0 ? p : `.${p}`)).join('');
}

function makeStub(entry: FieldEntry, note: string): JsonValue {
  const base = note || (
    entry.type === 'array'
      ? `array with ${entry.size} items — removed for brevity`
      : `object with ${entry.size} keys — removed for brevity`
  );
  if (entry.type === 'array') return [`__removed__: ${base}`];
  return { __removed__: base };
}

function applyTruncation(
  val: JsonValue,
  truncations: Map<string, TruncateOpts>,
  stubs: Map<string, string>,
  path: string[] = [],
): JsonValue {
  const pathStr = formatPath(path);

  if (stubs.has(pathStr)) {
    const entry: FieldEntry = {
      path, pathStr, keyName: getKeyName(path),
      type: Array.isArray(val) ? 'array' : (val !== null && typeof val === 'object' ? 'object' : 'string'),
      size: Array.isArray(val) ? val.length : (val !== null && typeof val === 'object' ? Object.keys(val as object).length : 0),
      charCount: getJsonSize(val),
      value: val,
    };
    return makeStub(entry, stubs.get(pathStr)!);
  }

  const opts = truncations.get(pathStr);

  if (typeof val === 'string') {
    if (opts && val.length > opts.leadChars + opts.tailChars) {
      return val.slice(0, opts.leadChars) + opts.replacement + val.slice(val.length - opts.tailChars);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item, i) => applyTruncation(item, truncations, stubs, [...path, String(i)]));
  }
  if (val !== null && typeof val === 'object') {
    const result: { [k: string]: JsonValue } = {};
    for (const key of Object.keys(val)) {
      result[key] = applyTruncation((val as { [k: string]: JsonValue })[key], truncations, stubs, [...path, key]);
    }
    return result;
  }
  return val;
}

async function loadSample(name: 'message' | 'large'): Promise<string> {
  const path = name === 'message'
    ? '/free/data-truncator/sample-data/message-data.json'
    : '/free/data-truncator/sample-data/large-tool-sample.json';
  const res = await fetch(path);
  return res.text();
}

// ─── Size bar ─────────────────────────────────────────────────────────────────

function SizeBar({ size, max }: { size: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (size / max) * 100) : 0;
  const color = pct > 75 ? 'bg-destructive' : pct > 40 ? 'bg-warning' : 'bg-primary';
  return (
    <div className="h-1 w-12 bg-muted rounded-full overflow-hidden flex-shrink-0">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Value preview with cut-point indicator ───────────────────────────────────

function ValuePreview({ value, opts }: { value: string; opts: TruncateOpts }) {
  const { leadChars, tailChars } = opts;
  const len = value.length;
  const willTruncate = len > leadChars + tailChars;

  if (!willTruncate) {
    return (
      <div className="w-full font-mono text-[10px] text-foreground bg-muted/40 rounded border border-border px-2 py-1.5 whitespace-pre-wrap break-all leading-relaxed">
        <span className="text-success">{value}</span>
        <span className="ml-2 text-[9px] text-success/70 normal-case font-sans">(short enough — no truncation)</span>
      </div>
    );
  }

  const leadText = value.slice(0, leadChars);
  const tailText = value.slice(len - tailChars);
  const removedCount = len - leadChars - tailChars;

  return (
    <div className="w-full font-mono text-[10px] bg-muted/40 rounded border border-border px-2 py-1.5 leading-relaxed break-all">
      <span className="text-primary">{leadText}</span>
      <span className="text-destructive/80 bg-destructive/10 px-0.5 rounded mx-0.5 text-[9px] font-sans not-italic">
        ✂ {removedCount.toLocaleString()} chars removed
      </span>
      <span className="text-primary/60">{tailText}</span>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

interface TruncateRowProps {
  entry: FieldEntry;
  maxSize: number;
  opts: TruncateOpts | undefined;
  stubNote: string | undefined;
  checked: boolean;
  onCheck: (pathStr: string, checked: boolean) => void;
  showCheckbox: boolean;
  searchQuery: string;
  onApply: (pathStr: string, opts: TruncateOpts) => void;
  onRemove: (pathStr: string) => void;
  onApplyStub: (pathStr: string, note: string) => void;
  onRemoveStub: (pathStr: string) => void;
  onHighlight: (pathStr: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-warning/40 text-foreground rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function TruncateRow({
  entry, maxSize, opts, stubNote, checked, onCheck, showCheckbox,
  searchQuery, onApply, onRemove, onApplyStub, onRemoveStub, onHighlight,
}: TruncateRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState<TruncateOpts>(opts ?? DEFAULT_OPTS);
  const [localNote, setLocalNote] = useState(stubNote ?? '');

  const active = !!opts;
  const stubbed = stubNote !== undefined;
  const canTruncate = entry.type === 'string';
  const canStub = entry.type === 'array' || entry.type === 'object';

  useEffect(() => { if (opts) setLocal(opts); }, [opts]);
  useEffect(() => { setLocalNote(stubNote ?? ''); }, [stubNote]);

  const typeBadge =
    entry.type === 'string' ? 'bg-primary/15 text-primary' :
    entry.type === 'array'  ? 'bg-secondary/15 text-secondary' :
                              'bg-muted text-muted-foreground';

  const rowBg = stubbed ? 'bg-destructive/8' : active ? 'bg-accent/40' : checked ? 'bg-primary/8' : '';

  const handleRowClick = () => {
    if (canTruncate || canStub) {
      setExpanded(e => !e);
      // Highlight this field in the output whenever the row is clicked
      onHighlight(entry.pathStr);
    }
  };

  return (
    <div className={`border-b border-border ${rowBg} group`}>
      <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-accent/20 select-none text-xs">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={checked}
            onChange={e => onCheck(entry.pathStr, e.target.checked)}
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 accent-primary cursor-pointer"
          />
        )}

        <div
          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
          onClick={handleRowClick}
        >
          {(canTruncate || canStub) ? (
            expanded
              ? <ChevronDown size={11} className="text-muted-foreground flex-shrink-0" />
              : <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <span className="w-[11px] flex-shrink-0" />
          )}

          <SizeBar size={entry.charCount} max={maxSize} />

          <span className="text-muted-foreground w-14 flex-shrink-0 text-right font-mono">
            {entry.charCount.toLocaleString()}
          </span>

          <span className={`px-1 py-0.5 rounded text-[10px] flex-shrink-0 font-mono ${typeBadge}`}>
            {entry.type}
          </span>

          <span className="font-mono text-foreground truncate flex-1 min-w-0" title={entry.pathStr}>
            {highlightMatch(entry.pathStr, searchQuery)}
          </span>
        </div>

        {/* Status badge — hidden on hover to make room for quick-action */}
        {stubbed && (
          <span className="text-destructive flex-shrink-0 flex items-center gap-1 text-[10px] group-hover:hidden">
            <PackageX size={10} /> removed
          </span>
        )}
        {active && !stubbed && (
          <span className="text-success flex-shrink-0 flex items-center gap-1 text-[10px] group-hover:hidden">
            <Scissors size={10} /> truncated
          </span>
        )}

        {/* Quick-action buttons — only visible on hover */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          {canTruncate && (
            active ? (
              <button
                title="Remove truncation"
                onClick={e => { e.stopPropagation(); onRemove(entry.pathStr); }}
                className="p-0.5 rounded text-success hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            ) : (
              <button
                title={`Truncate: ${local.leadChars} lead · ${local.tailChars} tail`}
                onClick={e => { e.stopPropagation(); onApply(entry.pathStr, local); }}
                className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Scissors size={11} />
              </button>
            )
          )}
          {canStub && (
            stubbed ? (
              <button
                title="Restore (remove stub)"
                onClick={e => { e.stopPropagation(); onRemoveStub(entry.pathStr); }}
                className="p-0.5 rounded text-destructive hover:text-muted-foreground hover:bg-muted transition-colors"
              >
                <Trash2 size={11} />
              </button>
            ) : (
              <button
                title="Replace with brevity stub"
                onClick={e => { e.stopPropagation(); onApplyStub(entry.pathStr, ''); }}
                className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <PackageX size={11} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Expand panel — string truncation */}
      {expanded && canTruncate && (
        <div className="px-6 py-2 bg-card border-t border-border space-y-2">
          {/* Value preview */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Value preview
                <span className="normal-case font-normal ml-1">
                  — {entry.charCount.toLocaleString()} chars · key: <code className="text-primary">{entry.keyName}</code>
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                path: <span className="text-foreground">{entry.pathStr}</span>
              </span>
            </div>
            <ValuePreview value={entry.value as string} opts={local} />
          </div>

          {/* Controls */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Lead chars</label>
              <input
                type="number" min={0} max={500} value={local.leadChars}
                onChange={e => setLocal(l => ({ ...l, leadChars: parseInt(e.target.value) || 0 }))}
                className="w-16 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tail chars</label>
              <input
                type="number" min={0} max={500} value={local.tailChars}
                onChange={e => setLocal(l => ({ ...l, tailChars: parseInt(e.target.value) || 0 }))}
                className="w-16 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
              />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Replacement text</label>
              <input
                type="text" value={local.replacement}
                onChange={e => setLocal(l => ({ ...l, replacement: e.target.value }))}
                className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
              />
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onApply(entry.pathStr, local)}
                className="px-2 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded text-xs flex items-center gap-1"
              >
                <Scissors size={10} /> Apply
              </button>
              {active && (
                <button
                  onClick={() => onRemove(entry.pathStr)}
                  className="px-2 py-1 bg-muted hover:bg-accent text-muted-foreground rounded text-xs flex items-center gap-1"
                >
                  <Trash2 size={10} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expand panel — object/array stub */}
      {expanded && canStub && (
        <div className="px-6 py-2 bg-card border-t border-border space-y-2">
          {/* Path context */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Key: <code className="text-primary">{entry.keyName}</code>
              <span className="ml-2">·</span>
              <span className="ml-2">{entry.type === 'array' ? `${entry.size} items` : `${entry.size} keys`}</span>
              <span className="ml-2">·</span>
              <span className="ml-2">{entry.charCount.toLocaleString()} chars</span>
            </span>
            <span>path: <span className="text-foreground font-mono">{entry.pathStr}</span></span>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Stub note <span className="normal-case font-normal">(leave blank for auto)</span>
              </label>
              <input
                type="text"
                value={localNote}
                placeholder={
                  entry.type === 'array'
                    ? `array with ${entry.size} items — removed for brevity`
                    : `object with ${entry.size} keys — removed for brevity`
                }
                onChange={e => setLocalNote(e.target.value)}
                className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onApplyStub(entry.pathStr, localNote)}
                className="px-2 py-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded text-xs flex items-center gap-1"
              >
                <PackageX size={10} /> Replace with stub
              </button>
              {stubbed && (
                <button
                  onClick={() => onRemoveStub(entry.pathStr)}
                  className="px-2 py-1 bg-muted hover:bg-accent text-muted-foreground rounded text-xs flex items-center gap-1"
                >
                  <Trash2 size={10} /> Restore
                </button>
              )}
            </div>
          </div>
          <p className="w-full text-[10px] text-muted-foreground">
            Replaces the entire {entry.type} with a{' '}
            {entry.type === 'array' ? 'single-element array' : 'single-key object'}{' '}
            marker, preserving JSON structure validity.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Bulk apply bar ───────────────────────────────────────────────────────────

interface BulkApplyBarProps {
  count: number;
  onApply: (opts: TruncateOpts) => void;
  onClear: () => void;
}

function BulkApplyBar({ count, onApply, onClear }: BulkApplyBarProps) {
  const [opts, setOpts] = useState<TruncateOpts>(DEFAULT_OPTS);

  return (
    <div className="border-t border-primary/40 bg-primary/8 px-2 py-1.5 flex-shrink-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-semibold text-primary">{count} selected</span>
        <div className="flex-1" />
        <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
          <X size={9} /> deselect all
        </button>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Lead</label>
          <input
            type="number" min={0} max={500} value={opts.leadChars}
            onChange={e => setOpts(o => ({ ...o, leadChars: parseInt(e.target.value) || 0 }))}
            className="w-14 bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground font-mono"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tail</label>
          <input
            type="number" min={0} max={500} value={opts.tailChars}
            onChange={e => setOpts(o => ({ ...o, tailChars: parseInt(e.target.value) || 0 }))}
            className="w-14 bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground font-mono"
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Replacement</label>
          <input
            type="text" value={opts.replacement}
            onChange={e => setOpts(o => ({ ...o, replacement: e.target.value }))}
            className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground font-mono"
          />
        </div>
        <button
          onClick={() => onApply(opts)}
          className="px-2 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded text-xs flex items-center gap-1 flex-shrink-0"
        >
          <Scissors size={10} /> Apply to {count}
        </button>
      </div>
    </div>
  );
}

// ─── Auto-truncate bar ────────────────────────────────────────────────────────

interface AutoTruncateBarProps {
  enabled: boolean;
  threshold: number;
  onToggle: () => void;
  onThresholdChange: (v: number) => void;
  matchCount: number;
}

function AutoTruncateBar({ enabled, threshold, onToggle, onThresholdChange, matchCount }: AutoTruncateBarProps) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 border-b border-border flex-shrink-0 transition-colors ${enabled ? 'bg-primary/8 border-primary/30' : 'bg-card'}`}>
      <button
        onClick={onToggle}
        title={enabled ? 'Disable auto-truncate' : 'Enable auto-truncate'}
        className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors px-2 py-0.5 rounded ${enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
      >
        <Zap size={11} />
        Auto
      </button>
      <span className="text-[10px] text-muted-foreground">Truncate strings longer than</span>
      <input
        type="number"
        min={1}
        max={10000}
        value={threshold}
        onChange={e => onThresholdChange(Math.max(1, parseInt(e.target.value) || DEFAULT_AUTO_THRESHOLD))}
        className="w-16 bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground font-mono"
      />
      <span className="text-[10px] text-muted-foreground">chars</span>
      {enabled && (
        <span className="text-[10px] text-primary ml-1">
          {matchCount > 0 ? `— ${matchCount} field${matchCount !== 1 ? 's' : ''} affected` : '— no matches'}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = 'size' | 'path' | 'type';

// Find the character offset of a JSON path in pretty-printed JSON
function findPathOffsetInOutput(output: string, pathStr: string): number {
  if (pathStr === '(root)') return 0;
  // Extract the leaf key name to search for
  const parts = pathStr.match(/[^.\[\]]+|\[\d+\]/g) ?? [];
  const last = parts[parts.length - 1];
  if (!last) return -1;
  // Search for `"key":` pattern in the output
  const key = last.replace(/^\[(\d+)\]$/, '$1');
  const pattern = new RegExp(`"${key}"\\s*:`);
  const m = pattern.exec(output);
  return m ? m.index : -1;
}

export default function DataTruncatorPage() {
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<JsonValue | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldEntry[]>([]);
  const [truncations, setTruncations] = useState<Map<string, TruncateOpts>>(new Map());
  const [stubs, setStubs] = useState<Map<string, string>>(new Map());
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'string' | 'array' | 'object'>('all');
  const [minSize, setMinSize] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);
  const [outputEdited, setOutputEdited] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [autoTruncateEnabled, setAutoTruncateEnabled] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState<number>(DEFAULT_AUTO_THRESHOLD);
  const [highlightedOffset, setHighlightedOffset] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Load auto-threshold from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTO_TRUNCATE_LS_KEY);
    if (stored) {
      const v = parseInt(stored);
      if (!isNaN(v) && v > 0) setAutoThreshold(v);
    }
  }, []);

  // Persist threshold to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(AUTO_TRUNCATE_LS_KEY, String(autoThreshold));
  }, [autoThreshold]);

  // Compute auto-truncation rules whenever enabled/threshold/fields change
  const autoTruncations = useMemo<Map<string, TruncateOpts>>(() => {
    if (!autoTruncateEnabled) return new Map();
    const map = new Map<string, TruncateOpts>();
    for (const f of fields) {
      if (f.type === 'string' && f.charCount >= autoThreshold) {
        map.set(f.pathStr, DEFAULT_OPTS);
      }
    }
    return map;
  }, [autoTruncateEnabled, autoThreshold, fields]);

  // Merged truncations: manual rules override auto rules
  const effectiveTruncations = useMemo<Map<string, TruncateOpts>>(() => {
    const merged = new Map(autoTruncations);
    for (const [k, v] of truncations) merged.set(k, v);
    return merged;
  }, [autoTruncations, truncations]);

  const handleParse = useCallback((text: string) => {
    if (!text.trim()) {
      setParsed(null); setFields([]); setParseError(null); setOutputText(''); return;
    }
    try {
      const val = JSON.parse(text);
      setParsed(val);
      const allFields = collectFields(val);
      allFields.sort((a, b) => b.charCount - a.charCount);
      setFields(allFields);
      setParseError(null);
      setTruncations(new Map());
      setStubs(new Map());
      setSelected(new Set());
      setOutputText(JSON.stringify(val, null, 2));
      setOutputEdited(false);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
      setParsed(null); setFields([]);
    }
  }, []);

  useEffect(() => {
    if (!parsed || outputEdited) return;
    setOutputText(JSON.stringify(applyTruncation(parsed, effectiveTruncations, stubs), null, 2));
  }, [effectiveTruncations, stubs, parsed, outputEdited]);

  const applyRule = useCallback((pathStr: string, opts: TruncateOpts) => {
    setOutputEdited(false);
    setTruncations(prev => new Map(prev).set(pathStr, opts));
  }, []);

  const removeRule = useCallback((pathStr: string) => {
    setOutputEdited(false);
    setTruncations(prev => { const m = new Map(prev); m.delete(pathStr); return m; });
  }, []);

  const applyStub = useCallback((pathStr: string, note: string) => {
    setOutputEdited(false);
    setStubs(prev => new Map(prev).set(pathStr, note));
  }, []);

  const removeStub = useCallback((pathStr: string) => {
    setOutputEdited(false);
    setStubs(prev => { const m = new Map(prev); m.delete(pathStr); return m; });
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [outputText]);

  const handleReset = useCallback(() => {
    setTruncations(new Map()); setStubs(new Map()); setOutputEdited(false);
  }, []);

  const handleLoadSample = useCallback(async (name: 'message' | 'large') => {
    setLoadingSample(true);
    try {
      const text = await loadSample(name);
      setInputText(text);
      handleParse(text);
    } finally {
      setLoadingSample(false);
    }
  }, [handleParse]);

  const handleCheck = useCallback((pathStr: string, isChecked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (isChecked) next.add(pathStr); else next.delete(pathStr);
      return next;
    });
  }, []);

  const handleBulkApply = useCallback((opts: TruncateOpts) => {
    setOutputEdited(false);
    setTruncations(prev => {
      const next = new Map(prev);
      for (const pathStr of selected) next.set(pathStr, opts);
      return next;
    });
    setSelected(new Set());
  }, [selected]);

  // Scroll output pane to highlighted field
  const handleHighlight = useCallback((pathStr: string) => {
    const offset = findPathOffsetInOutput(outputText, pathStr);
    if (offset < 0 || !outputRef.current) return;
    setHighlightedOffset(offset);

    const ta = outputRef.current;
    // Scroll the textarea so the line containing offset is visible
    const before = outputText.slice(0, offset);
    const lineNumber = (before.match(/\n/g) ?? []).length;
    const lineHeight = 16; // approximate px per line at text-[11px]
    ta.scrollTop = Math.max(0, lineNumber * lineHeight - ta.clientHeight / 2);
    ta.focus();
    ta.setSelectionRange(offset, offset + Math.min(50, outputText.length - offset));
  }, [outputText]);

  const displayFields = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = fields.filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false;
      if (f.charCount < minSize) return false;
      if (q) return f.keyName.toLowerCase().includes(q) || f.pathStr.toLowerCase().includes(q);
      return true;
    });
    return [...list].sort((a, b) => {
      const cmp = sortKey === 'size' ? a.charCount - b.charCount
                : sortKey === 'path' ? a.pathStr.localeCompare(b.pathStr)
                : a.type.localeCompare(b.type);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [fields, filterType, minSize, searchQuery, sortKey, sortDir]);

  const selectableInView = useMemo(
    () => displayFields.filter(f => f.type === 'string').map(f => f.pathStr),
    [displayFields],
  );

  const allChecked = selectableInView.length > 0 && selectableInView.every(p => selected.has(p));
  const someChecked = selectableInView.some(p => selected.has(p));

  const handleSelectAll = () => {
    if (allChecked) {
      setSelected(prev => { const n = new Set(prev); selectableInView.forEach(p => n.delete(p)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); selectableInView.forEach(p => n.add(p)); return n; });
    }
  };

  const maxSize = fields.length > 0 ? Math.max(...fields.map(f => f.charCount)) : 1;
  const totalRules = truncations.size + stubs.size;
  const autoMatchCount = autoTruncations.size;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totalOriginal = parsed ? getJsonSize(parsed) : 0;
  const totalOutput = outputText.length;
  const savings = totalOriginal > 0 ? Math.round((1 - totalOutput / totalOriginal) * 100) : 0;

  const showCheckboxes = searchQuery.trim().length > 0 || selected.size > 0;

  const ph = 'flex items-center gap-2 px-2 py-1 bg-card border-b border-border flex-shrink-0';
  const pl = 'text-[10px] text-muted-foreground uppercase tracking-wider';
  const sb = (k: SortKey) => `hover:text-foreground text-[10px] ${sortKey === k ? 'text-foreground' : 'text-muted-foreground'}`;
  const fb = (t: string) => `text-[10px] px-1.5 py-0.5 rounded ${filterType === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card border-b border-border flex-shrink-0">
        <FileJson size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">JSON Data Truncator</span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">Samples:</span>
        <button onClick={() => handleLoadSample('message')} disabled={loadingSample}
          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40">
          message-data.json
        </button>
        <button onClick={() => handleLoadSample('large')} disabled={loadingSample}
          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40">
          large-tool-sample.json
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Input */}
        <div className="flex flex-col w-[30%] min-w-0 border-r border-border">
          <div className={ph}>
            <span className={pl}>Input JSON</span>
            <div className="flex-1" />
            {inputText && (
              <button onClick={() => { setInputText(''); handleParse(''); }}
                className="text-[10px] text-muted-foreground hover:text-foreground">
                clear
              </button>
            )}
          </div>
          <textarea
            className="flex-1 resize-none bg-background text-foreground font-mono text-[11px] px-2 py-1.5 outline-none border-0 leading-relaxed placeholder:text-muted-foreground"
            placeholder="Paste JSON here…"
            value={inputText}
            onChange={e => { setInputText(e.target.value); handleParse(e.target.value); }}
            spellCheck={false}
          />
          {parseError && (
            <div className="px-2 py-1 bg-destructive/10 border-t border-destructive/30 text-destructive text-[10px] flex items-center gap-1 flex-shrink-0">
              <AlertCircle size={10} /> {parseError}
            </div>
          )}
          {parsed && !parseError && (
            <div className="px-2 py-1 bg-card border-t border-border text-[10px] text-muted-foreground flex gap-3 flex-shrink-0">
              <span>{totalOriginal.toLocaleString()} chars</span>
              <span>{fields.length} fields</span>
            </div>
          )}
        </div>

        {/* CENTER: Field analyzer */}
        <div className="flex flex-col w-[38%] min-w-0 border-r border-border">

          {/* Auto-truncate bar */}
          <AutoTruncateBar
            enabled={autoTruncateEnabled}
            threshold={autoThreshold}
            onToggle={() => setAutoTruncateEnabled(e => !e)}
            onThresholdChange={v => { setAutoThreshold(v); setOutputEdited(false); }}
            matchCount={autoMatchCount}
          />

          {/* Search — prominent, full-width */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-card border-b border-border flex-shrink-0">
            <Search size={12} className="text-primary flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSelected(new Set()); }}
              placeholder="Search key name or path…"
              className="flex-1 bg-transparent text-[12px] text-foreground font-mono placeholder:text-muted-foreground outline-none"
              spellCheck={false}
            />
            {searchQuery ? (
              <>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
                  {displayFields.length} match{displayFields.length !== 1 ? 'es' : ''}
                </span>
                <button onClick={() => { setSearchQuery(''); setSelected(new Set()); }}>
                  <X size={11} className="text-muted-foreground hover:text-foreground" />
                </button>
              </>
            ) : null}
          </div>

          {/* Filter bar */}
          <div className={`${ph} flex-wrap gap-y-1`}>
            <span className={pl}>Fields</span>
            <div className="flex-1" />
            {(['all', 'string', 'array', 'object'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={fb(t)}>{t}</button>
            ))}
            <span className="text-border">|</span>
            <span className="text-[10px] text-muted-foreground">min:</span>
            <input
              type="number" value={minSize} min={0}
              onChange={e => setMinSize(parseInt(e.target.value) || 0)}
              className="w-14 bg-input border border-border rounded px-1 text-[10px] text-foreground font-mono py-0.5"
            />
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-card/60 border-b border-border flex-shrink-0 text-[10px]">
            {showCheckboxes && (
              <input
                type="checkbox"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={handleSelectAll}
                className="flex-shrink-0 accent-primary cursor-pointer"
                title={allChecked ? 'Deselect all' : 'Select all strings in view'}
              />
            )}
            <span className="w-[11px] flex-shrink-0" />
            <span className="w-12 flex-shrink-0" />
            <button onClick={() => toggleSort('size')} className={`w-14 text-right flex-shrink-0 ${sb('size')}`}>
              size {sortKey === 'size' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => toggleSort('type')} className={`w-12 flex-shrink-0 ${sb('type')}`}>
              type {sortKey === 'type' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => toggleSort('path')} className={`flex-1 text-left ${sb('path')}`}>
              path {sortKey === 'path' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {displayFields.length === 0 && (
              <div className="px-3 py-8 text-center text-muted-foreground text-xs">
                {parsed
                  ? searchQuery ? `No fields match "${searchQuery}".` : 'No fields match filters.'
                  : 'Paste JSON on the left to analyze fields.'}
              </div>
            )}
            {displayFields.map(entry => (
              <TruncateRow
                key={entry.pathStr}
                entry={entry}
                maxSize={maxSize}
                opts={effectiveTruncations.get(entry.pathStr)}
                stubNote={stubs.get(entry.pathStr)}
                checked={selected.has(entry.pathStr)}
                onCheck={handleCheck}
                showCheckbox={showCheckboxes}
                searchQuery={searchQuery}
                onApply={applyRule}
                onRemove={removeRule}
                onApplyStub={applyStub}
                onRemoveStub={removeStub}
                onHighlight={handleHighlight}
              />
            ))}
          </div>

          {/* Bottom status: bulk bar OR rules summary */}
          {selected.size > 0 ? (
            <BulkApplyBar
              count={selected.size}
              onApply={handleBulkApply}
              onClear={() => setSelected(new Set())}
            />
          ) : (truncations.size > 0 || stubs.size > 0 || autoTruncateEnabled) ? (
            <div className="px-2 py-1 border-t border-border bg-card flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {autoTruncateEnabled && autoMatchCount > 0 && (
                  <span className="text-primary mr-1.5"><Zap size={9} className="inline mr-0.5" />{autoMatchCount} auto</span>
                )}
                {truncations.size > 0 && `${truncations.size} manual`}
                {truncations.size > 0 && stubs.size > 0 && ' · '}
                {stubs.size > 0 && `${stubs.size} stubbed`}
              </span>
              <div className="flex-1" />
              <button onClick={handleReset}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw size={9} /> Reset manual
              </button>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className={ph}>
            <span className={pl}>Result</span>
            <div className="flex-1" />
            {totalOriginal > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {totalOutput.toLocaleString()} chars
                {savings > 0 && <span className="text-success ml-1">−{savings}%</span>}
              </span>
            )}
            {outputEdited && <span className="text-[10px] text-warning">manually edited</span>}
            {highlightedOffset >= 0 && (
              <span className="text-[10px] text-primary flex items-center gap-0.5">
                <Search size={9} /> jumped to field
              </span>
            )}
            <button
              onClick={handleCopy} disabled={!outputText}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40"
            >
              {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            ref={outputRef}
            className="flex-1 resize-none bg-background text-foreground font-mono text-[11px] px-2 py-1.5 outline-none border-0 leading-relaxed placeholder:text-muted-foreground"
            value={outputText}
            onChange={e => { setOutputText(e.target.value); setOutputEdited(true); setHighlightedOffset(-1); }}
            spellCheck={false}
            placeholder="Result will appear here…"
          />
        </div>
      </div>
    </div>
  );
}

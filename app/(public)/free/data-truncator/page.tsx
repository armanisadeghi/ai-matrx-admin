'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, ChevronRight, ChevronDown, Scissors, RefreshCw, AlertCircle, Check, FileJson, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface FieldEntry {
  path: string[];
  pathStr: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJsonSize(val: JsonValue): number {
  return JSON.stringify(val).length;
}

function collectFields(val: JsonValue, path: string[] = []): FieldEntry[] {
  const entries: FieldEntry[] = [];

  if (typeof val === 'string') {
    entries.push({ path, pathStr: formatPath(path), type: 'string', size: val.length, charCount: val.length, value: val });
  } else if (Array.isArray(val)) {
    const charCount = getJsonSize(val);
    if (charCount > 100) {
      entries.push({ path, pathStr: formatPath(path), type: 'array', size: val.length, charCount, value: val });
    }
    val.forEach((item, i) => entries.push(...collectFields(item, [...path, String(i)])));
  } else if (val !== null && typeof val === 'object') {
    const charCount = getJsonSize(val);
    if (path.length > 0 && charCount > 100) {
      entries.push({ path, pathStr: formatPath(path), type: 'object', size: Object.keys(val).length, charCount, value: val });
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

function formatSize(entry: FieldEntry): string {
  if (entry.type === 'string') return `${entry.size.toLocaleString()} chars`;
  if (entry.type === 'array') return `${entry.size} items · ${entry.charCount.toLocaleString()} chars`;
  return `${entry.size} keys · ${entry.charCount.toLocaleString()} chars`;
}

function applyTruncation(val: JsonValue, truncations: Map<string, TruncateOpts>, path: string[] = []): JsonValue {
  const pathStr = formatPath(path);
  const opts = truncations.get(pathStr);

  if (typeof val === 'string') {
    if (opts && val.length > opts.leadChars + opts.tailChars) {
      return val.slice(0, opts.leadChars) + opts.replacement + val.slice(val.length - opts.tailChars);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item, i) => applyTruncation(item, truncations, [...path, String(i)]));
  }
  if (val !== null && typeof val === 'object') {
    const result: { [k: string]: JsonValue } = {};
    for (const key of Object.keys(val)) {
      result[key] = applyTruncation((val as { [k: string]: JsonValue })[key], truncations, [...path, key]);
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
    <div className="h-1 w-16 bg-muted rounded-full overflow-hidden flex-shrink-0">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

interface TruncateRowProps {
  entry: FieldEntry;
  maxSize: number;
  opts: TruncateOpts | undefined;
  onApply: (pathStr: string, opts: TruncateOpts) => void;
  onRemove: (pathStr: string) => void;
}

function TruncateRow({ entry, maxSize, opts, onApply, onRemove }: TruncateRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState<TruncateOpts>(opts ?? DEFAULT_OPTS);
  const active = !!opts;
  const canTruncate = entry.type === 'string';

  useEffect(() => { if (opts) setLocal(opts); }, [opts]);

  const typeBadge =
    entry.type === 'string' ? 'bg-primary/15 text-primary' :
    entry.type === 'array'  ? 'bg-secondary/15 text-secondary' :
                              'bg-muted text-muted-foreground';

  return (
    <div className={`border-b border-border ${active ? 'bg-accent/40' : ''}`}>
      <div
        className="flex items-center gap-2 px-2 py-1 hover:bg-accent/30 cursor-pointer select-none text-xs"
        onClick={() => canTruncate && setExpanded(e => !e)}
      >
        {canTruncate ? (
          expanded
            ? <ChevronDown size={11} className="text-muted-foreground flex-shrink-0" />
            : <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <span className="w-[11px] flex-shrink-0" />
        )}

        <SizeBar size={entry.charCount} max={maxSize} />

        <span className="text-muted-foreground w-16 flex-shrink-0 text-right font-mono">
          {entry.charCount.toLocaleString()}
        </span>

        <span className={`px-1 py-0.5 rounded text-[10px] flex-shrink-0 font-mono ${typeBadge}`}>
          {entry.type}
        </span>

        <span className="font-mono text-foreground truncate flex-1 min-w-0" title={entry.pathStr}>
          {entry.pathStr}
        </span>

        {active && (
          <span className="text-success flex-shrink-0 flex items-center gap-1 text-[10px]">
            <Scissors size={10} /> truncated
          </span>
        )}
      </div>

      {expanded && canTruncate && (
        <div className="px-6 py-2 bg-card border-t border-border flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Lead chars</label>
            <input
              type="number"
              min={0}
              max={500}
              value={local.leadChars}
              onChange={e => setLocal(l => ({ ...l, leadChars: parseInt(e.target.value) || 0 }))}
              className="w-16 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tail chars</label>
            <input
              type="number"
              min={0}
              max={500}
              value={local.tailChars}
              onChange={e => setLocal(l => ({ ...l, tailChars: parseInt(e.target.value) || 0 }))}
              className="w-16 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Replacement text</label>
            <input
              type="text"
              value={local.replacement}
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
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = 'size' | 'path' | 'type';

export default function DataTruncatorPage() {
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<JsonValue | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldEntry[]>([]);
  const [truncations, setTruncations] = useState<Map<string, TruncateOpts>>(new Map());
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'string' | 'array' | 'object'>('all');
  const [minSize, setMinSize] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);
  const [outputEdited, setOutputEdited] = useState(false);

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
      setOutputText(JSON.stringify(val, null, 2));
      setOutputEdited(false);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
      setParsed(null); setFields([]);
    }
  }, []);

  useEffect(() => {
    if (!parsed || outputEdited) return;
    setOutputText(JSON.stringify(applyTruncation(parsed, truncations), null, 2));
  }, [truncations, parsed, outputEdited]);

  const applyRule = useCallback((pathStr: string, opts: TruncateOpts) => {
    setOutputEdited(false);
    setTruncations(prev => new Map(prev).set(pathStr, opts));
  }, []);

  const removeRule = useCallback((pathStr: string) => {
    setOutputEdited(false);
    setTruncations(prev => { const m = new Map(prev); m.delete(pathStr); return m; });
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [outputText]);

  const handleReset = useCallback(() => { setTruncations(new Map()); setOutputEdited(false); }, []);

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

  const displayFields = (() => {
    let list = fields.filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false;
      if (f.charCount < minSize) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      let cmp = sortKey === 'size' ? a.charCount - b.charCount
               : sortKey === 'path' ? a.pathStr.localeCompare(b.pathStr)
               : a.type.localeCompare(b.type);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  })();

  const maxSize = fields.length > 0 ? Math.max(...fields.map(f => f.charCount)) : 1;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totalOriginal = parsed ? getJsonSize(parsed) : 0;
  const totalOutput = outputText.length;
  const savings = totalOriginal > 0 ? Math.round((1 - totalOutput / totalOriginal) * 100) : 0;

  const panelHeader = 'flex items-center gap-2 px-2 py-1 bg-card border-b border-border flex-shrink-0';
  const panelLabel = 'text-[10px] text-muted-foreground uppercase tracking-wider';
  const sortBtn = (k: SortKey) =>
    `hover:text-foreground text-[10px] ${sortKey === k ? 'text-foreground' : 'text-muted-foreground'}`;
  const filterBtn = (t: string) =>
    `text-[10px] px-1.5 py-0.5 rounded ${filterType === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card border-b border-border flex-shrink-0">
        <FileJson size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">JSON Data Truncator</span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">Samples:</span>
        <button
          onClick={() => handleLoadSample('message')}
          disabled={loadingSample}
          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40"
        >
          message-data.json
        </button>
        <button
          onClick={() => handleLoadSample('large')}
          disabled={loadingSample}
          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40"
        >
          large-tool-sample.json
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Input */}
        <div className="flex flex-col w-[30%] min-w-0 border-r border-border">
          <div className={panelHeader}>
            <span className={panelLabel}>Input JSON</span>
            <div className="flex-1" />
            {inputText && (
              <button
                onClick={() => { setInputText(''); handleParse(''); }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                clear
              </button>
            )}
          </div>
          <textarea
            className="flex-1 resize-none bg-background text-foreground font-mono text-[11px] px-2 py-1.5 outline-none border-0 leading-relaxed placeholder:text-muted-foreground"
            placeholder="Paste JSON here..."
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
          <div className={`${panelHeader} flex-wrap gap-y-1`}>
            <span className={panelLabel}>Fields</span>
            <div className="flex-1" />
            {(['all', 'string', 'array', 'object'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={filterBtn(t)}>{t}</button>
            ))}
            <span className="text-border">|</span>
            <span className="text-[10px] text-muted-foreground">min:</span>
            <input
              type="number"
              value={minSize}
              min={0}
              onChange={e => setMinSize(parseInt(e.target.value) || 0)}
              className="w-14 bg-input border border-border rounded px-1 text-[10px] text-foreground font-mono py-0.5"
            />
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 py-0.5 bg-card/50 border-b border-border flex-shrink-0 text-[10px] text-muted-foreground">
            <span className="w-[11px] flex-shrink-0" />
            <span className="w-16 flex-shrink-0" />
            <button onClick={() => toggleSort('size')} className={`w-16 text-right flex-shrink-0 ${sortBtn('size')}`}>
              size {sortKey === 'size' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => toggleSort('type')} className={`w-12 flex-shrink-0 ${sortBtn('type')}`}>
              type {sortKey === 'type' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => toggleSort('path')} className={`flex-1 text-left ${sortBtn('path')}`}>
              path {sortKey === 'path' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {displayFields.length === 0 && (
              <div className="px-3 py-8 text-center text-muted-foreground text-xs">
                {parsed ? 'No fields match filters.' : 'Parse JSON to analyze fields.'}
              </div>
            )}
            {displayFields.map(entry => (
              <TruncateRow
                key={entry.pathStr}
                entry={entry}
                maxSize={maxSize}
                opts={truncations.get(entry.pathStr)}
                onApply={applyRule}
                onRemove={removeRule}
              />
            ))}
          </div>

          {truncations.size > 0 && (
            <div className="px-2 py-1 border-t border-border bg-card flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {truncations.size} rule{truncations.size !== 1 ? 's' : ''} applied
              </span>
              <div className="flex-1" />
              <button
                onClick={handleReset}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw size={9} /> Reset all
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className={panelHeader}>
            <span className={panelLabel}>Result</span>
            <div className="flex-1" />
            {totalOriginal > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {totalOutput.toLocaleString()} chars
                {savings > 0 && <span className="text-success ml-1">−{savings}%</span>}
              </span>
            )}
            {outputEdited && (
              <span className="text-[10px] text-warning">manually edited</span>
            )}
            <button
              onClick={handleCopy}
              disabled={!outputText}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-muted hover:bg-accent rounded border border-border text-foreground disabled:opacity-40"
            >
              {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            className="flex-1 resize-none bg-background text-foreground font-mono text-[11px] px-2 py-1.5 outline-none border-0 leading-relaxed placeholder:text-muted-foreground"
            value={outputText}
            onChange={e => { setOutputText(e.target.value); setOutputEdited(true); }}
            spellCheck={false}
            placeholder="Result will appear here..."
          />
        </div>
      </div>
    </div>
  );
}

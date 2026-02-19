'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Download,
    Edit3,
    FileSearch,
    FileText,
    FilePlus,
    Loader2,
    Search,
    Upload,
} from 'lucide-react';
import { ConnectionBar } from '../_lib/ConnectionBar';
import { MessageLog, ResultPanel } from '../_lib/ResultPanel';
import { useMatrxLocal } from '../_lib/useMatrxLocal';
import type { ToolResult } from '../_lib/types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function SectionHeader({ icon: Icon, title, description }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function ToolSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`border rounded-lg p-4 bg-card space-y-3 ${className}`}>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilesPage() {
    const local = useMatrxLocal();
    const { invokeTool, loading, logs, clearLogs, wsConnected, useWebSocket } = local;
    const isDisabled = (t: string) => loading === t || (useWebSocket && !wsConnected);

    const [activeResult, setActiveResult] = useState<ToolResult | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const run = async (section: string, tool: string, input: Record<string, unknown>) => {
        setActiveSection(section);
        setActiveResult(null);
        const result = await invokeTool(tool, input);
        setActiveResult(result);
    };

    // Read state
    const [readPath, setReadPath] = useState('~/.matrx/local.json');
    const [readLimit, setReadLimit] = useState('');

    // Write state
    const [writePath, setWritePath] = useState('/tmp/matrx-test.txt');
    const [writeContent, setWriteContent] = useState('Hello from Matrx Local!\n');

    // Edit state
    const [editPath, setEditPath] = useState('/tmp/matrx-test.txt');
    const [editOldText, setEditOldText] = useState('Hello');
    const [editNewText, setEditNewText] = useState('Goodbye');

    // Glob state
    const [globPattern, setGlobPattern] = useState('**/*.py');
    const [globPath, setGlobPath] = useState('.');

    // Grep state
    const [grepPattern, setGrepPattern] = useState('def ');
    const [grepPath, setGrepPath] = useState('.');
    const [grepInclude, setGrepInclude] = useState('*.py');
    const [grepMaxResults, setGrepMaxResults] = useState(20);

    // Download state
    const [downloadUrl, setDownloadUrl] = useState('https://httpbin.org/get');
    const [downloadPath, setDownloadPath] = useState('/tmp/matrx-download.json');

    // Upload state
    const [uploadPath, setUploadPath] = useState('/tmp/matrx-test.txt');
    const [uploadUrl, setUploadUrl] = useState('https://httpbin.org/put');

    const inputClass = "w-full h-8 text-xs font-mono rounded border px-2 bg-background";
    const textareaClass = "w-full text-xs font-mono rounded border px-3 py-2 bg-background resize-none";

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Link href="/demos/local-tools">
                            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                File Operations
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Read, Write, Edit, Glob, Grep, Download, Upload
                            </p>
                        </div>
                    </div>

                    <ConnectionBar hook={local} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left column */}
                        <div className="space-y-4">
                            {/* Read */}
                            <ToolSection>
                                <SectionHeader icon={FileText} title="Read" description="Read file contents from local path" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">File Path</label>
                                        <input type="text" value={readPath} onChange={e => setReadPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="~/.matrx/local.json" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Limit (lines, optional)</label>
                                        <input type="number" value={readLimit} onChange={e => setReadLimit(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="e.g. 50" />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('read', 'Read', {
                                            path: readPath,
                                            ...(readLimit ? { limit: Number(readLimit) } : {}),
                                        })}>
                                        {loading && activeSection === 'read' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        Read File
                                    </Button>
                                </div>
                            </ToolSection>

                            {/* Write */}
                            <ToolSection>
                                <SectionHeader icon={FilePlus} title="Write" description="Write/overwrite a file on the local machine" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">File Path</label>
                                        <input type="text" value={writePath} onChange={e => setWritePath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="/tmp/file.txt" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Content</label>
                                        <textarea value={writeContent} onChange={e => setWriteContent(e.target.value)}
                                            rows={4} className={textareaClass} style={{ fontSize: '16px' }} />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('write', 'Write', { path: writePath, content: writeContent })}>
                                        {loading && activeSection === 'write' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                                        Write File
                                    </Button>
                                </div>
                            </ToolSection>

                            {/* Edit */}
                            <ToolSection>
                                <SectionHeader icon={Edit3} title="Edit" description="Find-and-replace text in an existing file" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">File Path</label>
                                        <input type="text" value={editPath} onChange={e => setEditPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="/tmp/file.txt" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Find (old text)</label>
                                        <input type="text" value={editOldText} onChange={e => setEditOldText(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Replace (new text)</label>
                                        <input type="text" value={editNewText} onChange={e => setEditNewText(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('edit', 'Edit', { path: editPath, old_text: editOldText, new_text: editNewText })}>
                                        {loading && activeSection === 'edit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                                        Edit File
                                    </Button>
                                </div>
                            </ToolSection>
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                            {/* Glob */}
                            <ToolSection>
                                <SectionHeader icon={FileSearch} title="Glob" description="Find files matching a glob pattern" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Pattern</label>
                                        <input type="text" value={globPattern} onChange={e => setGlobPattern(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="**/*.py" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Search Path (optional)</label>
                                        <input type="text" value={globPath} onChange={e => setGlobPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="." />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('glob', 'Glob', { pattern: globPattern, path: globPath || undefined })}>
                                        {loading && activeSection === 'glob' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />}
                                        Find Files
                                    </Button>
                                </div>
                            </ToolSection>

                            {/* Grep */}
                            <ToolSection>
                                <SectionHeader icon={Search} title="Grep" description="Search file contents with regex" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Pattern (regex)</label>
                                        <input type="text" value={grepPattern} onChange={e => setGrepPattern(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="def " />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Path</label>
                                        <input type="text" value={grepPath} onChange={e => setGrepPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="." />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-muted-foreground">Include filter</label>
                                            <input type="text" value={grepInclude} onChange={e => setGrepInclude(e.target.value)}
                                                className={inputClass} style={{ fontSize: '16px' }} placeholder="*.py" />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-muted-foreground">Max results</label>
                                            <input type="number" value={grepMaxResults} onChange={e => setGrepMaxResults(Number(e.target.value))}
                                                className={inputClass} style={{ fontSize: '16px' }} />
                                        </div>
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('grep', 'Grep', {
                                            pattern: grepPattern,
                                            path: grepPath,
                                            ...(grepInclude ? { include: grepInclude } : {}),
                                            max_results: grepMaxResults,
                                        })}>
                                        {loading && activeSection === 'grep' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        Search
                                    </Button>
                                </div>
                            </ToolSection>

                            {/* Download */}
                            <ToolSection>
                                <SectionHeader icon={Download} title="Download File" description="Download a URL to a local path" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">URL</label>
                                        <input type="text" value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="https://example.com/file.pdf" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Local Save Path</label>
                                        <input type="text" value={downloadPath} onChange={e => setDownloadPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="/tmp/file.pdf" />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('download', 'DownloadFile', { url: downloadUrl, path: downloadPath })}>
                                        {loading && activeSection === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        Download
                                    </Button>
                                </div>
                            </ToolSection>

                            {/* Upload */}
                            <ToolSection>
                                <SectionHeader icon={Upload} title="Upload File" description="Upload a local file to a URL" />
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Local File Path</label>
                                        <input type="text" value={uploadPath} onChange={e => setUploadPath(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="/tmp/file.txt" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Target URL</label>
                                        <input type="text" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                                            className={inputClass} style={{ fontSize: '16px' }} placeholder="https://example.com/upload" />
                                    </div>
                                    <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                        onClick={() => run('upload', 'UploadFile', { path: uploadPath, url: uploadUrl })}>
                                        {loading && activeSection === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        Upload
                                    </Button>
                                </div>
                            </ToolSection>
                        </div>
                    </div>

                    {/* Result + Log */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ResultPanel
                            result={activeResult}
                            loading={!!loading}
                            title={activeSection ? `Result — ${activeSection}` : 'Result'}
                        />
                        <MessageLog logs={logs} onClear={clearLogs} />
                    </div>
                </div>
            </div>
        </div>
    );
}

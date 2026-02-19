'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Bell,
    Camera,
    Clipboard,
    ClipboardPaste,
    ExternalLink,
    FolderOpen,
    Loader2,
    Monitor,
} from 'lucide-react';
import { ConnectionBar } from '../_lib/ConnectionBar';
import { MessageLog, ResultPanel } from '../_lib/ResultPanel';
import { useMatrxLocal } from '../_lib/useMatrxLocal';
import type { ToolResult } from '../_lib/types';

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

export default function SystemPage() {
    const local = useMatrxLocal();
    const { invokeTool, loading, logs, clearLogs } = local;

    const [activeResult, setActiveResult] = useState<ToolResult | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [screenshotImage, setScreenshotImage] = useState<{ media_type: string; base64_data: string } | null>(null);

    // Directory
    const [dirPath, setDirPath] = useState('~');
    const [dirShowHidden, setDirShowHidden] = useState(false);

    // Clipboard
    const [clipboardText, setClipboardText] = useState('Hello from Matrx!');
    const [clipboardReadResult, setClipboardReadResult] = useState<string | null>(null);

    // Notify
    const [notifyTitle, setNotifyTitle] = useState('Matrx Local');
    const [notifyMessage, setNotifyMessage] = useState('Test notification from the web app!');

    // OpenUrl / OpenPath
    const [openUrl, setOpenUrl] = useState('https://aimatrx.com');
    const [openPath, setOpenPath] = useState('~');

    const run = async (section: string, tool: string, input: Record<string, unknown>) => {
        setActiveSection(section);
        setActiveResult(null);
        setScreenshotImage(null);
        const result = await invokeTool(tool, input);
        setActiveResult(result);
        if (tool === 'Screenshot' && result.image) {
            setScreenshotImage(result.image);
        }
        if (tool === 'ClipboardRead' && result.type === 'success') {
            setClipboardReadResult(result.output);
        }
    };

    const inputClass = "w-full h-8 text-xs font-mono rounded border px-2 bg-background";
    const cardClass = "border rounded-lg p-4 bg-card space-y-3";

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
                                <Monitor className="w-5 h-5" />
                                System Tools
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                SystemInfo, Screenshot, Directory, Clipboard, Notify, Open
                            </p>
                        </div>
                    </div>

                    <ConnectionBar hook={local} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* System Info */}
                        <div className={cardClass}>
                            <SectionHeader icon={Monitor} title="System Info" description="OS, CPU, memory, disk, Python version" />
                            <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                onClick={() => run('sysinfo', 'SystemInfo', {})}>
                                {loading && activeSection === 'sysinfo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Monitor className="w-3.5 h-3.5" />}
                                Get System Info
                            </Button>
                        </div>

                        {/* Screenshot */}
                        <div className={cardClass}>
                            <SectionHeader icon={Camera} title="Screenshot" description="Capture the user's screen, returns base64 PNG" />
                            <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                onClick={() => run('screenshot', 'Screenshot', {})}>
                                {loading && activeSection === 'screenshot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                Capture Screen
                            </Button>
                            {screenshotImage && (
                                <div className="mt-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`data:${screenshotImage.media_type};base64,${screenshotImage.base64_data}`}
                                        alt="Screenshot"
                                        className="w-full rounded border"
                                    />
                                </div>
                            )}
                        </div>

                        {/* List Directory */}
                        <div className={cardClass}>
                            <SectionHeader icon={FolderOpen} title="List Directory" description="List files and folders at a path" />
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">Path</label>
                                    <input type="text" value={dirPath} onChange={e => setDirPath(e.target.value)}
                                        className={inputClass} style={{ fontSize: '16px' }} placeholder="~" />
                                </div>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                    <input type="checkbox" checked={dirShowHidden} onChange={e => setDirShowHidden(e.target.checked)} className="rounded" />
                                    Show hidden files
                                </label>
                                <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                    onClick={() => run('listdir', 'ListDirectory', { path: dirPath, show_hidden: dirShowHidden })}>
                                    {loading && activeSection === 'listdir' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                                    List Directory
                                </Button>
                            </div>
                        </div>

                        {/* Clipboard */}
                        <div className={cardClass}>
                            <SectionHeader icon={Clipboard} title="Clipboard" description="Read from or write to the system clipboard" />
                            <div className="space-y-2">
                                {/* Read */}
                                <Button size="sm" variant="outline" disabled={!!loading} className="w-full gap-1.5"
                                    onClick={() => run('clipboard-read', 'ClipboardRead', {})}>
                                    {loading && activeSection === 'clipboard-read' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                                    Read Clipboard
                                </Button>
                                {clipboardReadResult && (
                                    <div className="text-xs bg-muted/30 rounded p-2 font-mono break-all max-h-20 overflow-y-auto">
                                        {clipboardReadResult}
                                    </div>
                                )}

                                {/* Write */}
                                <div>
                                    <label className="text-xs text-muted-foreground">Text to write</label>
                                    <input type="text" value={clipboardText} onChange={e => setClipboardText(e.target.value)}
                                        className={inputClass} style={{ fontSize: '16px' }} />
                                </div>
                                <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                    onClick={() => run('clipboard-write', 'ClipboardWrite', { text: clipboardText })}>
                                    {loading && activeSection === 'clipboard-write' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                                    Write to Clipboard
                                </Button>
                            </div>
                        </div>

                        {/* Notify */}
                        <div className={cardClass}>
                            <SectionHeader icon={Bell} title="Notify" description="Send a native OS desktop notification" />
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">Title</label>
                                    <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                                        className={inputClass} style={{ fontSize: '16px' }} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Message</label>
                                    <input type="text" value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)}
                                        className={inputClass} style={{ fontSize: '16px' }} />
                                </div>
                                <Button size="sm" disabled={!!loading} className="w-full gap-1.5"
                                    onClick={() => run('notify', 'Notify', { title: notifyTitle, message: notifyMessage })}>
                                    {loading && activeSection === 'notify' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                                    Send Notification
                                </Button>
                            </div>
                        </div>

                        {/* Open URL / Path */}
                        <div className={cardClass}>
                            <SectionHeader icon={ExternalLink} title="Open URL / Path" description="Open a URL in browser or a path in OS default app" />
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground">URL</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={openUrl} onChange={e => setOpenUrl(e.target.value)}
                                            className={`${inputClass} flex-1`} style={{ fontSize: '16px' }} placeholder="https://example.com" />
                                        <Button size="sm" disabled={!!loading} className="gap-1 shrink-0"
                                            onClick={() => run('openurl', 'OpenUrl', { url: openUrl })}>
                                            {loading && activeSection === 'openurl' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                                            Open
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">File / Folder Path</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={openPath} onChange={e => setOpenPath(e.target.value)}
                                            className={`${inputClass} flex-1`} style={{ fontSize: '16px' }} placeholder="~/Documents" />
                                        <Button size="sm" disabled={!!loading} variant="outline" className="gap-1 shrink-0"
                                            onClick={() => run('openpath', 'OpenPath', { path: openPath })}>
                                            {loading && activeSection === 'openpath' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
                                            Open
                                        </Button>
                                    </div>
                                </div>
                            </div>
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

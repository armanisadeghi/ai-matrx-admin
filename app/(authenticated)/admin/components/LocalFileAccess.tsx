'use client';

import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui";
import {RefreshCcw} from "lucide-react";
import {motion, AnimatePresence} from "motion/react";
import FullEditableJsonViewer from "@/components/ui/JsonComponents/JsonEditor";
import MatrxSelect from "@/components/matrx/MatrxSelect";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {generateDirectoryStructure} from "@/actions/directory.actions";
import {DirectoryTreeConfig} from "@/components/DirectoryTree/config";
import {DirectoryTree} from "@/components/DirectoryTree/DirectoryTree";
import {DirectoryType, fileHelpers} from "@/utils/fileSystemUtil";
import {FileContentResult, getFileType, loadFileContent} from "@/utils/fileContentHandlers";
import {FileViewer} from "@/app/(authenticated)/admin/components/FileViewer";
import {FileOperationsToolbar} from "@/app/(authenticated)/admin/components/FileOperationsToolbar";
import {FileDetailsPanel} from "@/app/(authenticated)/admin/components/FileDetailsPanel";


// https://claude.ai/chat/984ee21f-6116-44d5-b8fa-fe8ca49547bc

// Main component
const directoryOptions = [
    {value: 'project', label: 'Project Root'},
    {value: 'current', label: 'Current Directory'}
];

// Directory tree configuration
const treeConfig: DirectoryTreeConfig = {
    excludeFiles: [
        '*.log',
        'package-lock.json',
        'yarn.lock',
        '*.map'
    ],
    excludeDirs: [
        'node_modules',
        '.git',
        '.next',
        'coverage'
    ],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true
};

interface SelectedFile {
    name: string;
    type: string;
    size: number;
    modified: string;
    path: string;
}

interface FileState {
    content: string | FileContentResult | null;
    secondaryContent: string;
    selectedFile: SelectedFile | null;
}


const LocalFileAccess = () => {
    const [selectedDirectory, setSelectedDirectory] = useState<string>('project');
    const [directoryStructure, setDirectoryStructure] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileState, setFileState] = useState<FileState>({
        content: null,
        secondaryContent: '',
        selectedFile: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);


    const loadDirectoryStructure = async (forceRefresh: boolean = false) => {
        setLoading(true);
        setError(null);

        try {
            const result = await generateDirectoryStructure(
                selectedDirectory as 'project' | 'current',
                forceRefresh
            );

            if (result.success && result.structure) {
                setDirectoryStructure(result.structure);
                setLastUpdate(result.timestamp ? new Date(result.timestamp) : new Date());
            } else {
                setError(result.error || 'Failed to load directory structure');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDirectoryStructure();
    }, [selectedDirectory]);

    const handleFileSelect = async (path: string) => {
        setLoading(true);
        try {
            const parts = path.split('/');
            const filename = parts.pop() || '';
            const dirPath = parts;

            const stats = await fileHelpers.stats.get(filename, {
                type: selectedDirectory as DirectoryType,
                path: dirPath
            });

            const selectedFile = {
                name: filename,
                type: getFileType(filename),
                size: stats.size,
                modified: stats.mtime.toLocaleString(),
                path
            };

            const content = await loadFileContent(
                dirPath,
                filename,
                selectedDirectory as 'app' | 'public' | 'custom'
            );

            setFileState(prev => ({
                selectedFile,
                content: content.viewerType === 'json' ? content.content : content,
                secondaryContent: content.viewerType === 'json' ? prev.secondaryContent : ''
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading file');
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        const {content, secondaryContent} = fileState;

        return (
            <div className="space-y-4">
                {content && (
                    typeof content === 'object' && 'viewerType' in content ? (
                        <FileViewer
                            fileContent={content}
                            onContentChange={(newContent: FileContentResult) =>
                                setFileState(prev => ({
                                    ...prev,
                                    content: newContent
                                }))
                            }
                            title="File Content"
                        />
                    ) : (
                        <Card>
                            <CardContent className="p-4">
                                <FullEditableJsonViewer
                                    title="JSON Editor"
                                    data={content}
                                    initialExpanded={true}
                                    defaultEnhancedMode={true}
                                    onChange={(newContent: string) =>
                                        setFileState(prev => ({
                                            ...prev,
                                            content: newContent
                                        }))
                                    }
                                />
                            </CardContent>
                        </Card>
                    )
                )}

                <Card>
                    <CardContent className="p-4">
                        <FullEditableJsonViewer
                            title="Secondary Editor"
                            data={secondaryContent}
                            initialExpanded={true}
                            defaultEnhancedMode={true}
                            onChange={(newContent: string) =>
                                setFileState(prev => ({
                                    ...prev,
                                    secondaryContent: newContent
                                }))
                            }
                        />
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <motion.h1
                        initial={{opacity: 0, y: -20}}
                        animate={{opacity: 1, y: 0}}
                        className="text-2xl font-bold text-foreground"
                    >
                        File System Management
                    </motion.h1>
                    <div className="flex items-center gap-4">
                        {lastUpdate && (
                            <span className="text-sm text-muted-foreground">
                                Last updated: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => loadDirectoryStructure(true)}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="w-64">
                    <MatrxSelect
                        label="Directory Scope"
                        options={directoryOptions}
                        value={selectedDirectory}
                        onChange={(value) => setSelectedDirectory(value)}
                        placeholder="Select directory scope"
                    />
                </div>

                <FileOperationsToolbar
                    selectedFile={selectedFile}
                    onNew={() => {/* implement */
                    }}
                    onUpload={() => {/* implement */
                    }}
                    onDownload={() => {/* implement */
                    }}
                    onDelete={() => {/* implement */
                    }}
                />

                <div className="grid grid-cols-12 gap-6">
                    <motion.div
                        initial={{opacity: 0, x: -20}}
                        animate={{opacity: 1, x: 0}}
                        className="col-span-3"
                    >
                        <DirectoryTree
                            structure={directoryStructure}
                            onSelect={handleFileSelect}
                            config={treeConfig}
                            title="Project Files"
                        />
                    </motion.div>

                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        className="col-span-6"
                    >
                        {renderContent()}
                    </motion.div>

                    <motion.div
                        initial={{opacity: 0, x: 20}}
                        animate={{opacity: 1, x: 0}}
                        className="col-span-3"
                    >
                        <FileDetailsPanel file={fileState.selectedFile}/>
                    </motion.div>
                </div>


                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
                        >
                            <Card>
                                <CardContent className="p-4">Loading...</CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{opacity: 0, y: 50}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: 50}}
                            className="fixed bottom-4 right-4"
                        >
                            <Card className="border-destructive">
                                <CardContent className="p-4 text-destructive">
                                    {error}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
export default LocalFileAccess;

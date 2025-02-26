"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionIcon, AddFileFolder, buildTree, CodeEditor, FileTree, Footer } from "../../components";
import { IRepoData } from "../../types";
import {
    analyzeRepo,
    CodeAnalyzer,
    deleteGitHubRepo,
    getIconFromExtension,
    indexedDBStore,
    publishToGitHubRepo,
    updateGitHubRepo,
} from "../../utils";
import EditorLayout from "./EditorLayout";

import { CodeDiffEditor } from "@/app/dashboard/code-editor/components/CodeEditor/DiffEditor";
import { IconColumns2 } from "@tabler/icons-react";

import "./style.css";

const store = indexedDBStore;

export type IFile = {
    path: string;
    content: string;
};

// If you want to add custom rules or languages:
const customAnalyzer = new CodeAnalyzer();

// Add a custom rule for JavaScript
customAnalyzer.addRule("JavaScript", {
    name: "noVar",
    test: (content) => /\bvar\b/.test(content),
    message: "Use 'let' or 'const' instead of 'var'",
});

// Add support for a new language
customAnalyzer.addLanguage({
    name: "Ruby",
    extensions: [".rb"],
    rules: [
        {
            name: "noSelfOutsideClass",
            test: (content) => /^self\./.test(content),
            message: "Avoid using 'self' outside of class context",
        },
    ],
});

function getLanguageFromFilePath(filePath: string): string | null {
    const extension = filePath.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "py":
            return "python";
        case "js":
            return "javascript";
        case "ts":
            return "typescript";
        case "java":
            return "java";
        case "cs":
            return "csharp";
        default:
            return null;
    }
}

export default function Page({ params }: { params: { repoName: string } }) {
    const router = useRouter();
    const { user } = useUser();
    const [selectedRepo, setSelectedRepo] = useState<IRepoData | null>(null);
    const [selectedFile, setSelectedFile] = useState<IFile | null>(null);
    const [fileSystem, setFileSystem] = useState<IFile[] | null>([]);
    const [openFiles, setOpenFiles] = useState<IFile[]>([]); // Opened files in tabs
    const [activeFile, setActiveFile] = useState<IFile | null>(null);
    const [activeFolder, setActiveFolder] = useState<string>("");
    const [isPublishing, setIsPublishing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<any>();
    const [executionResult, setExecutionResult] = useState<any>();
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionError, setExecutionError] = useState<any>(null);
    const [diffView, setDiffView] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const treeData = buildTree(selectedRepo);

    /**
     *
     * @param repoName
     * @returns
     */
    const loadProject = async (repoName?: string) => {
        if (!repoName) return;
        try {
            const loadedProject = await store.getRepository(repoName);
            setSelectedRepo(loadedProject || null);
            setSelectedFile(null);
            setActiveFolder("");

            // Load opened files
            try {
                const openedFiles = await store.getOpenedFiles(repoName);
                const loadedOpenFiles = await Promise.all(
                    openedFiles.map(async (file) => {
                        try {
                            const fileData = await store.getFile(repoName, file.path);
                            return fileData ? { path: fileData.path, content: atob(fileData.content) } : null;
                        } catch (error) {
                            console.error(`Error loading file ${file.path}:`, error);
                            return null;
                        }
                    }),
                );
                setOpenFiles(loadedOpenFiles.filter((file): file is IFile => file !== null));
                setActiveFile(loadedOpenFiles.filter((file): file is IFile => file !== null)[0]);
                setSelectedFile(loadedOpenFiles.filter((file): file is IFile => file !== null)[0]);
            } catch (error) {
                console.error("Error loading opened files:", error);
                setOpenFiles([]);
            }
        } catch (error) {
            console.error("Error loading project:", error);
        }
    };

    /**
     *
     * @param path
     */
    const handleFileSelect = async (path: string) => {
        if (selectedRepo) {
            try {
                const file = await store.getFile(selectedRepo.name, path);
                if (file) {
                    const decodedFile = { path: file.path, content: atob(file.content) };
                    setSelectedFile(decodedFile);
                    const fileAlreadyOpen = openFiles.find((openFile) => openFile.path === path);
                    if (!fileAlreadyOpen) {
                        const newOpenFiles = [...openFiles, decodedFile];
                        setOpenFiles(newOpenFiles);
                        try {
                            await store.saveOpenedFiles(
                                selectedRepo.name,
                                newOpenFiles.map((f) => ({ repoName: selectedRepo.name, path: f.path })),
                            );
                        } catch (error) {
                            console.error("Error saving opened files:", error);
                        }
                    }
                    setActiveFile(decodedFile);
                }
            } catch (error) {
                console.error("Error loading file:", error);
            }
        }
    };

    /**
     *
     * @param path
     */
    const handleFolderSelect = (path: string) => {
        setActiveFolder(path);
    };

    //
    /**
     * Handle closing a tab
     * @param fileToClose
     */
    const handleCloseTab = async (fileToClose: IFile) => {
        const newOpenFiles = openFiles.filter((openFile) => openFile.path !== fileToClose.path);
        setOpenFiles(newOpenFiles);
        if (selectedRepo) {
            await store.saveOpenedFiles(
                selectedRepo.name,
                newOpenFiles.map((f) => ({ repoName: selectedRepo.name, path: f.path })),
            );
        }
        if (activeFile && activeFile.path === fileToClose.path) {
            const newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[0] : null;
            setSelectedFile(newActiveFile);
            setActiveFile(newActiveFile);
        }
    };

    /**
     *
     */
    const handleEditorChange = (newValue: string) => {
        if (selectedFile) {
            const updatedFile = { ...selectedFile, content: newValue };
            setSelectedFile(updatedFile);
            setActiveFile(updatedFile);
            setOpenFiles(openFiles.map((file) => (file.path === updatedFile.path ? updatedFile : file)));
            setFileSystem((prevFileSystem) =>
                prevFileSystem
                    ? prevFileSystem.map((file) => (file.path === updatedFile.path ? updatedFile : file))
                    : null,
            );
        }
    };

    /**
     *
     */
    const handleRepoClose = () => {
        if (!confirm(`Are you sure you want to proceed closing this '${selectedRepo.name}' repository?`)) {
            return;
        }
        try {
            setSelectedRepo(null);
            setSelectedFile(null);
            setActiveFolder("");
            router.push(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/code-editor`);
        } catch (error) {
            console.error("Error closing repository:", error);
        }
    };

    /**
     *
     * @param path
     * @param isFile
     */
    const handleAddFolderFile = async (path: string, isFile: boolean) => {
        if (selectedRepo) {
            await loadProject(selectedRepo.name);
            if (isFile) {
                await handleFileSelect(path);
            }
        }
    };

    /**
     * Publish local repo to GitHub
     * @returns
     */
    const handlePushToGitHub = async (privacy?: boolean) => {
        if (!selectedRepo || !fileSystem || !user) return;

        if (!confirm(`Are you sure you want to proceed pushing this '${selectedRepo.name}' repository to GitHub?`)) {
            return;
        }

        setIsPublishing(true);

        const REPO_NAME = selectedRepo.name; // Name of the repository to create
        const REPO_DESC = selectedRepo.description; // Name of the repository to create
        const REPO_IS_PUBLISHED = selectedRepo?.githubUrl;

        try {
            if (REPO_IS_PUBLISHED) {
                await updateGitHubRepo(REPO_NAME);
            } else {
                await publishToGitHubRepo(REPO_NAME, REPO_DESC, privacy);
            }

            alert("Repository created and pushed to GitHub successfully!");
            setIsPublishing(false);
        } catch (error) {
            console.error("Error pushing to GitHub:", error);
            alert("Failed to push project to GitHub.");

            setIsPublishing(false);
        }
    };

    /**
     * delete repo from github
     * @returns
     */
    const handleDeleteFromGitHub = async () => {
        if (!selectedRepo || !fileSystem || !user) return;

        if (!confirm(`Are you sure you want to proceed deleting this '${selectedRepo.name}' repository from GitHub?`)) {
            return;
        }

        setIsPublishing(true);

        const REPO_NAME = selectedRepo.name; // Name of the repository to create

        try {
            await deleteGitHubRepo(REPO_NAME);

            setIsPublishing(false);
        } catch (error) {
            console.error("Error deleting to GitHub:", error);
            alert("Failed to delete project from GitHub.");

            setIsPublishing(false);
        }
    };

    /**
     * analyze code
     */
    const handleAnalyzeCode = async () => {
        if (selectedRepo) {
            try {
                const results = await analyzeRepo(selectedRepo.name);
                console.log("Analysis complete:", results);
                // Update your UI with the results
                // For example:
                setAnalysisResults(results);
            } catch (error) {
                console.error("Failed to analyze repository:", error);
                // Handle the error in your UI
            }
        }
    };

    /**
     * execute code
     */
    const handleRunCode = async () => {
        if (!selectedFile) {
            setExecutionError("No file selected");
            return;
        }

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionResult(null);

        try {
            const response = await fetch("https://dz3ft52mmw.us-east-1.awsapprunner.com/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: getLanguageFromFilePath(selectedFile.path),
                    code: selectedFile.content,
                    repoName: selectedRepo.name,
                    filePath: selectedFile.path,
                }),
            });

            if (!response.ok) {
                throw new Error("Execution failed");
            }

            const result = await response.json();
            setExecutionResult(result.output);
        } catch (error) {
            setExecutionError(error.message || "An error occurred while running the code");
        } finally {
            setIsExecuting(false);
        }
    };

    /**
     *
     * @param oldName
     * @param newName
     * @param description
     */
    const handleUpdateRepo = async (oldName: string, newName: string, description: string) => {
        if (!newName) {
            // You might want to show an error message here
            return;
        }

        try {
            setIsUpdating(true);
            await store.updateRepositoryDetails(oldName, newName, description);

            router.push(
                `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/code-editor/workspace/${encodeURIComponent(newName)}`,
            );
        } catch (error) {
            console.error("Error updating project:", error);
            alert("Error updating project:" + error);
            // You might want to show an error message to the user here
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleDiffView = () => {
        setDiffView(!diffView);
    };

    const sidebarContent = (
        <>
            <AddFileFolder
                projectName={selectedRepo?.name || ""}
                activeFolder={activeFolder}
                onAdd={handleAddFolderFile}
            />
        </>
    );

    const fileTreeContent = (
        <>
            <FileTree
                activeFolder={activeFolder}
                onFileSelect={handleFileSelect}
                onFolderSelect={handleFolderSelect}
                onUpdate={() => {
                    void loadProject(selectedRepo?.name || "");
                }}
                repoName={selectedRepo?.name || ""}
                treeData={treeData}
                selectedFile={selectedFile}
            />
        </>
    );

    console.log({ analysisResults });

    useEffect(() => {
        const fetchData = async (): Promise<void> => {
            if (params?.repoName) {
                const repoName = decodeURIComponent(params.repoName);
                void loadProject(repoName);
            }
        };

        void fetchData();

        return () => {
            //
        };
    }, [params?.repoName]);

    if (!selectedRepo) {
        return <>select a repo to proceed</>;
    }

    return (
        <EditorLayout
            selectedRepo={selectedRepo}
            onRepoClose={handleRepoClose}
            onDeleteFromGitHub={handleDeleteFromGitHub}
            onPushToGitHub={handlePushToGitHub}
            isPublishing={isPublishing}
            sidebar={sidebarContent}
            fileTree={fileTreeContent}
            onCodeAnalyze={handleAnalyzeCode}
            selectedFile={selectedFile}
            isExecuting={isExecuting}
            onRunCode={handleRunCode}
            onRepoUpdate={handleUpdateRepo}
            isUpdating={isUpdating}
        >
            {/* Editor area */}
            <div className="flex flex-col overflow-hidden py-2 pr-2 rounded">
                {/* Tabs */}
                <div className="flex px-1 mb-2 overflow-x-auto rounded justify-between">
                    <div className="flex grow gap-1">
                        {openFiles.map((file, idx) => {
                            const FileIcon = getIconFromExtension(file.path ?? "");
                            return (
                                <div
                                    key={idx}
                                    className={`px-1.5 py-0.5 text-sm rounded-md text-white cursor-pointer flex items-center gap-2 hover:bg-neutral-700 ${selectedFile?.path === file?.path ? "bg-neutral-800 font-medium" : "bg-neutral-900 font-normal"}`}
                                    onClick={() => setSelectedFile(file)}
                                >
                                    <FileIcon size={16} />
                                    <span>{file.path}</span>
                                    <ActionIcon
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleCloseTab(file);
                                        }}
                                    >
                                        &times;
                                    </ActionIcon>
                                </div>
                            );
                        })}
                    </div>
                    {selectedFile && (
                        <div className="flex">
                            <ActionIcon onClick={toggleDiffView}>
                                <IconColumns2 size={16} />
                            </ActionIcon>
                        </div>
                    )}
                </div>

                {/* Editor */}
                <div className="flex-grow overflow-hidden">
                    {selectedFile ? (
                        !diffView ? (
                            <>
                                <CodeEditor
                                    repoName={selectedRepo.name}
                                    filename={selectedFile.path}
                                    value={selectedFile.content}
                                    onChange={handleEditorChange}
                                />
                            </>
                        ) : (
                            <>
                                <CodeDiffEditor
                                    repoName={selectedRepo.name}
                                    filename={selectedFile.path}
                                    value={selectedFile.content}
                                    newValue={selectedFile.content}
                                    onChange={handleEditorChange}
                                />
                            </>
                        )
                    ) : (
                        <div className="h-full flex items-center justify-center text-white rounded">
                            Select a file to edit
                        </div>
                    )}
                </div>
            </div>
            {/* Footer */}
            <div className="overflow-auto rounded w-full">
                <Footer executionResult={executionResult} />
            </div>
        </EditorLayout>
    );
}

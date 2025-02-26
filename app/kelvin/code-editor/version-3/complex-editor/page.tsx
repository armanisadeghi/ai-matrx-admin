"use client";

import { Grid } from "@mantine/core";
import { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";

import { Editor, Folder } from "../components";
import { IFileSystemNode } from "../types";

const initialFiles: IFileSystemNode[] = [
    {
        name: "src",
        type: "folder",
        isOpen: false,
        children: [
            { name: "index.tsx", type: "file", content: "// Start coding here" },
            {
                name: "components",
                type: "folder",
                isOpen: false,
                children: [{ name: "App.tsx", type: "file", content: "const App = () => <div>Hello World!</div>" }],
            },
        ],
    },
];

export default function ComplexCodeEditorPage() {
    const [fileSystem, setFileSystem] = useState<IFileSystemNode[]>(initialFiles);
    const [activeFile, setActiveFile] = useState<IFileSystemNode | null>(null);
    const [openFiles, setOpenFiles] = useState<IFileSystemNode[]>([]); // Opened files in tabs

    // Load file system from local storage on component mount
    useEffect(() => {
        const savedFileSystem = localStorage.getItem("fileSystem");
        if (savedFileSystem) {
            setFileSystem(JSON.parse(savedFileSystem));
        }
    }, []);

    // Save file system to local storage when it changes
    useEffect(() => {
        localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
    }, [fileSystem]);

    // Handle file click (open file in a new tab if not already open)
    const handleFileClick = (file: IFileSystemNode) => {
        const fileAlreadyOpen = openFiles.find((openFile) => openFile.name === file.name);
        if (!fileAlreadyOpen) {
            setOpenFiles([...openFiles, file]);
        }
        setActiveFile(file); // Set as active file for editing
    };

    // Handle closing a tab
    const handleCloseTab = (fileToClose: IFileSystemNode) => {
        setOpenFiles(openFiles.filter((openFile) => openFile !== fileToClose));
        if (activeFile === fileToClose) {
            setActiveFile(openFiles.length > 1 ? openFiles[0] : null); // Set new active file after closing
        }
    };

    const handleEditorChange = (newValue: string) => {
        if (activeFile && activeFile.type === "file") {
            activeFile.content = newValue;
            setFileSystem([...fileSystem]); // Trigger state update
        }
    };

    return (
        <Grid>
            <Grid.Col span={3}>
                {fileSystem.map((node, idx) => (
                    <Folder key={idx} node={node} onFileClick={handleFileClick} />
                ))}
            </Grid.Col>
            <Grid.Col span={9}>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
                    {openFiles.map((file, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: "5px 10px",
                                cursor: "pointer",
                                backgroundColor: activeFile === file ? "#f0f0f0" : "#fff",
                                borderRight: "1px solid #ddd",
                                display: "flex",
                                alignItems: "center",
                            }}
                            onClick={() => setActiveFile(file)}
                        >
                            {file.name}
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseTab(file);
                                }}
                                style={{
                                    marginLeft: "10px",
                                    cursor: "pointer",
                                    color: "red",
                                }}
                            >
                                &times;
                            </span>
                        </div>
                    ))}
                </div>
                {activeFile ? (
                    activeFile.type === "file" ? (
                        <Editor value={activeFile.content} onChange={handleEditorChange} />
                    ) : (
                        <div>Select a file to edit</div>
                    )
                ) : (
                    <div>Select a file to edit</div>
                )}
            </Grid.Col>
        </Grid>
    );
}

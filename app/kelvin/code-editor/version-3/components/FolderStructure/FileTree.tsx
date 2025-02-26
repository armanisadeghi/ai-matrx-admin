"use client";

import React, { useEffect, useMemo, useState } from "react";

import { IFile } from "../../workspace/[repoName]/page";
import { TextInput } from "../Inputs";
import { SearchResultNode } from "./SearchResultNode";
import { TreeNode } from "./TreeNode";
import { buildSearchTree, flattenTree, IFileNode } from "./utils";

type FileTreeProps = {
    treeData: IFileNode[];
    repoName: string;
    onFileSelect: (path: string, content: string) => void;
    onFolderSelect?: (path: string) => void;
    onUpdate?: () => Promise<void> | void;
    activeFolder?: string;
    selectedFile?: IFile;
};

export const FileTree: React.FC<FileTreeProps> = ({
    treeData,
    repoName,
    activeFolder,
    selectedFile,
    onFileSelect,
    onFolderSelect,
    onUpdate,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<IFileNode[]>([]);

    const allNodes = useMemo(() => flattenTree(treeData), [treeData]);

    useEffect(() => {
        if (searchQuery) {
            const results = allNodes.filter(
                (node) =>
                    node.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.name.toLowerCase().includes(searchQuery.toLowerCase()),
            );
            setSearchResults(buildSearchTree(results));
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, allNodes]);

    const handleSearchResultSelect = (node: IFileNode) => {
        if (node.isFolder) {
            onFolderSelect(node.path!);
        } else {
            onFileSelect(node.path!, node.content || "");
        }
    };

    return (
        <div className="h-full overflow-auto">
            <TextInput
                placeholder="Search files..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                size="sm"
                className="w-full my-1"
            />
            {searchQuery
                ? searchResults.map((node, index) => (
                      <SearchResultNode
                          key={index}
                          node={node}
                          onSelect={handleSearchResultSelect}
                          depth={0}
                          searchQuery={searchQuery}
                      />
                  ))
                : treeData.map((node) => (
                      <TreeNode
                          key={node.name}
                          node={node}
                          path=""
                          repoName={repoName}
                          onFileSelect={onFileSelect}
                          onFolderSelect={onFolderSelect}
                          onUpdate={onUpdate}
                          activeFolder={activeFolder}
                          selectedFile={selectedFile}
                      />
                  ))}
        </div>
    );
};

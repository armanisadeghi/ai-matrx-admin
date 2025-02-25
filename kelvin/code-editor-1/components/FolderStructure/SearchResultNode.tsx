"use client";

import { IconFolderOpen, IconFolderFilled, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { getIconFromExtension } from "../../utils";
import { IFileNode } from "./utils";

interface SearchResultNodeProps {
    node: IFileNode;
    onSelect: (node: IFileNode) => void;
    depth: number;
    searchQuery: string;
}

export const SearchResultNode: React.FC<SearchResultNodeProps> = ({ node, onSelect, depth, searchQuery }) => {
    const [isExpanded, setIsExpanded] = useState(!node.matches); // Expand if it's not the matching node
    const FileIcon = node.isFolder ? (isExpanded ? IconFolderOpen : IconFolderFilled) : getIconFromExtension(node.name);
    const hasChildren = node.children && node.children.length > 0;

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const highlight = (text: string) => {
        if (!searchQuery) return text;
        const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
        return parts.map((part, index) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
                <span key={index} className="bg-yellow-500 text-black">
                    {part}
                </span>
            ) : (
                part
            ),
        );
    };

    return (
        <div style={{ marginLeft: `${depth * 16}px` }}>
            <div
                className={`flex items-center gap-2 p-1 cursor-pointer hover:bg-neutral-700 ${
                    node.matches ? "bg-blue-500" : ""
                }`}
                onClick={() => onSelect(node)}
            >
                {node.isFolder && (
                    <span onClick={toggleExpand}>
                        {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </span>
                )}
                <FileIcon size={16} className={node.isFolder ? "text-yellow-400" : ""} />
                <span>{highlight(node.name)}</span>
            </div>
            {isExpanded && hasChildren && (
                <div>
                    {node.children!.map((child, index) => (
                        <SearchResultNode
                            key={index}
                            node={child}
                            onSelect={onSelect}
                            depth={depth + 1}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

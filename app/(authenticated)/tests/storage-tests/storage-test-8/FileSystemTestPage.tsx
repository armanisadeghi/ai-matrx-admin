"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, Upload, Plus } from "lucide-react";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { FileSystemNode } from "@/lib/redux/fileSystem/types";

interface ColumnProps {
  path: string;
  onNodeClick: (node: FileSystemNode) => void;
  selectedPath?: string;
}

const Column = ({ path, onNodeClick, selectedPath }: ColumnProps) => {
  const { activeBucket, getHooksForBucket } = useFileSystem();
  const hooks = getHooksForBucket(activeBucket);
  const { useFolderContents } = hooks;

  const { children, isLoading, actions } = useFolderContents(path);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await actions.uploadFiles(files);
    }
  };

  return (
    <Card className="w-80 h-[calc(100vh-2rem)] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm truncate">{path || "Root"}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : children.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Empty folder
              </div>
            ) : (
              children.map((node) => (
                <Card
                  key={node.itemid}
                  className={`p-2 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedPath === node.storagePath ? "bg-accent" : ""
                  }`}
                  onClick={() => onNodeClick(node)}
                >
                  <div className="flex items-center space-x-2">
                    {node.contentType === "FOLDER" ? (
                      <Folder className="h-4 w-4" />
                    ) : (
                      <File className="h-4 w-4" />
                    )}
                    <span className="truncate text-sm">{node.name}</span>
                  </div>
                  {node.contentType === "FILE" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {node.metadata?.size
                        ? `${(node.metadata.size / 1024).toFixed(1)} KB`
                        : ""}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Upload and New Folder Controls */}
        <div className="pt-2 flex gap-2 border-t mt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // TODO: Implement new folder creation
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>New Folder</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FileSystemTest = () => {
  const { availableBuckets, activeBucket, setActiveBucket } = useFileSystem();

  // Track navigation path history
  const [pathHistory, setPathHistory] = useState<string[]>([""]);
  const [selectedPath, setSelectedPath] = useState<string>();

  const handleNodeClick = (node: FileSystemNode) => {
    if (node.contentType === "FOLDER") {
      const currentIndex = pathHistory.indexOf(node.parentId || "");

      if (currentIndex !== -1) {
        const newHistory = [
          ...pathHistory.slice(0, currentIndex + 1),
          node.storagePath,
        ];


        setPathHistory(newHistory);
      } else {
        const newHistory = [...pathHistory, node.storagePath];

        setPathHistory(newHistory);
      }
    }

    setSelectedPath(node.storagePath);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Bucket Selection */}
      <Card className="w-full">
        <CardContent className="py-4">
          <Tabs
            value={activeBucket}
            onValueChange={(value) => {
              const newBucket = value as (typeof availableBuckets)[number];
              setActiveBucket(newBucket);
              setPathHistory([""]);
              setSelectedPath(undefined);

            }}
          >
            {" "}
            <TabsList>
              {availableBuckets.map((bucket) => (
                <TabsTrigger key={bucket} value={bucket}>
                  {bucket}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Columnar Navigation */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pathHistory.map((path, index) => (
          <Column
            key={path || "root"}
            path={path}
            onNodeClick={handleNodeClick}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    </div>
  );
};

export default FileSystemTest;

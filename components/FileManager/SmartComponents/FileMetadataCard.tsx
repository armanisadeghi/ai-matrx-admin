// components/FileManager/FileMetadata/FileMetadataCard.tsx
import { useAppSelector } from "@/lib/redux";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { useFileSystem } from "@/providers/FileSystemProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate } from "../FileManagerContent/utils";

export const FileMetadataCard = () => {
  const { activeBucket } = useFileSystem();
  const selectors = createFileSystemSelectors(activeBucket);
  const activeNode = useAppSelector(selectors.selectActiveNode);

  if (!activeNode) return null;

  const metadata = activeNode.metadata;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{activeNode.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Type</div>
          <div>{activeNode.contentType === "FOLDER" ? "Folder" : metadata?.mimetype || "Unknown"}</div>
          
          {activeNode.contentType === "FILE" && (
            <>
              <div className="text-muted-foreground">Size</div>
              <div>{metadata ? formatBytes(metadata.size) : "Unknown"}</div>
              
              <div className="text-muted-foreground">Last Modified</div>
              <div>{metadata?.lastModified ? formatDate(metadata.lastModified) : "Unknown"}</div>
              
              <div className="text-muted-foreground">Created</div>
              <div>{metadata?.created_at ? formatDate(metadata.created_at) : "Unknown"}</div>
            </>
          )}
          
          <div className="text-muted-foreground">Location</div>
          <div>{activeNode.storagePath}</div>
        </div>
      </CardContent>
    </Card>
  );
};
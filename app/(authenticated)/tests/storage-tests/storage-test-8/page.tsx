"use client";
import { TableLoadingComponent } from "@/components/matrx/LoadingComponents";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import FilePreviewPanel from "./components/FilePreviewPanel";

export default function FileExplorerPage() {
  const { isInitialized, isLoading, error } = useFileSystem();

  if (error) {
    return (
      <div className="font-semibold m-2 text-destructive">
        Error: {error}
      </div>
    );
  }

  if (isLoading && !isInitialized) {
    return <TableLoadingComponent />;
  }

  return (
    <div className="flex flex-col h-full">
      <FilePreviewPanel />
    </div>
  );
}
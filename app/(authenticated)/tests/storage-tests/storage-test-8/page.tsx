"use client";
import { TableLoadingComponent } from "@/components/matrx/LoadingComponents";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";

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
    <>
      <div className="font-semibold m-2">File Preview</div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
        File Preview Area
      </div>
    </>
  );
}
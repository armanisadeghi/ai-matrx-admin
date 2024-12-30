import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDialog } from "@/providers/dialogs/DialogContext";

export default function TestDialogsPage() {
  const { openDialog } = useDialog();

  const operations = [
    { id: "filesystem.createFile", label: "Create File" },
    { id: "filesystem.createFolder", label: "Create Folder" },
    { id: "filesystem.delete", label: "Delete" },
    { id: "filesystem.rename", label: "Rename" },
    { id: "filesystem.upload", label: "Upload" },
    { id: "filesystem.download", label: "Download" },
    { id: "filesystem.move", label: "Move" },
    { id: "filesystem.getPublicFile", label: "Get Public URL" },
    { id: "filesystem.sync", label: "Sync" },
    { id: "filesystem.listContents", label: "List Contents" },
  ];

  return (
    <div className="w-full">
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="p-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Dialog Tests</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-1 gap-1">
            {operations.map(({ id, label }) => (
              <Button
                key={id}
                onClick={() => {
                  console.log("Button clicked:", id);
                  openDialog(id);
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-normal 
                  bg-gradient-to-r from-gray-50 to-white 
                  dark:from-gray-900 dark:to-gray-800
                  hover:from-gray-100 hover:to-gray-50 
                  dark:hover:from-gray-800 dark:hover:to-gray-700
                  text-gray-700 dark:text-gray-300
                  hover:text-gray-900 dark:hover:text-gray-100
                  border border-gray-200 dark:border-gray-700"
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
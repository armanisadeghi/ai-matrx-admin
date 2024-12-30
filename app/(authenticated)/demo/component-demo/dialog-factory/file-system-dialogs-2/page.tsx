"use client";

import { Dialog, DialogTrigger } from "@/components/ui";
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
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>File System Dialog Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {operations.map(({ id, label }) => (
              <Dialog key={id}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => openDialog(id)}
                    variant="outline"
                    className="w-full"
                  >
                    {label}
                  </Button>
                </DialogTrigger>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import {Button} from "@/components/ui";
import {
    Upload,
    Download,
    Trash2,
    Plus,
} from "lucide-react";
import {motion, AnimatePresence} from "framer-motion";
import {Card, CardContent} from "@/components/ui/card";
import {DirectoryType, fileHelpers} from "@/utils/fileSystemUtil";
import {FileContentResult, getFileType, loadFileContent} from "@/utils/fileContentHandlers";

// Main file operations toolbar
export const FileOperationsToolbar = ({onUpload, onDownload, onDelete, onNew, selectedFile}) => (
    <Card>
        <CardContent className="flex gap-2 p-4">
            <Button
                variant="outline"
                onClick={onNew}
                className="flex items-center gap-2"
            >
                <Plus className="w-4 h-4"/>
                New
            </Button>
            <Button
                variant="outline"
                onClick={onUpload}
                className="flex items-center gap-2"
            >
                <Upload className="w-4 h-4"/>
                Upload
            </Button>
            <Button
                variant="outline"
                onClick={onDownload}
                disabled={!selectedFile}
                className="flex items-center gap-2"
            >
                <Download className="w-4 h-4"/>
                Download
            </Button>
            <Button
                variant="destructive"
                onClick={onDelete}
                disabled={!selectedFile}
                className="flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4"/>
                Delete
            </Button>
        </CardContent>
    </Card>
);

import {
    Upload,
    Download,
    Trash2,
    Plus,
    RefreshCcw
} from "lucide-react";
import {motion} from "framer-motion";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {DirectoryType, fileHelpers} from "@/utils/fileSystemUtil";
import {FileContentResult, getFileType, loadFileContent} from "@/utils/fileContentHandlers";



// File details panel
export const FileDetailsPanel = ({file}) => (
    <Card>
        <CardHeader>
            <CardTitle>File Details</CardTitle>
        </CardHeader>
        <CardContent>
            {file ? (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="space-y-2"
                >
                    <p><span className="font-medium">Name:</span> {file.name}</p>
                    <p><span className="font-medium">Type:</span> {file.type}</p>
                    <p><span className="font-medium">Size:</span> {file.size}</p>
                    <p><span className="font-medium">Modified:</span> {file.modified}</p>
                </motion.div>
            ) : (
                 <p className="text-muted-foreground">Select a file to view details</p>
             )}
        </CardContent>
    </Card>
);

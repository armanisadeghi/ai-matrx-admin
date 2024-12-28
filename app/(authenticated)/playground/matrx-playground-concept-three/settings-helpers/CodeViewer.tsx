import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Copy, Check, Code, FileJson } from 'lucide-react';

interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Record<string, any>;
}

const CodeViewer = ({ isOpen, onClose, settings }: CodeViewerProps) => {
  const [copied, setCopied] = React.useState(false);
  
  const codeString = JSON.stringify(settings, null, 2);
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <DialogTitle>Configuration Code</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            <span>Current settings configuration</span>
            <Badge variant="secondary" className="ml-auto">
              JSON
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <pre className="bg-elevation1 p-4 rounded-lg overflow-auto max-h-[400px] text-sm">
            <code className="text-foreground">
              {codeString}
            </code>
          </pre>
          
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 gap-1.5"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </motion.div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CodeViewer;
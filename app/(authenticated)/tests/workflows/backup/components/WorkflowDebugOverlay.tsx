"use client";
import { useState } from "react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/styles/themes/ThemeProvider";

interface WorkflowDebugOverlayProps {
  getWorkflowData: () => {
    nodes: any[];
    edges: any[];
    selectedNode: any;
  };
}

const WorkflowDebugOverlay: React.FC<WorkflowDebugOverlayProps> = ({ getWorkflowData }) => {
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  // Simple syntax highlighting function
  const formatJSON = (json: string) => {
    if (!json) return '';
    
    // Replace with span elements for syntax highlighting
    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        // Key
        if (/^".*":$/.test(match)) {
          return `<span class="json-key">${match}</span>`;
        }
        // String (non-key)
        else if (/^"/.test(match)) {
          return `<span class="json-string">${match}</span>`;
        }
        // Boolean or null
        else if (/true|false|null/.test(match)) {
          return `<span class="json-boolean">${match}</span>`;
        }
        // Number
        else {
          return `<span class="json-number">${match}</span>`;
        }
      });
  };

  // Generate debug tabs dynamically each time the overlay is opened
  // This ensures we always have the latest data
  const getDebugTabs = () => [
    {
      id: "raw-data",
      label: "Raw Data",
      content: (
        <div className="p-4 h-full">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto h-full font-mono text-sm border border-gray-200 dark:border-gray-700">
            <style jsx>{`
              .json-key {
                color: ${isDarkMode ? '#7dd3fc' : '#0284c7'};
                font-weight: 500;
              }
              .json-string {
                color: ${isDarkMode ? '#86efac' : '#047857'};
              }
              .json-boolean {
                color: ${isDarkMode ? '#c084fc' : '#7e22ce'};
                font-weight: 500;
              }
              .json-number {
                color: ${isDarkMode ? '#f87171' : '#dc2626'};
              }
            `}</style>
            <pre 
              dangerouslySetInnerHTML={{ 
                __html: formatJSON(JSON.stringify(getWorkflowData(), null, 2))
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "nodes",
      label: "Nodes Only",
      content: (
        <div className="p-4 h-full">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto h-full font-mono text-sm border border-gray-200 dark:border-gray-700">
            <style jsx>{`
              .json-key {
                color: ${isDarkMode ? '#7dd3fc' : '#0284c7'};
                font-weight: 500;
              }
              .json-string {
                color: ${isDarkMode ? '#86efac' : '#047857'};
              }
              .json-boolean {
                color: ${isDarkMode ? '#c084fc' : '#7e22ce'};
                font-weight: 500;
              }
              .json-number {
                color: ${isDarkMode ? '#f87171' : '#dc2626'};
              }
            `}</style>
            <pre 
              dangerouslySetInnerHTML={{ 
                __html: formatJSON(JSON.stringify(getWorkflowData().nodes, null, 2))
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "edges",
      label: "Edges Only",
      content: (
        <div className="p-4 h-full">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto h-full font-mono text-sm border border-gray-200 dark:border-gray-700">
            <style jsx>{`
              .json-key {
                color: ${isDarkMode ? '#7dd3fc' : '#0284c7'};
                font-weight: 500;
              }
              .json-string {
                color: ${isDarkMode ? '#86efac' : '#047857'};
              }
              .json-boolean {
                color: ${isDarkMode ? '#c084fc' : '#7e22ce'};
                font-weight: 500;
              }
              .json-number {
                color: ${isDarkMode ? '#f87171' : '#dc2626'};
              }
            `}</style>
            <pre 
              dangerouslySetInnerHTML={{ 
                __html: formatJSON(JSON.stringify(getWorkflowData().edges, null, 2))
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "selected",
      label: "Selected Node",
      content: (
        <div className="p-4 h-full">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto h-full font-mono text-sm border border-gray-200 dark:border-gray-700">
            <style jsx>{`
              .json-key {
                color: ${isDarkMode ? '#7dd3fc' : '#0284c7'};
                font-weight: 500;
              }
              .json-string {
                color: ${isDarkMode ? '#86efac' : '#047857'};
              }
              .json-boolean {
                color: ${isDarkMode ? '#c084fc' : '#7e22ce'};
                font-weight: 500;
              }
              .json-number {
                color: ${isDarkMode ? '#f87171' : '#dc2626'};
              }
            `}</style>
            <pre 
              dangerouslySetInnerHTML={{ 
                __html: getWorkflowData().selectedNode 
                  ? formatJSON(JSON.stringify(getWorkflowData().selectedNode, null, 2)) 
                  : "No node selected"
              }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Button 
        onClick={() => setShowDebugOverlay(true)} 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1"
      >
        <Bug className="h-4 w-4" />
        Debug
      </Button>

      {/* Debug Data Overlay */}
      {showDebugOverlay && (
        <FullScreenOverlay
          isOpen={showDebugOverlay}
          onClose={() => setShowDebugOverlay(false)}
          title="Workflow Debug Data"
          description="Inspect the current workflow state"
          tabs={getDebugTabs()}
          showCancelButton
          cancelButtonLabel="Close"
        />
      )}
    </>
  );
};

export default WorkflowDebugOverlay; 
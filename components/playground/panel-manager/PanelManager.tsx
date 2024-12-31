import React, { useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { Button, Card } from "@/components/ui";
import { Plus } from "lucide-react";
import { VerticalPanel } from "./VerticalPanel";
import { StructuredEditor } from "../../tests/recipe-creation/inline-chip-editor-5/components/StructuredEditor";

interface PanelManagerProps {
  side: "left" | "right";
}

type Section = {
  id: string;
  content: React.ReactNode;
};

export function PanelManager({ side }: PanelManagerProps) {
  const [sections, setSections] = useState<Section[]>([
    { id: `${side}1`, content: `${side} Content 1` },
    { id: `${side}2`, content: `${side} Content 2` },
  ]);

  const addSection = () => {
    const newId = `${side}${sections.length + 1}`;
    setSections([...sections, { id: newId, content: "New Section" }]);
  };

  const handleStateChange = (state: any) => {
    console.log(state);
  };

  return (
    <Panel>
      <PanelGroup direction="vertical" className="h-full">
        {sections.map((section, index) => (
          <VerticalPanel
            key={section.id}
            id={section.id}
            order={index + 1}
          >
            {section.content}
          </VerticalPanel>
        ))}

        {/* Bottom flexible panel */}
        <Panel defaultSize={80} minSize={10} maxSize={100} order={999}>
          <Card className="h-full p-1 overflow-hidden bg-background">
            <StructuredEditor 
              editorId="main-editor"
              onStateChange={handleStateChange} 
              showControls={true} 
            />
          </Card>
        </Panel>

        <Button variant="ghost" className="w-full mt-2" onClick={addSection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </PanelGroup>
    </Panel>
  );
}
import React, { useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { Button, Card } from "@/components/ui";
import { Plus } from "lucide-react";
import { VerticalPanel } from "./VerticalPanel";

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

  return (
    <Panel>
      <PanelGroup direction="vertical" className="h-full">
        {sections.map((section, index) => (
          <VerticalPanel
            key={section.id}
            id={section.id}
            showHandle={index < sections.length }
          >
            {section.content}
          </VerticalPanel>
        ))}

        {/* Bottom flexible panel */}
        <Panel defaultSize={80} minSize={10} maxSize={100}>
          <Card className="h-full p-1 overflow-hidden bg-background">
            Flexible Bottom Section
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

"use client";

import React, { useState } from "react";
import FullEditableJsonViewer, {
  EditableJsonViewer,
  EnhancedEditableJsonViewer,
} from "@/components/ui/JsonComponents/JsonEditor";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

const Page = () => {
  const [currentComponent, setCurrentComponent] = useState("EditableJsonViewer");
  const [currentData, setCurrentData] = useState(null);

  const dataOptions = {
    null: null,
    json: {
      name: "Jane Doe",
      age: 25,
      address: {
        street: "456 Elm St",
        city: "Gotham",
        state: "CA",
        zip: "67890",
      },
      hobbies: ["painting", "traveling", "music"],
    },
    array: ["item1", "item2", "item3"],
    stringJson: '{"key": "value", "number": 123}',
  };

  const handleDataChange = (dataKey) => {
    setCurrentData(dataOptions[dataKey]);
  };

  const renderComponent = () => {
    switch (currentComponent) {
      case "EditableJsonViewer":
        return <EditableJsonViewer data={currentData} onChange={(data) => console.log("Updated data:", data)} />;
      case "FullEditableJsonViewer":
        return <FullEditableJsonViewer data={currentData} onChange={(data) => console.log("Updated data:", data)} />;
      case "EnhancedEditableJsonViewer":
        return <EnhancedEditableJsonViewer data={currentData} onSave={(data) => console.log("Saved data:", data)} onChange={(data) => console.log("Updated data:", data)} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-bold">JSON Components Showcase</h1>

      <div className="p-4 space-y-4 border rounded-md">
        <div className="flex items-center space-x-4">
          <Select
            value={currentComponent}
            onValueChange={setCurrentComponent}
          >
            <SelectTrigger className="w-60">Select Component</SelectTrigger>
            <SelectContent>
              <SelectItem value="EditableJsonViewer">EditableJsonViewer</SelectItem>
              <SelectItem value="FullEditableJsonViewer">FullEditableJsonViewer</SelectItem>
              <SelectItem value="EnhancedEditableJsonViewer">EnhancedEditableJsonViewer</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={handleDataChange}>
            <SelectTrigger className="w-60">Select Data</SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Null</SelectItem>
              <SelectItem value="json">JSON Object</SelectItem>
              <SelectItem value="array">Array</SelectItem>
              <SelectItem value="stringJson">Stringified JSON</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => console.log("Component and Data updated:", currentComponent, currentData)}>
            Apply Data
          </Button>
        </div>
      </div>

      <div className="p-4 border rounded-md">
        <h2 className="text-lg font-semibold mb-2">Component Preview</h2>
        <div className="p-4 border rounded-md">
          {renderComponent()}
        </div>
      </div>
    </div>
  );
};

export default Page;

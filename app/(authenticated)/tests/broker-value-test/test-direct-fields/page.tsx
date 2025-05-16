// File: app/test-fields/page.tsx
"use client";

import React, { useState } from "react";
import SimpleFields from "@/features/applet/runner/fields/core/SimpleFields";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem,
  Input, 
  Label, 
  Button,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui";

export default function TestFieldsPage() {
  const [labelPosition, setLabelPosition] = useState<"top" | "left" | "right">("top");
  const [showLabels, setShowLabels] = useState(true);

  return (
    <div className="w-full h-full py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">SimpleFields Component Test</h1>
      
      {/* Controls for testing different configurations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="label-position">Label Position</Label>
              <Select value={labelPosition} onValueChange={(value) => setLabelPosition(value as "top" | "left" | "right")}>
                <SelectTrigger id="label-position" className="w-[180px]">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Checkbox 
                id="show-labels" 
                checked={showLabels} 
                onCheckedChange={(checked) => setShowLabels(checked as boolean)}
              />
              <Label htmlFor="show-labels" className="ml-2">Show Labels</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single field test */}
      <div className="border-b pb-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Single Field</h2>
        <SimpleFields 
          fields={{
            id: "single-text-field",
            label: "Simple Text Input",
            component: "input",
            placeholder: "Enter text here...",
            helpText: "This is a simple text input field"
          }}
          sourceId="test-component"
          labelPosition={labelPosition}
          showLabels={showLabels}
          className="max-w-md"
        />
      </div>

      {/* Multiple fields test */}
      <div className="border-b pb-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Common Field Types</h2>
        <SimpleFields 
          fields={[
            {
              id: "text-field",
              label: "Text Input",
              component: "input",
              placeholder: "Enter text...",
              helpText: "Standard text input field"
            },
            {
              id: "textarea-field",
              label: "Text Area",
              component: "textarea",
              placeholder: "Write a longer message...",
              helpText: "Multi-line text field",
              componentProps: {
                rows: 4
              }
            },
            {
              id: "number-field",
              label: "Number Input",
              component: "number",
              helpText: "Enter a number",
              componentProps: {
                min: 0,
                max: 100,
                step: 5
              }
            },
            {
              id: "select-field",
              label: "Select Dropdown",
              component: "select",
              helpText: "Choose one option",
              options: [
                { id: "option1", label: "Option 1" },
                { id: "option2", label: "Option 2" },
                { id: "option3", label: "Option 3" }
              ]
            }
          ]}
          sourceId="test-component"
          labelPosition={labelPosition}
          showLabels={showLabels}
          className="max-w-xl"
        />
      </div>

      {/* Selection fields test */}
      <div className="border-b pb-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Selection Fields</h2>
        <SimpleFields 
          fields={[
            {
              id: "radio-field",
              label: "Radio Buttons",
              component: "radio",
              helpText: "Choose one option",
              options: [
                { id: "radio1", label: "Option 1" },
                { id: "radio2", label: "Option 2" },
                { id: "radio3", label: "Option 3" }
              ]
            },
            {
              id: "checkbox-field",
              label: "Checkboxes",
              component: "checkbox",
              helpText: "Select multiple options",
              options: [
                { id: "check1", label: "Option A" },
                { id: "check2", label: "Option B" },
                { id: "check3", label: "Option C" }
              ]
            },
            {
              id: "button-selection",
              label: "Button Selection",
              component: "buttonSelection",
              helpText: "Click to select",
              options: [
                { id: "btn1", label: "Button 1" },
                { id: "btn2", label: "Button 2" },
                { id: "btn3", label: "Button 3" }
              ]
            }
          ]}
          sourceId="test-component"
          labelPosition={labelPosition}
          showLabels={showLabels}
        />
      </div>

      {/* Advanced fields test */}
      <div className="border-b pb-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Advanced Fields</h2>
        <SimpleFields 
          fields={[
            {
              id: "date-field",
              label: "Date Picker",
              component: "date",
              helpText: "Select a date"
            },
            {
              id: "slider-field",
              label: "Slider",
              component: "slider",
              helpText: "Adjust the value",
              componentProps: {
                min: 0,
                max: 100,
                step: 1
              }
            },
            {
              id: "switch-field",
              label: "Toggle Switch",
              component: "switch",
              helpText: "Turn on or off",
              componentProps: {
                onLabel: "Enabled",
                offLabel: "Disabled"
              }
            },
            {
              id: "file-upload",
              label: "File Upload",
              component: "fileUpload",
              helpText: "Upload a file"
            }
          ]}
          sourceId="test-component"
          labelPosition={labelPosition}
          showLabels={showLabels}
        />
      </div>

      {/* Complex fields test */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Complex Fields</h2>
        <SimpleFields 
          fields={[
            {
              id: "draggable-table",
              label: "Draggable Table",
              component: "draggableTable",
              helpText: "Drag items to reorder",
              componentProps: {
                tableRules: {
                  canAddRows: true,
                  canDeleteRows: true,
                  canSortRows: true
                }
              }
            },
            {
              id: "multi-searchable-select",
              label: "Multi Searchable Select",
              component: "multiSearchableSelect",
              helpText: "Search and select multiple options",
              options: [
                { id: "opt1", label: "Option 1" },
                { id: "opt2", label: "Option 2" },
                { id: "opt3", label: "Option 3" },
                { id: "opt4", label: "Option 4" },
                { id: "opt5", label: "Option 5" }
              ]
            },
            {
              id: "tag-input",
              label: "Tag Input",
              component: "tagInput",
              helpText: "Add multiple tags"
            },
            {
              id: "address-block",
              label: "Address Block",
              component: "addressBlock",
              helpText: "Enter address information"
            }
          ]}
          sourceId="test-component"
          labelPosition={labelPosition}
          showLabels={showLabels}
        />
      </div>
    </div>
  );
}
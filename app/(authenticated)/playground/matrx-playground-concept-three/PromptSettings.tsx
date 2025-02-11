"use client";

import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  MessageSquare,
  Braces,
  Image,
  DatabaseZap,
  Volume2,
  Video,
  Files,
  Search,
  Code,
  FileSearch,
  Cloud,
  Newspaper,
  Calendar,
  ListTodo,
  Mail,
  Calculator,
  Globe2,
  Database,
  Bot,
  Settings,
  Music,
  Book,
} from "lucide-react";
import SelectWithIconDisplay from "@/components/matrx/SelectWithIconDisplay";

import LightSwitchToggle from "@/components/matrx/LightSwitchToggle";
import MultiSwitchToggle from "@/components/matrx/MultiSwitchToggle";
import { Button } from "@/components/ui";

const PromptSettings = ({ initialSettings }) => {
  const [temperature, setTemperature] = useState(
    initialSettings?.temperature || 0.7
  );
  const [maxTokens, setMaxTokens] = useState(
    initialSettings?.maxTokens || 2000
  );
  const [streamResponse, setStreamResponse] = useState(
    initialSettings?.streamResponse || true
  );

  const handleAIToolsChange = (selected) => {
    console.log("Selected AI tools:", selected);
  };

  const handleToolAssistChange = (selected) => {
    console.log("Tool Assist Change:", selected);
  };

  const handleResponseFormatChange = (selected) => {
    console.log("Response Format Change:", selected);
  };

  const responseFormats = [
    { icon: <MessageSquare size={14} />, label: "Text", value: "text" },
    { icon: <Braces size={14} />, label: "JSON", value: "json" },
    { icon: <DatabaseZap size={14} />, label: "Schema", value: "schema" },
    { icon: <Image size={14} />, label: "Image", value: "image" },
    { icon: <Volume2 size={14} />, label: "Audio", value: "audio" },
    { icon: <Video size={14} />, label: "Video", value: "video" },
    { icon: <Files size={14} />, label: "Multi", value: "multi" },
  ];

  const toolAssistOptions = [
    { label: "Off", value: "toolsOff" },
    { label: "Tools", value: "tools" },
    { label: "Tool Assist", value: "toolAssist" },
  ];

  const aiTools = [
    { icon: Search, label: "Web Search", value: "web-search" },
    { icon: Code, label: "Code Execution", value: "code-exec" },
    { icon: FileSearch, label: "File Search", value: "file-search" },
    { icon: Image, label: "Image Generation", value: "image-gen" },
    { icon: Cloud, label: "Weather", value: "weather" },
    { icon: Newspaper, label: "News", value: "news" },
    { icon: Calendar, label: "Calendar", value: "calendar" },
    { icon: ListTodo, label: "Tasks", value: "tasks" },
    { icon: Mail, label: "Email", value: "email" },
    { icon: MessageSquare, label: "Chat", value: "chat" },
    { icon: Calculator, label: "Calculator", value: "calculator" },
    { icon: Globe2, label: "Translation", value: "translation" },
    { icon: Database, label: "Knowledge Base", value: "knowledge-base" },
    { icon: Bot, label: "AI Assistant", value: "ai-assistant" },
    { icon: FileSearch, label: "Document Analysis", value: "doc-analysis" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Temperature</span>
          <span className="text-muted-foreground">{temperature}</span>
        </div>
        <Slider
          value={[temperature]}
          onValueChange={([value]) => setTemperature(value)}
          max={1}
          step={0.01}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Max Tokens</span>
          <span className="text-muted-foreground">
            {maxTokens.toLocaleString()}
          </span>
        </div>
        <Slider
          value={[maxTokens]}
          onValueChange={([value]) => setMaxTokens(value)}
          max={8000}
          step={1}
          className="w-full"
        />
      </div>
      <div className="w-full flex flex-wrap items-center justify-between space-y-2">
        <span className="text-sm flex items-center">Stream Response</span>
        <LightSwitchToggle
          variant="geometric"
          width="w-28"
          height="h-7"
          disabled={false}
          defaultValue={streamResponse}
          onChange={setStreamResponse}
          labels={{ on: "Stream", off: "Direct" }}
        />
      </div>
      <div className="w-full space-y-2">
        <span className="text-sm">Response Format</span>
        <MultiSwitchToggle
          variant="geometric"
          width="w-24"
          height="h-7"
          disabled={false}
          states={responseFormats}
          onChange={handleResponseFormatChange}
        />
      </div>
      <div className="w-full space-y-2">
        <span className="text-sm">Tools Options</span>
        <MultiSwitchToggle
          variant="geometric"
          width="w-48"
          height="h-7"
          disabled={false}
          states={toolAssistOptions}
          onChange={handleToolAssistChange}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <SelectWithIconDisplay
            items={aiTools}
            onChange={handleAIToolsChange}
            placeholder="Select tools..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Button variant="outline" className="w-full">
            <Settings size={16} className="mr-2" />
            Advanced Settings
          </Button>{" "}
        </div>
      </div>
    </div>
  );
};

export default PromptSettings;

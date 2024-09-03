// File location: @/types/brokerTypes

import { AutomationBoundaryBrokerType } from '@/types/automationBoundaryBrokerTypes';
import { RecipeBrokerType } from '@/types/recipeBrokerTypes';
import { ArgType } from '@/types/argTypes';
import { SystemFunctionType } from '@/types/systemFunctionTypes';
import { ToolType } from '@/types/toolTypes';
import {RegisteredFunctionType} from "@/types/registeredFunctionTypes";

export type DataTypeType = "str" | "int" | "float" | "bool" | "dict" | "list" | "url";
export type DefaultSourceType = "user_input" | "database" | "api" | "environment" | "file" | "chance" | "generated_data" | "function" | "none";
export type DefaultDestinationType = "user_output" | "database" | "file" | "api_response" | "function";
export type OutputComponentType = "chatResponse" | "PlainText" | "Textarea" | "JsonViewer" | "CodeView" | "MarkdownViewer" | "RichTextEditor" | "TreeView" | "ImageView" | "AudioOutput" | "Presentation" | "RunCodeFront" | "RunCodeBack" | "ComplexMulti" | "FileOutput" | "Table" | "Form" | "VerticalList" | "HorizontalList" | "Flowchart" | "WordMap" | "GeographicMap" | "video" | "Spreadsheet" | "Timeline" | "GanttChart" | "NetworkGraph" | "Heatmap" | "3DModelViewer" | "LaTeXRenderer" | "DiffViewer" | "Checklist" | "KanbanBoard" | "PivotTable" | "InteractiveChart" | "SankeyDiagram" | "MindMap" | "Calendar" | "Carousel" | "PDFViewer" | "SVGEditor" | "DataFlowDiagram" | "UMLDiagram" | "GlossaryView" | "DecisionTree" | "WordHighlighter" | "SpectrumAnalyzer" | "LiveTraffic" | "WeatherMap" | "WeatherDashboard" | "Thermometer" | "SatelliteView" | "PublicLiveCam" | "Clock" | "BudgetVisualizer" | "MealPlanner" | "TaskPrioritization" | "VoiceSentimentAnalysis" | "NewsAggregator" | "FitnessTracker" | "TravelPlanner" | "BucketList" | "SocialMediaInfo" | "LocalEvents" | "NeedNewOption" | "none";

export type BrokerType = {
    id: string;
    name: string;
    value?: Record<string, unknown>;
    dataType: DataTypeType;
    ready?: boolean;
    defaultSource?: DefaultSourceType;
    displayName?: string;
    description?: string;
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    defaultDestination?: DefaultDestinationType;
    outputComponent?: OutputComponentType;
    tags?: Record<string, unknown>;
    automationBoundaryBroker?: AutomationBoundaryBrokerType[];
    recipeBroker?: RecipeBrokerType[];
    registeredFunction?: RegisteredFunctionType[];
    arg?: ArgType[];
    systemFunction?: SystemFunctionType[];
    tool?: ToolType[];
};

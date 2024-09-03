// File location: @/types/dataOutputComponentTypes

export type ComponentTypeType = "chatResponse" | "PlainText" | "Textarea" | "JsonViewer" | "CodeView" | "MarkdownViewer" | "RichTextEditor" | "TreeView" | "ImageView" | "AudioOutput" | "Presentation" | "RunCodeFront" | "RunCodeBack" | "ComplexMulti" | "FileOutput" | "Table" | "Form" | "VerticalList" | "HorizontalList" | "Flowchart" | "WordMap" | "GeographicMap" | "video" | "Spreadsheet" | "Timeline" | "GanttChart" | "NetworkGraph" | "Heatmap" | "3DModelViewer" | "LaTeXRenderer" | "DiffViewer" | "Checklist" | "KanbanBoard" | "PivotTable" | "InteractiveChart" | "SankeyDiagram" | "MindMap" | "Calendar" | "Carousel" | "PDFViewer" | "SVGEditor" | "DataFlowDiagram" | "UMLDiagram" | "GlossaryView" | "DecisionTree" | "WordHighlighter" | "SpectrumAnalyzer" | "LiveTraffic" | "WeatherMap" | "WeatherDashboard" | "Thermometer" | "SatelliteView" | "PublicLiveCam" | "Clock" | "BudgetVisualizer" | "MealPlanner" | "TaskPrioritization" | "VoiceSentimentAnalysis" | "NewsAggregator" | "FitnessTracker" | "TravelPlanner" | "BucketList" | "SocialMediaInfo" | "LocalEvents" | "NeedNewOption" | "none";

export type DataOutputComponentType = {
    id: string;
    componentType?: ComponentTypeType;
    uiComponent?: string;
    props?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;

};

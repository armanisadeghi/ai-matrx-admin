"use client";

import React, { useState, useRef } from "react";
import {
    Wand2,
    Play,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Copy,
    Check,
    Save,
    Eye,
    Code,
    Database,
    Sparkles,
    FileJson,
    Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { COMPONENT_GENERATOR_PROMPT_ID, COMPONENT_GENERATOR_SYSTEM_PROMPT } from "./tool-ui-generator-prompt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratorProps {
    tools: Array<{ id: string; name: string; description: string; category?: string }>;
    onComplete?: () => void;
}

interface GeneratedComponent {
    tool_name: string;
    display_name: string;
    results_label: string;
    inline_code: string;
    overlay_code: string;
    utility_code: string;
    header_extras_code: string;
    header_subtitle_code: string;
    keep_expanded_on_stream: boolean;
    allowed_imports: string[];
    version: string;
}

type WizardStep = "select-tool" | "provide-data" | "generate" | "review" | "saved";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractJsonFromResponse(text: string): GeneratedComponent | null {
    // Try to find a JSON block in the response
    // Look for ```json ... ``` blocks first
    const jsonBlockMatch = text.match(/```json\s*\n?([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            return JSON.parse(jsonBlockMatch[1].trim());
        } catch {
            // fall through
        }
    }

    // Try to find raw JSON object
    const braceMatch = text.match(/\{[\s\S]*"tool_name"[\s\S]*"inline_code"[\s\S]*\}/);
    if (braceMatch) {
        try {
            return JSON.parse(braceMatch[0]);
        } catch {
            // fall through
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ToolUiComponentGenerator({ tools, onComplete }: GeneratorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<WizardStep>("select-tool");
    const [selectedToolName, setSelectedToolName] = useState("");
    const [streamData, setStreamData] = useState("");
    const [dbData, setDbData] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationOutput, setGenerationOutput] = useState("");
    const [generatedComponent, setGeneratedComponent] = useState<GeneratedComponent | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeReviewTab, setActiveReviewTab] = useState("inline");
    const abortRef = useRef<AbortController | null>(null);

    const selectedTool = tools.find((t) => t.name === selectedToolName);

    // Step 1 → 2
    const handleToolSelected = () => {
        if (!selectedToolName) {
            toast({ title: "Select a tool", description: "Please select a tool first.", variant: "destructive" });
            return;
        }
        setStep("provide-data");
    };

    // Step 2 → 3: Generate
    const handleGenerate = async () => {
        if (!streamData.trim()) {
            toast({ title: "Missing data", description: "Please provide sample stream data.", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        setGenerationOutput("");
        setGeneratedComponent(null);
        setParseError(null);
        setStep("generate");

        const abortController = new AbortController();
        abortRef.current = abortController;

        try {
            const response = await fetch("/api/chat/unified", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortController.signal,
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: COMPONENT_GENERATOR_SYSTEM_PROMPT,
                        },
                        {
                            role: "user",
                            content: buildUserMessage(selectedToolName, streamData, dbData),
                        },
                    ],
                    stream: true,
                    temperature: 0.3,
                    max_output_tokens: 16000,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((l) => l.trim());

                for (const line of lines) {
                    try {
                        const event = JSON.parse(line);
                        if (event.event === "chunk" && event.data?.chunk) {
                            accumulated += event.data.chunk;
                            setGenerationOutput(accumulated);
                        } else if (event.event === "chunk" && typeof event.data === "string") {
                            accumulated += event.data;
                            setGenerationOutput(accumulated);
                        }
                    } catch {
                        // Non-JSON line, skip
                    }
                }
            }

            // Try to parse the result
            const parsed = extractJsonFromResponse(accumulated);
            if (parsed) {
                setGeneratedComponent(parsed);
                setStep("review");
            } else {
                setParseError(
                    "Could not extract structured component data from the model's response. " +
                    "You can manually copy the code from the output below."
                );
                setStep("review");
            }
        } catch (err) {
            if ((err as Error).name === "AbortError") {
                toast({ title: "Cancelled", description: "Generation was cancelled." });
                setStep("provide-data");
            } else {
                toast({
                    title: "Generation failed",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "destructive",
                });
                setStep("provide-data");
            }
        } finally {
            setIsGenerating(false);
            abortRef.current = null;
        }
    };

    const handleCancel = () => {
        abortRef.current?.abort();
    };

    // Save to database
    const handleSave = async () => {
        if (!generatedComponent) return;

        setIsSaving(true);
        try {
            const toolRecord = tools.find((t) => t.name === generatedComponent.tool_name);

            const response = await fetch("/api/admin/tool-ui-components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...generatedComponent,
                    tool_id: toolRecord?.id || null,
                    language: "tsx",
                    is_active: true,
                    notes: "Auto-generated by AI component generator",
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to save");
            }

            toast({ title: "Saved", description: "Component saved to database. It will be active on next tool use." });
            setStep("saved");
            onComplete?.();
        } catch (err) {
            toast({
                title: "Save failed",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-xs">
                {(["select-tool", "provide-data", "generate", "review", "saved"] as WizardStep[]).map(
                    (s, i) => (
                        <React.Fragment key={s}>
                            {i > 0 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                            <Badge
                                variant={step === s ? "default" : "outline"}
                                className={`text-[10px] ${
                                    step === s ? "" : "text-slate-500"
                                }`}
                            >
                                {i + 1}. {s.replace(/-/g, " ")}
                            </Badge>
                        </React.Fragment>
                    )
                )}
            </div>

            {/* Step 1: Select Tool */}
            {step === "select-tool" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Select Tool
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Choose a tool to generate a UI component for</Label>
                            <Select value={selectedToolName} onValueChange={setSelectedToolName}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select a tool..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tools.map((tool) => (
                                        <SelectItem key={tool.name} value={tool.name}>
                                            <span className="font-mono text-xs">{tool.name}</span>
                                            <span className="text-xs text-slate-500 ml-2">
                                                {tool.description?.slice(0, 60)}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTool && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                    {selectedTool.name}
                                </div>
                                <div className="text-slate-500">{selectedTool.description}</div>
                                {selectedTool.category && (
                                    <Badge variant="outline" className="text-[10px]">
                                        {selectedTool.category}
                                    </Badge>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleToolSelected} disabled={!selectedToolName}>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Provide Sample Data */}
            {step === "provide-data" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileJson className="w-4 h-4" />
                            Provide Sample Data for: {selectedToolName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>
                                Stream Data (Required) — Paste the full JSON stream from a tool execution
                            </Label>
                            <p className="text-[11px] text-slate-500 mb-1.5">
                                This is the array of tool_update events captured during streaming.
                                Include all event types: mcp_input, user_visible_message, step_data, mcp_output.
                            </p>
                            <Textarea
                                value={streamData}
                                onChange={(e) => setStreamData(e.target.value)}
                                className="font-mono text-xs min-h-[200px]"
                                placeholder='[{"event":"tool_update","data":{"id":"...","type":"mcp_input",...}}, ...]'
                            />
                        </div>

                        <div>
                            <Label>
                                Database Entry (Optional) — Paste the cx_message content for this tool
                            </Label>
                            <p className="text-[11px] text-slate-500 mb-1.5">
                                Query: SELECT * FROM cx_message WHERE conversation_id = '...' AND role = 'tool'
                            </p>
                            <Textarea
                                value={dbData}
                                onChange={(e) => setDbData(e.target.value)}
                                className="font-mono text-xs min-h-[120px]"
                                placeholder="Paste the database entry JSON here (optional)..."
                            />
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep("select-tool")}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Button onClick={handleGenerate} disabled={!streamData.trim()}>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Generate Component
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Generating */}
            {step === "generate" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            Generating Component for: {selectedToolName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isGenerating && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>AI is generating the component code...</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto text-xs"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                            {generationOutput || "Waiting for response..."}
                        </pre>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Review */}
            {step === "review" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Review Generated Component
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {parseError && (
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium mb-1">Could not auto-parse</p>
                                    <p>{parseError}</p>
                                </div>
                            </div>
                        )}

                        {generatedComponent ? (
                            <>
                                {/* Component metadata */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-500">Tool Name</span>
                                        <p className="font-mono font-medium">{generatedComponent.tool_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Display Name</span>
                                        <p className="font-medium">{generatedComponent.display_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Results Label</span>
                                        <p className="font-medium">{generatedComponent.results_label || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Keep Expanded</span>
                                        <p className="font-medium">{generatedComponent.keep_expanded_on_stream ? "Yes" : "No"}</p>
                                    </div>
                                </div>

                                {/* Code tabs */}
                                <Tabs value={activeReviewTab} onValueChange={setActiveReviewTab}>
                                    <TabsList>
                                        <TabsTrigger value="inline" className="text-xs">Inline</TabsTrigger>
                                        <TabsTrigger value="overlay" className="text-xs">Overlay</TabsTrigger>
                                        <TabsTrigger value="utility" className="text-xs">Utility</TabsTrigger>
                                        <TabsTrigger value="headers" className="text-xs">Headers</TabsTrigger>
                                        <TabsTrigger value="raw" className="text-xs">Raw Output</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="inline">
                                        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap">
                                            {generatedComponent.inline_code || "Not generated"}
                                        </pre>
                                    </TabsContent>
                                    <TabsContent value="overlay">
                                        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap">
                                            {generatedComponent.overlay_code || "Not generated"}
                                        </pre>
                                    </TabsContent>
                                    <TabsContent value="utility">
                                        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap">
                                            {generatedComponent.utility_code || "Not generated"}
                                        </pre>
                                    </TabsContent>
                                    <TabsContent value="headers">
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-[11px]">Header Subtitle</Label>
                                                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[150px] whitespace-pre-wrap">
                                                    {generatedComponent.header_subtitle_code || "Not generated"}
                                                </pre>
                                            </div>
                                            <div>
                                                <Label className="text-[11px]">Header Extras</Label>
                                                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[150px] whitespace-pre-wrap">
                                                    {generatedComponent.header_extras_code || "Not generated"}
                                                </pre>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="raw">
                                        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap">
                                            {generationOutput}
                                        </pre>
                                    </TabsContent>
                                </Tabs>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep("provide-data")}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Regenerate
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        {isSaving ? "Saving..." : "Save to Database"}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            // No auto-parse, show raw output for manual copy
                            <>
                                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap">
                                    {generationOutput}
                                </pre>
                                <div className="flex justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep("provide-data")}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Try Again
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Saved */}
            {step === "saved" && (
                <Card className="border-green-200 dark:border-green-800/50">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-3">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                Component Saved
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                The UI component for <span className="font-mono font-medium">{selectedToolName}</span> has
                                been saved and is now active. It will render automatically the next time this tool is used.
                            </p>
                            <div className="flex justify-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setStep("select-tool");
                                        setSelectedToolName("");
                                        setStreamData("");
                                        setDbData("");
                                        setGenerationOutput("");
                                        setGeneratedComponent(null);
                                    }}
                                >
                                    Generate Another
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Build user message from sample data
// ---------------------------------------------------------------------------

function buildUserMessage(toolName: string, streamData: string, dbData: string): string {
    let msg = `Generate a complete UI component for the tool: "${toolName}"\n\n`;
    msg += `## Sample Stream Data (tool_update events from a real execution)\n\n`;
    msg += "```json\n" + streamData.trim() + "\n```\n\n";

    if (dbData.trim()) {
        msg += `## Database Entry (cx_message content for this tool)\n\n`;
        msg += "```json\n" + dbData.trim() + "\n```\n\n";
    }

    msg += "Please generate the complete component now, outputting the result as a single JSON object with all fields.";
    return msg;
}

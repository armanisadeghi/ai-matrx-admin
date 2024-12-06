// components/AiSettingsModal.tsx
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Slider } from "@/components/ui";
import { AiCallParams } from "@/types/voice/voiceAssistantTypes";

interface AiSettingsModalProps {
    params: AiCallParams;
    onParamsChange: (params: AiCallParams) => void;
}

export const AiSettingsModal = ({ params, onParamsChange }: AiSettingsModalProps) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground">
                    <Settings2 className="w-4 h-4" />
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Model Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Temperature</Label>
                        <Slider
                            value={[params.temperature || 0.7]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={([value]) => onParamsChange({ ...params, temperature: value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Max Tokens</Label>
                        <Input
                            type="number"
                            value={params.maxTokens || 2048}
                            onChange={(e) => onParamsChange({ ...params, maxTokens: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

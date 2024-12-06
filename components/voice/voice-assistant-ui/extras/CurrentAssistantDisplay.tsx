// CurrentAssistantDisplay.tsx
import { Badge } from "@/components/ui/badge";

interface CurrentAssistantDisplayProps {
    assistant: {
        name: string;
        imagePath: string;
        capabilities: string[];
    };
}

export const CurrentAssistantDisplay = ({ assistant }: CurrentAssistantDisplayProps) => {
    return (
        <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                <img
                    src={assistant.imagePath}
                    alt={assistant.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{assistant.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                    {assistant.capabilities.slice(0, 2).map((capability, index) => (
                        <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs px-2 py-0 bg-primary/5"
                        >
                            {capability}
                        </Badge>
                    ))}
                    {assistant.capabilities.length > 2 && (
                        <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0 bg-primary/5"
                        >
                            +{assistant.capabilities.length - 2}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
};

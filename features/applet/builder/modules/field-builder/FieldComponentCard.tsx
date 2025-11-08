import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, Copy, Pencil, Trash2, EyeOff, 
  TextCursorInput, FileText, ChevronDown, List,
  Circle, Square, Sliders, Hash, Calendar,
  ToggleLeft, Mountain, Layers, BracesIcon,
  Upload, TypeIcon, CheckSquare2, LayersIcon
} from "lucide-react";
import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { cn } from "@/lib/utils";

// Type-icon mapping
const componentIcons = {
  input: TextCursorInput,
  textarea: FileText,
  select: ChevronDown,
  multiselect: List,
  radio: Circle,
  checkbox: Square,
  slider: Sliders,
  number: Hash,
  date: Calendar,
  switch: ToggleLeft,
  button: Mountain,
  rangeSlider: Layers,
  numberPicker: BracesIcon,
  jsonField: BracesIcon,
  fileUpload: Upload,
  default: TypeIcon
} as const;

// Component type styling
const componentTypeStyles = {
  input: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  textarea: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  select: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  multiselect: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  radio: { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  checkbox: { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  slider: { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800" },
  number: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  date: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  switch: { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800" },
  button: { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800" },
  rangeSlider: { bg: "bg-lime-100 dark:bg-lime-900", text: "text-lime-700 dark:text-lime-300", border: "border-lime-200 dark:border-lime-800" },
  numberPicker: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  jsonField: { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  fileUpload: { bg: "bg-sky-100 dark:bg-sky-900", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800" },
  default: { bg: "bg-gray-100 dark:bg-gray-900", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-gray-800" }
} as const;

interface FieldComponentCardProps {
    component: FieldBuilder;
    isSelected?: boolean;
    onEdit: () => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onPublicToggle: (id: string, isPublic: boolean) => void;
    onSelect?: () => void;
    onAssignToContainer?: (id: string) => void;
}

export default function FieldComponentCard({ 
  component, 
  isSelected = false,
  onEdit, 
  onDelete, 
  onDuplicate, 
  onPublicToggle,
  onSelect,
  onAssignToContainer
}: FieldComponentCardProps) {
    const componentType = component.component.toLowerCase();
    const Icon = componentIcons[componentType as keyof typeof componentIcons] || componentIcons.default;
    const styles = componentTypeStyles[componentType as keyof typeof componentTypeStyles] || componentTypeStyles.default;
    
    // Add selection border and highlight if selected, plus subtle hover effect
    const cardClassName = cn(
      "h-full flex flex-col overflow-hidden transition-shadow duration-200 rounded-2xl cursor-pointer",
      "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
      "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
      isSelected && "ring-2 ring-rose-500 dark:ring-rose-600 border-rose-300 dark:border-rose-800"
    );

    return (
        <Card className={cardClassName} onClick={onSelect}>
            <CardHeader className={cn("pb-3", isSelected && "bg-rose-50 dark:bg-rose-950/20")}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`${styles.bg} ${styles.text} ${styles.border} px-2 py-1 gap-1.5`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {component.component}
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-lg leading-tight truncate">{component.label}</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering card selection
                          onPublicToggle(component.id, !component.isPublic);
                        }}
                    >
                        {component.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {component.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {component.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge 
                      variant={component.required ? "destructive" : "outline"} 
                      className={component.required ? "" : "border-dashed opacity-60"}
                    >
                      <CheckSquare2 className="h-3 w-3" />
                      {component.required ? "Required" : "Optional"}
                    </Badge>
                    <Badge 
                      variant={component.isPublic ? "secondary" : "outline"}
                      className={component.isPublic ? "" : "border-dashed opacity-60"}
                    >
                      {component.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {component.isPublic ? "Public" : "Private"}
                    </Badge>
                </div>
                
                <div className="mt-auto pt-4 border-t flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering card selection
                            onEdit();
                          }} 
                          className="h-8 w-8"
                          title="Edit"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering card selection
                            onDuplicate(component.id);
                          }} 
                          className="h-8 w-8"
                          title="Duplicate"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {onAssignToContainer && (
                          <Button 
                            size="icon" 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering card selection
                              onAssignToContainer(component.id);
                            }} 
                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                            title="Add to Container"
                          >
                              <LayersIcon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                    </div>
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="h-8 w-8" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering card selection
                        onDelete(component.id);
                      }}
                      title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
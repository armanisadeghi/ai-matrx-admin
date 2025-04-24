import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as LucideIcons from "lucide-react";
import { SchemaField } from "@/constants/socket-constants";
import { formatLabel } from "@/components/socket/utils/label-util";
import { cn } from "@/utils";

interface SocketTaskSwitchProps {
  taskId: string;
  fieldName: string;
  fieldDefinition: SchemaField;
  fullPath: string;
  value: any;
}

const SocketTaskSwitch: React.FC<SocketTaskSwitchProps> = ({ taskId, fieldName, fieldDefinition, fullPath, value }) => {

  const hasError = false; // Get from Redux later
  const notice = ""; // Get from Redux later

    const labelContent = (
        <div className="flex items-start gap-1">
            <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldName)}</span>
            {fieldDefinition.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
        </div>
    );

    // Use ICON_NAME with fallback to deprecated iconName
    const iconName = fieldDefinition.ICON_NAME || fieldDefinition.iconName || "File";
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.File;
    const placeholder = fieldDefinition.DESCRIPTION;

    const props: Record<string, any> = {};
    for (const [key, value] of Object.entries(fieldDefinition.COMPONENT_PROPS)) {
        if (key === "className" && props.className) {
            props.className = cn(props.className, value as string);
        } else {
            props[key] = value;
        }
    }

    const handleChange = (checked: boolean) => {
        console.log("handleChange", checked);
        //onChange(fullPath, checked);
    };

    const handleBlur = () => {
        console.log("handleBlur", value);
        //onBlur(fullPath, fieldDefinition, value);
    };


  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch
          checked={!!value}
          onCheckedChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        <Icon className="w-4 h-4 mr-2 text-slate-500" />
        <Label className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</Label>
      </div>
    </div>
  );
};

export default SocketTaskSwitch; 
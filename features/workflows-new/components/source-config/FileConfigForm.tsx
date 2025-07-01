import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JsonEditor from "./JsonEditor";
import { Checkbox } from "@/components/ui/checkbox";

// File Configuration Form
const FileConfigForm = ({ config, onChange }) => {
    const updateField = (field, value) => {
        onChange({
            ...config,
            file_config: { ...config.file_config, [field]: value },
        });
    };

    const fileConfig = config.file_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="file_path">File Path *</Label>
                    <Input
                        id="file_path"
                        value={fileConfig.file_path}
                        onChange={(e) => updateField("file_path", e.target.value)}
                        placeholder="/path/to/data.json"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="file_type">File Type</Label>
                    <Select value={fileConfig.file_type} onValueChange={(value) => updateField("file_type", value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="xml">XML</SelectItem>
                            <SelectItem value="txt">Text</SelectItem>
                            <SelectItem value="yaml">YAML</SelectItem>
                            <SelectItem value="parquet">Parquet</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="encoding">Encoding</Label>
                    <Input
                        id="encoding"
                        value={fileConfig.encoding}
                        onChange={(e) => updateField("encoding", e.target.value)}
                        placeholder="utf-8"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="watch_for_changes"
                        checked={fileConfig.watch_for_changes}
                        onCheckedChange={(checked) => updateField("watch_for_changes", checked)}
                    />
                    <Label htmlFor="watch_for_changes">Watch for Changes</Label>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Parse Options (JSON)</Label>
                <JsonEditor
                    value={fileConfig.parse_options}
                    onChange={(value) => updateField("parse_options", value)}
                    placeholder='{"delimiter": ",", "header": true}'
                />
            </div>
        </div>
    );
};

export default FileConfigForm;

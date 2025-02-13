import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TailwindColorPicker = () => {
  const [type, setType] = useState('bg');
  const [state, setState] = useState('normal');
  const [color, setColor] = useState('blue');
  const [shade, setShade] = useState(500);

  const types = [
    { value: 'bg', label: 'Background' },
    { value: 'border', label: 'Border' },
    { value: 'hover', label: 'Hover' },
    { value: 'text', label: 'Text' }
  ];

  const states = [
    { value: 'normal', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'both', label: 'Both' }
  ];

  const colors = [
    'slate', 'gray', 'zinc', 'neutral', 'stone',
    'red', 'orange', 'amber', 'yellow', 'lime',
    'green', 'emerald', 'teal', 'cyan', 'sky',
    'blue', 'indigo', 'violet', 'purple', 'fuchsia',
    'pink', 'rose'
  ];

  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  const generateClassName = () => {
    let prefix = '';
    if (type === 'hover') {
      prefix = 'hover:bg';
    } else if (type === 'border') {
      prefix = 'border border';
    } else {
      prefix = type;
    }

    const className = `${prefix}-${color}-${shade}`;
    return state === 'dark' ? `dark:${className}` : className;
  };

  return (
    <div className="w-full max-w-md space-y-6 p-4 border rounded-lg">
      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            <RadioGroup
              value={type}
              onValueChange={setType}
              className="flex gap-4"
            >
              {types.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`type-${value}`} />
                  <Label htmlFor={`type-${value}`}>{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div>
          <Label>Mode</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            <RadioGroup
              value={state}
              onValueChange={setState}
              className="flex gap-4"
            >
              {states.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`state-${value}`} />
                  <Label htmlFor={`state-${value}`}>{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div>
          <Label>Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Shade ({shade})</Label>
          <div className="mt-2">
            <Select value={shade.toString()} onValueChange={(value) => setShade(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shades.map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Label>Generated Class</Label>
          <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-sm">
            {generateClassName()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindColorPicker;
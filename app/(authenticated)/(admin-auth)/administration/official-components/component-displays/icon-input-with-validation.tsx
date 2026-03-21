'use client';

import React, { useState } from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import IconInputWithValidation, { IconInputCompact } from '@/components/official/IconInputWithValidation';
import { Label } from '@/components/ui/label';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function IconInputWithValidationDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;

  const [iconName1, setIconName1] = useState('Home');
  const [iconName2, setIconName2] = useState('');
  const [iconName3, setIconName3] = useState('sparkles'); // lowercase to demonstrate auto-capitalize
  
  // Example code with all available props
  const code = `import IconInputWithValidation, { IconInputCompact } from '@/components/official/IconInputWithValidation';

// Full Version - With helper text and Lucide link
<IconInputWithValidation
  value={iconName}
  onChange={setIconName}
  placeholder="e.g., Sparkles"        // Default: "e.g., Sparkles"
  className=""                        // Additional className for input
  id="icon-input"                     // For label association
  disabled={false}                    // Default: false
  showLucideLink={true}               // Default: true - shows link to lucide.dev
/>

// Compact Version - No helper text (perfect for tight spaces)
<IconInputCompact
  value={iconName}
  onChange={setIconName}
  placeholder="Icon name"
  className="h-9"                     // Match form input heights
  id="shortcut-icon"
/>

// Real-world example from ShortcutFormFields.tsx:
<div className="space-y-1.5">
  <Label htmlFor="shortcut-icon">Icon Name</Label>
  <IconInputWithValidation
    id="shortcut-icon"
    value={formData.icon_name || ''}
    onChange={(value) => onChange({ icon_name: value || null })}
    placeholder="e.g., Sparkles"
    className="h-9"
  />
</div>

// Features:
// ✅ Real-time validation with visual feedback
// ✅ Green checkmark when valid, red X when invalid
// ✅ Live icon preview when validated
// ✅ Auto-capitalizes first letter (sparkles → Sparkles)
// ✅ Press Enter to validate
// ✅ Link to Lucide icons reference
// ✅ Seamlessly replaces standard Input component`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="All-in-one icon name input with real-time validation, live preview, auto-capitalization, and visual feedback. Perfect for forms where users need to enter Lucide icon names."
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Demo 1: Full version with validation */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Full Version - With Helper Text
          </h3>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="demo-1">Icon Name</Label>
              <IconInputWithValidation
                id="demo-1"
                value={iconName1}
                onChange={setIconName1}
                placeholder="e.g., Sparkles"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current value: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                {iconName1 || '(empty)'}
              </code>
            </p>
          </div>
        </div>

        {/* Demo 2: Auto-capitalization */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Auto-Capitalization Demo
          </h3>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="demo-3">Try Lowercase Icon Name</Label>
              <IconInputWithValidation
                id="demo-3"
                value={iconName3}
                onChange={setIconName3}
                placeholder="Try typing 'star' or 'heart'"
              />
            </div>
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                💡 <strong>Tip:</strong> Type a lowercase icon name (like "star" or "heart") and click validate.
                The component will automatically try capitalizing it if the lowercase version fails.
              </p>
            </div>
          </div>
        </div>

        {/* Demo 3: Compact version */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Compact Version - No Helper Text
          </h3>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="demo-2">Icon Name (Compact)</Label>
              <IconInputCompact
                id="demo-2"
                value={iconName2}
                onChange={setIconName2}
                placeholder="Icon name"
                className="h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Perfect for forms with limited space. Same validation, no helper text.
            </p>
          </div>
        </div>

        {/* Features showcase */}
        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Component Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Real-time validation with visual feedback</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Live icon preview when valid</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Auto-capitalizes first letter</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Press Enter to validate</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Link to Lucide icons reference</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Seamless Input replacement</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Works with IconResolver</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Zero layout shift</span>
            </div>
          </div>
        </div>

        {/* Usage tips */}
        <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Usage Tips
          </h3>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
            <li>Click the refresh icon or press Enter to validate</li>
            <li>Green checkmark = icon found and valid</li>
            <li>Red X = icon not found</li>
            <li>Lowercase names auto-capitalize (e.g., "star" → "Star")</li>
            <li>All 1000+ Lucide icons supported via IconResolver</li>
            <li>Click "Browse icons" link to explore available icons</li>
          </ul>
        </div>
      </div>
    </ComponentDisplayWrapper>
  );
}


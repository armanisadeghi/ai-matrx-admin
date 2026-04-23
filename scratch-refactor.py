import os
import re

files = [
    "components/socket/task-builder/SchemaBuilder.tsx",
    "components/matrx/AnimatedRevealCard/StandardAnimatedRevealCard.tsx",
    "components/matrx/AnimatedRevealCard/SmallAnimatedRevealCard.tsx",
    "components/socket/form-builder/ArrayField.tsx",
    "components/socket/form-builder/FormField.tsx",
    "components/socket-io/form-builder/ArrayField.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskSwitch.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskInput.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskMultiFileUpload.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskJsonEditor.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskRadioGroup.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskSlider.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskCheckbox.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskTextarea.tsx",
    "components/socket-io/form-builder/field-components/SocketTaskSelect.tsx",
    "components/admin/applet-admin/AppConfigViewer.tsx",
    "components/ui/icon-picker.tsx",
    "features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx",
    "features/agent-context/components/ContextPickerPrimitives.tsx",
    "features/agents/components/run-controls/AgentLauncherSidebarTester.tsx",
    "features/agents/components/run-controls/AgentWidgetInvokerTester.tsx",
    "features/agents/components/widgets/AgentWidgetsPage.tsx",
    "features/agents/components/tools-management/AgentToolsManager.tsx",
    "app/(authenticated)/demo/code-generator/components/DynamicComponentRenderer.tsx",
    "components/matrx/ArmaniForm/action-system/icons/iconRegistry.tsx"
]

def process_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
        original_content = content
            
        # 1. Replace `import * as LucideIcons from "lucide-react"`
        # We need to collect all static usages like LucideIcons.Trash and convert them.
        static_usages = set(re.findall(r'LucideIcons\.([A-Z][a-zA-Z0-9_]*)', content))
        
        # Remove "LucideProps" if caught
        static_usages.discard("LucideProps")
        
        # If there are dynamic usages, we need to import DynamicIcon
        needs_dynamic = "LucideIcons" in content and ("[" in content or "as any" in content or "as Record" in content)
        
        if needs_dynamic:
            # We'll import DynamicIcon. But where? After the lucide-react import
            pass
            
        # Do replacements for specific known patterns first.
        
        # Pattern A: `const Icon = (LucideIcons as any)[iconName] || LucideIcons.Files;` -> `return <DynamicIcon name={iconName} fallbackIcon="Files" ...`
        # Wait, the pattern is usually inside `return <Icon ... />`
        # Let's replace the `const Icon = ...` line and the `<Icon ... />` line.
        # Actually, let's just replace `const Icon = (LucideIcons as any)[...` with `const Icon = (props: any) => <DynamicIcon name={...} {...props} />`
        # For example: `const Icon = (LucideIcons as any)[iconName] || LucideIcons.Files;`
        # becomes `const Icon = (props: any) => <DynamicIcon name={iconName} fallbackIcon="Files" {...props} />;`
        
        def dynamic_replacer(m):
            var_name = m.group(1) # e.g. field.ICON_NAME or iconName
            fallback = m.group(2) if m.group(2) else "Zap"
            return f'const Icon = (props: any) => <DynamicIcon name={{{var_name}}} fallbackIcon="{fallback}" {{...props}} />;'
        
        content = re.sub(r'const Icon = \(LucideIcons as any\)\[(.*?)\] \|\| LucideIcons\.([A-Z][a-zA-Z0-9_]*);', dynamic_replacer, content)
        content = re.sub(r'const Icon = \(LucideIcons as any\)\[(.*?)\];', r'const Icon = (props: any) => <DynamicIcon name={\1} {...props} />;', content)
        
        content = re.sub(r'const IconComponent = \(LucideIcons as any\)\[(.*?)\];', r'const IconComponent = (props: any) => <DynamicIcon name={\1} {...props} />;', content)
        content = re.sub(r'const IconComponent = LucideIcons\[(.*?) as keyof typeof LucideIcons\].*?;', r'const IconComponent = (props: any) => <DynamicIcon name={\1} {...props} />;', content)
        content = re.sub(r'const IconComponent = \(LucideIcons\[(.*?)\] \|\| LucideIcons\.([A-Z][a-zA-Z0-9_]*)\).*?;', r'const IconComponent = (props: any) => <DynamicIcon name={\1} fallbackIcon="\2" {...props} />;', content)
        content = re.sub(r'const IconComponent = \(LucideIcons as Record<string, unknown>\)\[(.*?)\] as.*?;', r'const IconComponent = (props: any) => <DynamicIcon name={\1} {...props} />;', content)
        
        # Replace static tags `<LucideIcons.Trash` -> `<Trash`
        content = re.sub(r'<LucideIcons\.([A-Z][a-zA-Z0-9_]*)', r'<\1', content)
        content = re.sub(r'</LucideIcons\.([A-Z][a-zA-Z0-9_]*)', r'</\1', content)
        
        # Replace `return Boolean((LucideIcons as any)[iconName]);` -> `return true; // We assume it exists for now or use isIconRegisteredSync`
        # Actually `isIconRegisteredSync` is in IconResolver. Let's just import it if needed.
        if "return Boolean((LucideIcons as any)" in content:
            content = content.replace("return Boolean((LucideIcons as any)[iconName]);", "return isIconRegisteredSync(iconName);")
            static_usages.add("IS_ICON_REGISTERED")
            
        # Replace remaining `(LucideIcons as any)[something]` with `(props: any) => <DynamicIcon name={something} {...props} />`
        # Wait, if it's like `const CurrentIcon = value ? (LucideIcons as any)[value] : null;`
        content = re.sub(r'\(LucideIcons as any\)\[(.*?)\]', r'((props: any) => <DynamicIcon name={\1} {...props} />)', content)

        # Check what static usages we actually need
        actual_static = set()
        for su in static_usages:
            if su == "IS_ICON_REGISTERED": continue
            if re.search(rf'\b{su}\b', content):
                actual_static.add(su)
        
        # Now fix imports
        import_stmt = ""
        if actual_static:
            import_stmt += f'import {{ {", ".join(sorted(actual_static))} }} from "lucide-react";\n'
        
        # Add DynamicIcon import
        needs_dynamic = "DynamicIcon" in content or "isIconRegisteredSync" in content
        if needs_dynamic:
            imports_dynamic = ["DynamicIcon"]
            if "isIconRegisteredSync" in content:
                imports_dynamic.append("isIconRegisteredSync")
            import_stmt += f'import {{ {", ".join(imports_dynamic)} }} from "@/components/official/icons/IconResolver";\n'

        # Remove old import
        content = re.sub(r'import \* as LucideIcons from [\'"]lucide-react[\'"];?\n?', import_stmt, content)
        
        # Remove any leftover LucideIcons. prefix on static names (e.g. fallbackIcon={LucideIcons.Trash})
        content = re.sub(r'LucideIcons\.([A-Z][a-zA-Z0-9_]*)', r'\1', content)
        
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Updated {filepath}")
            
    except Exception as e:
        print(f"Failed on {filepath}: {e}")

for f in files:
    process_file(f)

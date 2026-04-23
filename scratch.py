import os
import re
import glob

files = [
    "components/matrx/ArmaniForm/action-system/icons/iconRegistry.tsx",
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
    "app/(authenticated)/demo/code-generator/components/DynamicComponentRenderer.tsx"
]

for f in files:
    try:
        with open(f, 'r') as file:
            content = file.read()
            
            # Find dynamic access
            matches = re.findall(r'.*LucideIcons.*\[.*', content)
            if matches:
                print(f"--- {f} ---")
                for match in matches:
                    print(match.strip())
                    
            matches_as_any = re.findall(r'\(LucideIcons as any\).*', content)
            if matches_as_any:
                print(f"--- {f} ---")
                for match in matches_as_any:
                    print(match.strip())
    except Exception as e:
        print(f"Error reading {f}: {e}")

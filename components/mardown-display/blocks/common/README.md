# Common Content Block Components

## ContentBlockWrapper

A reusable wrapper component for content blocks (quizzes, presentations, math problems, etc.) that provides consistent functionality across all content types.

### Features

- **Fullscreen Mode**: Toggle between inline and fullscreen display
- **Canvas Integration**: Open content in the Canvas workspace
- **Download/Upload**: Save and load content as JSON files
- **Save Management**: Display save status and manual save button
- **Custom Actions**: Add block-specific actions with custom icons
- **Responsive**: Adapts to different screen sizes
- **Keyboard Support**: ESC to exit fullscreen

### Basic Usage

```tsx
import { ContentBlockWrapper } from '@/components/mardown-display/blocks/common';

<ContentBlockWrapper
    title="My Content Title"
    subtitle="Category or Module"
    onDownload={() => downloadMyContent()}
    onUpload={async () => await uploadMyContent()}
    allowFullscreen={true}
>
    <YourContentComponent />
</ContentBlockWrapper>
```

### Props

#### Content
- `children`: ReactNode - The main content to display
- `title`: string (optional) - Title shown in header
- `subtitle`: string (optional) - Subtitle/category badge

#### Canvas Integration
- `enableCanvas`: boolean (default: true) - Show canvas button
- `canvasType`: string - Type identifier for canvas
- `canvasData`: any - Data to pass to canvas
- `canvasMetadata`: Record<string, any> - Additional metadata

#### Save/Download
- `onDownload`: () => void - Download handler
- `onUpload`: () => Promise<void> - Upload handler
- `onSave`: () => Promise<void> - Manual save handler
- `isSaving`: boolean - Save in progress indicator
- `lastSaved`: Date | null - Last save timestamp
- `saveError`: string | null - Save error message

#### Fullscreen
- `defaultFullscreen`: boolean - Start in fullscreen
- `allowFullscreen`: boolean (default: true) - Enable fullscreen toggle
- `closeOnEscape`: boolean (default: true) - ESC closes fullscreen

#### Custom Actions
- `customActions`: ContentBlockAction[] - Additional action buttons

```ts
{
    icon: LucideIcon,
    tooltip: string,
    onClick: () => void,
    disabled?: boolean,
    className?: string,
    hidden?: boolean
}
```

#### Styling
- `className`: string - Wrapper classes
- `contentClassName`: string - Content area classes
- `fullscreenClassName`: string - Fullscreen mode classes

#### Other
- `headerContent`: ReactNode - Custom content in header

### Example: Math Problem Block

```tsx
<ContentBlockWrapper
    title={problem.title}
    subtitle={`${problem.topic_name} • ${problem.module_name}`}
    enableCanvas={true}
    canvasType="math_problem"
    canvasData={problemData}
    canvasMetadata={{
        title: problem.title,
        course: problem.course_name
    }}
    onDownload={handleDownload}
    onUpload={handleUpload}
    customActions={[
        {
            icon: Database,
            tooltip: "Save to database",
            onClick: handleSaveToDb,
            className: "bg-indigo-500 text-white"
        }
    ]}
    allowFullscreen={true}
>
    <MathProblem {...problem} />
</ContentBlockWrapper>
```

### Migrating Existing Blocks

1. Import the wrapper
2. Wrap your content component
3. Move action buttons to props
4. Remove custom fullscreen logic
5. Add canvas/save integration

The wrapper handles all common functionality while allowing blocks to maintain their custom logic and appearance.


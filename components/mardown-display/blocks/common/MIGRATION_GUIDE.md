# Content Block Wrapper Migration Guide

This guide helps you migrate existing content blocks to use the new `ContentBlockWrapper`.

## Benefits

✅ **Consistent UX**: All blocks have the same controls and behavior  
✅ **Less Code**: Reduce duplication across blocks  
✅ **Canvas Integration**: Automatic canvas support  
✅ **Save/Load**: Built-in download/upload functionality  
✅ **Fullscreen**: Consistent fullscreen experience  
✅ **Maintainable**: Update all blocks by updating one wrapper  

## Migration Steps

### 1. Identify Common Functionality

Look for code in your block that handles:
- Fullscreen toggle
- Download/upload buttons
- Canvas integration
- Action button layout
- ESC key handling

### 2. Extract Data Handlers

Create separate functions for:
- `downloadMyContent()` - Convert data to JSON and download
- `uploadMyContent()` - Read JSON file and parse
- `saveMyContent()` - Save to database (optional)

### 3. Wrap Your Component

```tsx
// Before
<div className="my-block">
    <div className="header">
        <h1>{title}</h1>
        <button onClick={toggleFullscreen}>Fullscreen</button>
        <button onClick={download}>Download</button>
    </div>
    <MyContentComponent {...props} />
</div>

// After
<ContentBlockWrapper
    title={title}
    onDownload={download}
    allowFullscreen={true}
>
    <MyContentComponent {...props} />
</ContentBlockWrapper>
```

### 4. Remove Duplicate Code

Delete from your component:
- Fullscreen state management
- ESC key listeners
- Action button rendering
- Canvas integration logic

### 5. Add Custom Actions

```tsx
const customActions = [
    {
        icon: YourIcon,
        tooltip: "Your action",
        onClick: handleYourAction,
        className: "bg-blue-500 text-white"
    }
];

<ContentBlockWrapper customActions={customActions}>
    ...
</ContentBlockWrapper>
```

## Example: Quiz Block

### Before (Simplified)

```tsx
const QuizBlock = ({ quizData }) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsFullScreen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);
    
    const handleDownload = () => {
        const json = JSON.stringify(quizData);
        // ... download logic
    };
    
    return (
        <div className={isFullScreen ? "fullscreen" : "inline"}>
            <div className="header">
                <h1>{quizData.title}</h1>
                <button onClick={() => setIsFullScreen(!isFullScreen)}>
                    {isFullScreen ? 'Exit' : 'Fullscreen'}
                </button>
                <button onClick={handleDownload}>Download</button>
            </div>
            <QuizContent data={quizData} />
        </div>
    );
};
```

### After

```tsx
const QuizBlock = ({ quizData }) => {
    const handleDownload = () => {
        downloadQuizData(quizData);
    };
    
    const handleUpload = async () => {
        return await uploadQuizData();
    };
    
    return (
        <ContentBlockWrapper
            title={quizData.title}
            subtitle={quizData.category}
            canvasType="quiz"
            canvasData={quizData}
            onDownload={handleDownload}
            onUpload={handleUpload}
            allowFullscreen={true}
        >
            <QuizContent data={quizData} />
        </ContentBlockWrapper>
    );
};
```

## Common Patterns

### With Save Functionality

```tsx
const [isSaving, setIsSaving] = useState(false);
const [lastSaved, setLastSaved] = useState(null);

const handleSave = async () => {
    setIsSaving(true);
    try {
        await saveToDatabase(data);
        setLastSaved(new Date());
    } catch (error) {
        // Handle error
    } finally {
        setIsSaving(false);
    }
};

<ContentBlockWrapper
    onSave={handleSave}
    isSaving={isSaving}
    lastSaved={lastSaved}
>
    ...
</ContentBlockWrapper>
```

### With Custom Header Content

```tsx
<ContentBlockWrapper
    title="My Block"
    headerContent={
        <div className="flex justify-between mb-2">
            <span>Progress: {progress}%</span>
            <span>Time: {formatTime(elapsed)}</span>
        </div>
    }
>
    ...
</ContentBlockWrapper>
```

### With State Management

```tsx
const [data, setData] = useState(initialData);

const handleUpload = async () => {
    const uploaded = await uploadData();
    setData(uploaded); // Update local state
};

<ContentBlockWrapper
    onUpload={handleUpload}
>
    <MyComponent data={data} />
</ContentBlockWrapper>
```

## Testing Checklist

After migration, test:
- [ ] Fullscreen toggle works
- [ ] ESC key exits fullscreen
- [ ] Download saves correct JSON
- [ ] Upload loads file correctly
- [ ] Canvas button appears when available
- [ ] Custom actions render properly
- [ ] Save indicators show correctly
- [ ] Mobile responsive behavior
- [ ] Dark mode styling
- [ ] Keyboard navigation

## Block-Specific Features

The wrapper **does not** handle:
- Internal content state
- Content-specific UI
- Custom validation
- Block-specific calculations
- Scoring/grading logic
- Content rendering

Keep these in your content component!

## Need Help?

See `README.md` for full API documentation or check the Math Problem Block implementation as a complete example.


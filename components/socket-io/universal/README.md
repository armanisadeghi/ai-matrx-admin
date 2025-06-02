# 🚀 **SocketExecuteButton - Universal Socket Execution**

The **most powerful** and **flexible** socket execution component in your entire codebase. Drop it anywhere and get instant socket.io execution with optional inputs and custom responses.

---

## **🎯 Three Modes of Operation**

### **1. 🏃‍♂️ Simple Mode (No Inputs)**
**One click → Instant execution**

```tsx
<SocketExecuteButton 
  presetName="my_preset"
  sourceData={myData}
  buttonText="Run Analysis"
/>
```

### **2. ⚙️ Input Mode (With Configuration)**
**Click → Configure → Execute**

```tsx
<SocketExecuteButton 
  presetName="workflow_step_to_execute_single_step"
  sourceData={stepData}
  AdditionalDataComponent={StepInputsComponent}
  buttonText="Test Step"
  overlayTitle="Configure Step Execution"
/>
```

### **3. 🎨 Custom Response Mode**
**Click → Execute → Custom Results**

```tsx
<SocketExecuteButton 
  presetName="my_preset"
  sourceData={myData}
  ResponseComponent={CustomResultsComponent}
  buttonText="Advanced Execute"
/>
```

---

## **📋 Complete API Reference**

### **Core Props (Required)**
```tsx
interface SocketExecuteButtonProps {
  presetName: string;      // Which preset to use
  sourceData: any;         // Your application data
}
```

### **Component Customization (Optional)**
```tsx
interface SocketExecuteButtonProps {
  // Input handling
  AdditionalDataComponent?: React.ComponentType<{
    sourceData: any;
    onDataChange: (newData: any) => void;
    onExecute: () => void;
  }>;
  
  // Response handling  
  ResponseComponent?: React.ComponentType<{
    taskId: string | null;
    isExecuting: boolean;
    error: string | null;
  }>;
}
```

### **UI Customization (Optional)**
```tsx
interface SocketExecuteButtonProps {
  buttonText?: string;           // "Execute" 
  overlayTitle?: string;         // "Execute Task"
  overlayDescription?: string;   // Optional description
  executeButtonText?: string;    // "Execute"
  
  // All Button props supported
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  // ... etc
}
```

### **Behavior Control (Optional)**
```tsx
interface SocketExecuteButtonProps {
  autoExecute?: boolean;    // true - Execute immediately if no inputs
  showOverlay?: boolean;    // true - Show overlay for results
}
```

### **Callbacks (Optional)**
```tsx
interface SocketExecuteButtonProps {
  onExecuteStart?: (data: any) => void;
  onExecuteComplete?: (taskId: string) => void;
  onExecuteError?: (error: string) => void;
}
```

---

## **🔥 Real-World Examples**

### **Simple Recipe Execution**
```tsx
// Just run it!
<SocketExecuteButton 
  presetName="recipe_data_to_run_recipe"
  sourceData={recipeData}
  buttonText="🍳 Cook Recipe"
  variant="outline"
/>
```

### **Workflow Step Testing** 
```tsx
// The StepInputsComponent handles arg_mapping
<SocketExecuteButton 
  presetName="workflow_step_to_execute_single_step"
  sourceData={workflowStep}
  AdditionalDataComponent={StepDirectInputs}
  buttonText="🧪 Test Step"
  overlayTitle="Test Workflow Step"
  overlayDescription="Configure direct inputs and execute"
/>
```

### **Advanced Analytics with Custom Results**
```tsx
<SocketExecuteButton 
  presetName="analytics_preset"
  sourceData={analyticsData}
  ResponseComponent={AnalyticsChartComponent}
  buttonText="📊 Run Analytics"
  onExecuteComplete={(taskId) => {
    analytics.track('analytics_executed', { taskId });
  }}
/>
```

### **Background Processing**
```tsx
<SocketExecuteButton 
  presetName="background_job_preset"
  sourceData={jobData}
  showOverlay={false}  // No overlay, just execute
  autoExecute={true}
  buttonText="⚡ Start Background Job"
  onExecuteComplete={(taskId) => {
    toast.success(`Job started: ${taskId}`);
  }}
/>
```

---

## **🛠️ Creating Input Components**

### **Example: StepDirectInputs Component**
```tsx
interface StepDirectInputsProps {
  sourceData: any;
  onDataChange: (newData: any) => void;
  onExecute: () => void;
}

const StepDirectInputs: React.FC<StepDirectInputsProps> = ({
  sourceData,
  onDataChange,
  onExecute
}) => {
  const [inputs, setInputs] = useState(parseArgMapping(sourceData));
  
  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index].value = value;
    setInputs(newInputs);
    
    // Update the parent data
    onDataChange({
      ...sourceData,
      user_inputs: newInputs.map(input => ({
        broker_id: input.brokerId,
        value: input.value
      }))
    });
  };
  
  return (
    <div className="space-y-4">
      {inputs.map((input, index) => (
        <div key={input.brokerId}>
          <Label>{input.argName}</Label>
          <Input 
            value={input.value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            placeholder={`Enter ${input.argName}`}
          />
        </div>
      ))}
      
      {/* Optional: Add execute button here too */}
      <Button onClick={onExecute} className="w-full">
        Execute Now
      </Button>
    </div>
  );
};
```

### **Example: Custom Response Component**
```tsx
interface CustomResponseProps {
  taskId: string | null;
  isExecuting: boolean;
  error: string | null;
}

const AnalyticsResponse: React.FC<CustomResponseProps> = ({ 
  taskId, 
  isExecuting, 
  error 
}) => {
  const results = useSocketResults(taskId); // Your custom hook
  
  if (isExecuting) {
    return <LoadingSpinner text="Running analytics..." />;
  }
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  if (!results) {
    return <div>Waiting for results...</div>;
  }
  
  return (
    <div>
      <AnalyticsChart data={results.chartData} />
      <MetricsTable metrics={results.metrics} />
    </div>
  );
};
```

---

## **💡 Pro Tips**

### **🎯 When to Use Each Mode**

**Simple Mode:** 
- Data processing tasks
- Background jobs  
- Quick actions
- API calls

**Input Mode:**
- User configuration needed
- Dynamic parameters
- Complex workflows
- Testing scenarios

**Custom Response Mode:**
- Charts and visualizations
- Custom data formatting
- Integration with other systems
- Specialized UI needs

### **🚀 Performance Optimizations**

```tsx
// Memoize heavy data processing
const processedData = useMemo(() => 
  expensiveDataProcessing(rawData), [rawData]
);

<SocketExecuteButton 
  presetName="heavy_processing"
  sourceData={processedData}
/>
```

### **🔗 Integration Patterns**

```tsx
// In a list/table row
{items.map(item => (
  <div key={item.id} className="flex items-center gap-2">
    <span>{item.name}</span>
    <SocketExecuteButton 
      presetName="process_item"
      sourceData={item}
      size="sm"
      variant="ghost"
      buttonText="Process"
    />
  </div>
))}

// As a card action
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <SocketExecuteButton 
      presetName="card_action"
      sourceData={cardData}
      className="w-full"
    />
  </CardFooter>
</Card>
```

---

## **🎉 Why This Is Revolutionary**

✅ **Drop anywhere** - Works in any component  
✅ **Zero boilerplate** - No manual socket handling  
✅ **Flexible inputs** - Custom configuration components  
✅ **Custom responses** - Your own result display  
✅ **Smart defaults** - Works great out of the box  
✅ **Full control** - Override everything if needed  

**This one component replaces hundreds of lines of socket handling code!** 🚀 
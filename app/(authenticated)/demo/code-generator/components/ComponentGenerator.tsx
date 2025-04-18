'use client';
import DynamicComponentRenderer from './DynamicComponentRenderer';
import React, { useState, useEffect } from 'react'; 
import AIAssistant from './AIAssistant';
import CodeEditor from './CodeEditor';
import ComponentManager from './ComponentManager';


// Main application component that orchestrates everything
const ComponentGenerator = () => {
  const [code, setCode] = useState('');
  const [savedComponents, setSavedComponents] = useState([]);
  const [currentComponentName, setCurrentComponentName] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Example initial code to help users get started
  const initialCode = `
// You can use React hooks and Tailwind CSS here
function MyComponent() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Hello from My Component!</h2>
      <p className="mb-2 text-gray-700 dark:text-gray-300">You clicked the button {count} times</p>
      <button 
        className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        onClick={() => setCount(count + 1)}
      >
        Click me
      </button>
    </div>
  );
}

// This component will be rendered in the preview
render(<MyComponent />);
  `.trim();

  useEffect(() => {
    // Initialize with example code
    if (!code) {
      setCode(initialCode);
    }
    
    // In a real app, you'd load saved components from your database here
    // For demo purposes, we'll use localStorage
    const loadSavedComponents = async () => {
      try {
        const saved = localStorage.getItem('savedComponents');
        if (saved) {
          setSavedComponents(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load saved components:', err);
      }
    };
    
    loadSavedComponents();
  }, []);

  // Reset code to initial example
  const resetCode = () => {
    setCode(initialCode);
  };

  // Simulate AI code generation (in real app, this would call your AI service)
  const generateWithAI = async (prompt) => {
    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example AI response based on prompt
    let suggestion = '';
    if (prompt.includes('counter')) {
      suggestion = `
function CounterComponent() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Interactive Counter</h2>
      <div className="flex items-center justify-between max-w-xs mx-auto">
        <button 
          className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
          onClick={() => setCount(prev => Math.max(0, prev - 1))}
        >
          -
        </button>
        <span className="text-3xl font-bold text-gray-700 dark:text-gray-300">{count}</span>
        <button 
          className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
          onClick={() => setCount(prev => prev + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

render(<CounterComponent />);
      `;
    } else if (prompt.includes('form')) {
      suggestion = `
function FormComponent() {
  const [formData, setFormData] = React.useState({ name: '', email: '' });
  const [submitted, setSubmitted] = React.useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Here you would typically send data to an API
  };
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      {submitted ? (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-500 mb-2">Form Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-300">Thank you, {formData.name}.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            onClick={() => setSubmitted(false)}
          >
            Submit Another
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Contact Form</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </form>
        </>
      )}
    </div>
  );
}

render(<FormComponent />);
      `;
    } else {
      suggestion = `
function CustomComponent() {
  return (
    <div className="p-6 bg-gradient-to-r from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700 rounded-xl text-white shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Custom Component</h2>
      <p className="mb-4">This is a custom component generated based on your request.</p>
      <p className="italic text-sm">Try asking for specific features like a "counter" or "form"</p>
    </div>
  );
}

render(<CustomComponent />);
      `;
    }
    
    setAiSuggestion(suggestion);
    setIsGenerating(false);
  };

  // Apply AI suggestion to editor
  const applySuggestion = () => {
    setCode(aiSuggestion);
    setAiSuggestion('');
  };

  // Save current component to database
  const saveComponent = async () => {
    if (!currentComponentName.trim()) {
      alert('Please enter a name for your component');
      return;
    }

    // In a real app, you would save to your database
    // For demo purposes, we'll use localStorage
    const newComponent = {
      id: Date.now().toString(),
      name: currentComponentName,
      code: code
    };
    
    const updatedComponents = [...savedComponents, newComponent];
    setSavedComponents(updatedComponents);
    
    try {
      localStorage.setItem('savedComponents', JSON.stringify(updatedComponents));
      alert(`Component "${currentComponentName}" saved successfully!`);
      setCurrentComponentName('');
    } catch (err) {
      console.error('Failed to save component:', err);
      alert('Failed to save component');
    }
  };

  // Load a saved component into the editor
  const loadComponent = (component) => {
    setCode(component.code);
    setCurrentComponentName(component.name);
  };

  // Delete a saved component
  const deleteComponent = (id) => {
    const updatedComponents = savedComponents.filter(comp => comp.id !== id);
    setSavedComponents(updatedComponents);
    localStorage.setItem('savedComponents', JSON.stringify(updatedComponents));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-800">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 text-white p-4">
        <h1 className="text-2xl font-bold">AI-Powered React Component Generator</h1>
        <p className="text-sm opacity-80">
          Create, test, and save custom React components with AI assistance
        </p>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Component Editor and AI Assistant */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* AI Assistant Section */}
          <AIAssistant 
            generateWithAI={generateWithAI}
            isGenerating={isGenerating}
            aiSuggestion={aiSuggestion}
            applySuggestion={applySuggestion}
          />
          
          {/* Code Editor */}
          <CodeEditor 
            code={code}
            setCode={setCode}
            resetCode={resetCode}
          />
          
          {/* Save Component Section */}
          <ComponentManager
            currentComponentName={currentComponentName}
            setCurrentComponentName={setCurrentComponentName}
            saveComponent={saveComponent}
            savedComponents={savedComponents}
            loadComponent={loadComponent}
            deleteComponent={deleteComponent}
          />
        </div>
        
        {/* Right Panel: Preview */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="bg-gray-100 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Live Preview</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto bg-white dark:bg-gray-900">
            <DynamicComponentRenderer code={code} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Export the main component for use in the app
export default ComponentGenerator;

// Also export the DynamicComponentRenderer so it can be used independently
export { DynamicComponentRenderer };
import React, { useState } from 'react';
import { CheckCircle, Circle, ChevronRight, Settings, Zap, Code, Database, Palette, Layout, Globe } from 'lucide-react';

const AppletStepper = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [appName, setAppName] = useState('My AI Applet');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  
  const steps = [
    { id: 1, title: 'Template', icon: <Layout size={18} /> },
    { id: 2, title: 'Intelligence', icon: <Zap size={18} /> },
    { id: 3, title: 'Data', icon: <Database size={18} /> },
    { id: 4, title: 'Customize', icon: <Palette size={18} /> },
    { id: 5, title: 'Logic', icon: <Code size={18} /> },
    { id: 6, title: 'Deploy', icon: <Globe size={18} /> }
  ];
  
  const templates = [
    { id: 'project', name: 'Project Management', description: 'Track tasks, deadlines, and team assignments' },
    { id: 'data', name: 'Data Management', description: 'Organize and analyze structured data' },
    { id: 'collab', name: 'Collaboration Hub', description: 'Create shared workspaces for your team' },
    { id: 'resource', name: 'Resource Allocation', description: 'Manage and schedule resources efficiently' },
    { id: 'bug', name: 'Bug Tracking', description: 'Log and prioritize issues and bugs' },
    { id: 'client', name: 'Client Portal', description: 'Create branded client-facing dashboards' },
  ];
  
  const colorOptions = [
    '#ef4444', '#f97316', '#f59e0b', '#16a34a', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef', '#8b5cf6', '#6b7280'
  ];
  
  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToStep = (stepId) => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };
  
  const StepIndicator = ({ step, isActive, isCompleted }) => {
    return (
      <div 
        className={`flex items-center group cursor-pointer ${isActive || isCompleted ? '' : 'opacity-50'}`}
        onClick={() => goToStep(step.id)}
      >
        <div className="flex items-center justify-center">
          {isCompleted ? (
            <CheckCircle size={24} className="text-indigo-600" />
          ) : (
            <div className={`flex items-center justify-center h-6 w-6 rounded-full border-2 ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-gray-400 text-gray-400'}`}>
              {step.icon}
            </div>
          )}
        </div>
        <span className={`ml-2 text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-600'}`}>
          {step.title}
        </span>
        {step.id !== steps.length && (
          <ChevronRight size={16} className="mx-2 text-gray-400" />
        )}
      </div>
    );
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Choose a template</h2>
              <p className="text-gray-600 mb-6">Start with a template or build from scratch</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div 
                    key={template.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all ${selectedTemplate === template.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-medium mb-2">Or, start with your data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                  <h4 className="font-medium">Import spreadsheets</h4>
                  <p className="text-sm text-gray-600 mt-1">Turn CSV, Excel, and Google Sheets into a powerful app.</p>
                </div>
                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                  <h4 className="font-medium">Import documents</h4>
                  <p className="text-sm text-gray-600 mt-1">Turn contracts, presentations, and other docs into structured data.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Add intelligence to your applet</h2>
            <p className="text-gray-600 mb-6">Choose AI capabilities for your application</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                <h3 className="font-medium">Natural Language Processing</h3>
                <p className="text-sm text-gray-600 mt-1">Extract insights, summarize content, and analyze sentiment</p>
              </div>
              <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                <h3 className="font-medium">Image Recognition</h3>
                <p className="text-sm text-gray-600 mt-1">Identify objects, faces, and scenes in images</p>
              </div>
              <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                <h3 className="font-medium">Predictive Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">Forecast trends and predict future outcomes</p>
              </div>
              <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                <h3 className="font-medium">Document AI</h3>
                <p className="text-sm text-gray-600 mt-1">Extract structured data from documents and forms</p>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Configure your data</h2>
            <p className="text-gray-600 mb-6">Set up tables, relationships, and permissions</p>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-medium mb-4">Data Structure</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tasks</span>
                  <span className="text-sm text-gray-500">15 records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Users</span>
                  <span className="text-sm text-gray-500">8 records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Projects</span>
                  <span className="text-sm text-gray-500">4 records</span>
                </div>
              </div>
              
              <button className="mt-4 text-indigo-600 text-sm font-medium flex items-center">
                <span>Add new table</span>
                <span className="ml-1">+</span>
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Customize your applet</h2>
            <p className="text-gray-600 mb-6">Configure the look and feel of your application</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applet Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                <div className="grid grid-cols-10 gap-2">
                  {colorOptions.map(color => (
                    <div
                      key={color}
                      className={`h-8 w-8 rounded-full cursor-pointer ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border-2 border-indigo-600 bg-indigo-50">
                    <h3 className="font-medium">Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1">Overview with key metrics</p>
                  </div>
                  <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                    <h3 className="font-medium">List View</h3>
                    <p className="text-sm text-gray-600 mt-1">Detailed record listing</p>
                  </div>
                  <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 cursor-pointer">
                    <h3 className="font-medium">Kanban</h3>
                    <p className="text-sm text-gray-600 mt-1">Visual process management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Add business logic</h2>
            <p className="text-gray-600 mb-6">Create workflows, automations, and validations</p>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-medium mb-4">Automations</h3>
              <p className="text-sm text-gray-600 mb-4">Create rules that run when conditions are met</p>
              
              <div className="space-y-4">
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center text-sm">
                    <span className="font-medium">When</span>
                    <span className="mx-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">Task status changes to "Complete"</span>
                  </div>
                  <div className="flex items-center text-sm mt-2">
                    <span className="font-medium">Then</span>
                    <span className="mx-2 px-2 py-1 bg-green-100 text-green-800 rounded">Send notification to project owner</span>
                  </div>
                </div>
                
                <button className="w-full py-2 flex items-center justify-center text-indigo-600 border-2 border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50">
                  <span>Add new automation</span>
                  <span className="ml-1">+</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Deploy your AI applet</h2>
            <p className="text-gray-600 mb-6">Publish and share your application</p>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-medium mb-4">Deployment Options</h3>
              
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                  <input
                    type="radio"
                    id="private"
                    name="deployment"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    defaultChecked
                  />
                  <label htmlFor="private" className="ml-3 block text-sm font-medium text-gray-700">
                    Private (Only invited members)
                  </label>
                </div>
                
                <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                  <input
                    type="radio"
                    id="team"
                    name="deployment"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="team" className="ml-3 block text-sm font-medium text-gray-700">
                    Team (All workspace members)
                  </label>
                </div>
                
                <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                  <input
                    type="radio"
                    id="public"
                    name="deployment"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="public" className="ml-3 block text-sm font-medium text-gray-700">
                    Public (Anyone with the link)
                  </label>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Launch Applet
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{appName || 'Untitled Applet'}</h1>
          <p className="text-gray-600">Create your AI-powered application in minutes</p>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-md">
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step) => (
            <StepIndicator
              key={step.id}
              step={step}
              isActive={currentStep === step.id}
              isCompleted={currentStep > step.id}
            />
          ))}
        </div>
        <div className="mt-4 h-1 bg-gray-200 rounded-full">
          <div 
            className="h-1 bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Step Content */}
      <div className="mb-8 min-h-96">
        {renderStepContent()}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 ${
            currentStep === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
          disabled={currentStep === 1}
        >
          Back
        </button>
        
        <button
          onClick={nextStep}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            currentStep === steps.length
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {currentStep === steps.length ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default AppletStepper;
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BoxIcon, FilePlus, Code, Search, Settings, PlayIcon } from 'lucide-react';

// Import our new component
import MultiAppletSelector from '@/features/applet/builder/modules/smart-parts/applets/MultiAppletSelector';
import { CustomAppletConfig } from '@/types/customAppTypes';

const MultiAppletSelectorDemo = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedApplets, setSelectedApplets] = useState<CustomAppletConfig[]>([]);
  const [workflowSelectedApplets, setWorkflowSelectedApplets] = useState<CustomAppletConfig[]>([]);
  const [dashboardSelectedApplets, setDashboardSelectedApplets] = useState<CustomAppletConfig[]>([]);
  const [integrationSelectedApplets, setIntegrationSelectedApplets] = useState<CustomAppletConfig[]>([]);
  const [maxSelections, setMaxSelections] = useState<number | undefined>(undefined);
  const [buttonVariant, setButtonVariant] = useState<string>('outline');
  const [buttonLabel, setButtonLabel] = useState<string>('Choose Applets');
  const [customEmptyText, setCustomEmptyText] = useState<string>('No applets selected');
  
  // Handle applet selection change
  const handleAppletsChange = (applets: CustomAppletConfig[]) => {
    setSelectedApplets(applets);
    toast({
      title: "Selection Updated",
      description: `Selected ${applets.length} applet${applets.length !== 1 ? 's' : ''}`,
      duration: 1500,
    });
  };
  
  // Handle create applet action
  const handleCreateApplet = () => {
    toast({
      title: "Create New Applet",
      description: "Opening applet creation flow",
      duration: 3000,
    });
  };
  
  // Reset all selections
  const handleReset = () => {
    setSelectedApplets([]);
    toast({
      title: "Selection Reset",
      description: "All selections have been cleared",
      duration: 1500,
    });
  };

  return (
    <div className="w-full h-full p-6 space-y-8">
      <Card className="border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-700/10 dark:from-emerald-600/20 dark:to-emerald-900/20">
          <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
            MultiAppletSelector Demo
          </CardTitle>
          <CardDescription>
            A component for selecting and displaying multiple applets
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="basic">Basic Usage</TabsTrigger>
              <TabsTrigger value="advanced">Configuration</TabsTrigger>
              <TabsTrigger value="examples">Real-World Examples</TabsTrigger>
            </TabsList>
            
            {/* Tab 1: Basic Usage */}
            <TabsContent value="basic" className="space-y-6">
              <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
                <h3 className="text-lg font-medium mb-4">Basic MultiAppletSelector</h3>
                
                <div className="mb-6">
                  <MultiAppletSelector
                    selectedApplets={selectedApplets}
                    onAppletsChange={handleAppletsChange}
                    onCreateApplet={handleCreateApplet}
                  />
                </div>
                
                <div className="p-4 bg-textured rounded-lg border-border">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-sm">Selected Applets ({selectedApplets.length})</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleReset}
                      disabled={selectedApplets.length === 0}
                    >
                      Reset Selection
                    </Button>
                  </div>
                  
                  {selectedApplets.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No applets selected. Click the button above to select applets.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedApplets.map(applet => (
                        <li key={applet.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                          <span className="font-medium">{applet.name}</span>
                          {applet.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {applet.description}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    This is the simplest implementation of the MultiAppletSelector. It displays 
                    the currently selected applets and provides an interface to add or remove them.
                  </p>
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Implementation Code</h3>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                    {`// Import the component
                    import MultiAppletSelector from '@/components/MultiAppletSelector';

                    // Set up state for selected applets
                    const [selectedApplets, setSelectedApplets] = useState<CustomAppletConfig[]>([]);

                    // Handle selection changes
                    const handleAppletsChange = (applets: CustomAppletConfig[]) => {
                    setSelectedApplets(applets);
                    };

                    // Render the component
                    <MultiAppletSelector
                    selectedApplets={selectedApplets}
                    onAppletsChange={handleAppletsChange}
                    onCreateApplet={handleCreateApplet}
                    />`}
                </pre>
                
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    The component manages the UI for selection, but your application maintains control 
                    of the selected data via state. This allows you to use the selected applets in other 
                    parts of your application, save them to a database, or perform other operations.
                  </p>
                </div>
              </div>
            </TabsContent>
            
            {/* Tab 2: Advanced Configuration */}
            <TabsContent value="advanced" className="space-y-6">
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Configurable Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="buttonLabel">Button Label</Label>
                      <Input
                        id="buttonLabel"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buttonVariant">Button Variant</Label>
                      <Select value={buttonVariant} onValueChange={setButtonVariant}>
                        <SelectTrigger id="buttonVariant" className="mt-1">
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="ghost">Ghost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="emptyText">Empty Selection Text</Label>
                      <Input
                        id="emptyText"
                        value={customEmptyText}
                        onChange={(e) => setCustomEmptyText(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="maxSelections">Max Selections</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="maxSelections"
                          type="number"
                          value={maxSelections || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            setMaxSelections(val);
                          }}
                        />
                        <div className="flex items-center space-x-1">
                          <Switch
                            id="limitToggle"
                            checked={maxSelections !== undefined}
                            onCheckedChange={(checked) => {
                              setMaxSelections(checked ? 3 : undefined);
                            }}
                          />
                          <Label htmlFor="limitToggle" className="text-sm">Limit</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Current Configuration</Label>
                      <div className="text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-border">
                        <code>
                          buttonLabel="{buttonLabel}"<br />
                          buttonVariant="{buttonVariant}"<br />
                          emptySelectionText="{customEmptyText}"<br />
                          maxSelections={maxSelections === undefined ? 'undefined' : maxSelections}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Configured Component</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-border">
                    <MultiAppletSelector
                      selectedApplets={selectedApplets}
                      onAppletsChange={handleAppletsChange}
                      onCreateApplet={handleCreateApplet}
                      buttonLabel={buttonLabel}
                      buttonVariant={buttonVariant as any}
                      maxSelections={maxSelections}
                      emptySelectionText={customEmptyText}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Tab 3: Real-World Examples */}
            <TabsContent value="examples" className="space-y-6">
            <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Real-World Examples</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Here are some practical implementations showing how the MultiAppletSelector can be used in different scenarios.
                </p>
                
                {/* Example 1: Workflow Builder */}
                <div className="bg-textured rounded-lg border-border p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-md mr-3">
                      <PlayIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-medium">Workflow Builder</h4>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create automated workflows by selecting applets that will run in sequence.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <MultiAppletSelector
                        selectedApplets={workflowSelectedApplets}
                        onAppletsChange={setWorkflowSelectedApplets}
                        buttonLabel="Add Workflow Step"
                        buttonVariant="outline"
                        buttonClassName="border-emerald-500 text-emerald-500"
                        emptySelectionText="No workflow steps defined"
                        dialogTitle="Select Workflow Steps"
                      />
                    </div>
                    
                    {workflowSelectedApplets.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Workflow Preview</h5>
                        <div className="space-y-2">
                          {workflowSelectedApplets.map((applet, index) => (
                            <div 
                              key={applet.id} 
                              className="flex items-center p-2 bg-textured rounded-md border-border"
                            >
                              <div className="flex items-center justify-center h-6 w-6 bg-emerald-500 dark:bg-emerald-600 rounded-full text-white text-xs font-medium mr-3">
                                {index + 1}
                              </div>
                              <span>{applet.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Example 2: Dashboard Builder */}
                <div className="bg-textured rounded-lg border-border p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md mr-3">
                      <BoxIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h4 className="font-medium">Dashboard Builder</h4>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create a custom dashboard by selecting applets to display as widgets.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <MultiAppletSelector
                        selectedApplets={dashboardSelectedApplets}
                        onAppletsChange={setDashboardSelectedApplets}
                        buttonLabel="Add Dashboard Widgets"
                        buttonVariant="default"
                        buttonClassName="bg-blue-500 hover:bg-blue-600 text-white"
                        maxSelections={4}
                        emptySelectionText="No widgets selected"
                        dialogTitle="Select Dashboard Widgets"
                      />
                    </div>
                    
                    {dashboardSelectedApplets.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Dashboard Preview</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {dashboardSelectedApplets.map((applet) => (
                            <div 
                              key={applet.id} 
                              className="p-3 bg-textured rounded-md border-border"
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                <BoxIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                <span className="font-medium text-sm">{applet.name}</span>
                              </div>
                              <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Widget Preview</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Example 3: Integration Setup */}
                <div className="bg-textured rounded-lg border-border p-4">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md mr-3">
                      <Settings className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <h4 className="font-medium">Integration Setup</h4>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Configure third-party integrations by selecting applets that will connect with external services.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <MultiAppletSelector
                        selectedApplets={integrationSelectedApplets}
                        onAppletsChange={setIntegrationSelectedApplets}
                        buttonLabel="Select Integration Applets"
                        buttonVariant="ghost"
                        buttonClassName="text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        dialogTitle="Configure Integrations"
                        emptySelectionText="No integrations configured"
                      />
                    </div>
                    
                    {integrationSelectedApplets.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Integration Status</h5>
                        <div className="space-y-1">
                          {integrationSelectedApplets.map((applet) => (
                            <div 
                              key={applet.id} 
                              className="flex items-center justify-between p-2 bg-textured rounded-md border-border"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <span className="text-sm">{applet.name}</span>
                              </div>
                              <span className="text-xs text-green-500">Connected</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Best Practices</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-base font-medium mb-2 text-yellow-700 dark:text-yellow-500">Usage Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-yellow-500 mr-2">•</div>
                        <span>Use clear button labels that indicate what the user is selecting applets for</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-yellow-500 mr-2">•</div>
                        <span>Set a reasonable maximum selection limit based on your use case</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-yellow-500 mr-2">•</div>
                        <span>Provide clear visual feedback about what applets are currently selected</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-yellow-500 mr-2">•</div>
                        <span>Consider using different button styles or colors based on the context</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-textured rounded-lg border-border">
                    <h4 className="text-base font-medium mb-2">Advanced Features</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      The MultiAppletSelector component can be extended with additional features:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                        <span>Applet grouping or categorization within the selector</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                        <span>Drag-and-drop reordering of selected applets</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                        <span>Configuration options for each selected applet</span>
                      </li>
                      <li className="flex items-start">
                        <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                        <span>Saving and loading selection presets</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="bg-gradient-to-r from-emerald-500/10 to-emerald-700/10 dark:from-emerald-600/20 dark:to-emerald-900/20 p-6">
          <div className="w-full flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h3 className="text-base font-medium">MultiAppletSelector</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A flexible component for selecting and displaying multiple applets in your application.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('basic')}
              >
                View Basic Usage
              </Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => window.open('#', '_blank')}
              >
                View Documentation
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      <Card className="border-gray-200 dark:border-gray-700 shadow-lg p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Implementation Details</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The MultiAppletSelector component provides a streamlined way to select and display multiple applets. 
            Here's how it works:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Core Features</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                <li>Visual display of selected applets</li>
                <li>Dialog-based applet selection interface</li>
                <li>Real-time search and filtering</li>
                <li>Checkbox selection with visual feedback</li>
                <li>Optional limit on maximum selections</li>
                <li>Customizable button styles and labels</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Integration Points</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                <li>Works with existing applet data structures</li>
                <li>State is controlled by the parent component</li>
                <li>Selection changes trigger callbacks</li>
                <li>Plugs into your applet creation workflow</li>
                <li>Customizable empty state messaging</li>
                <li>Refresh mechanism for data updates</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg border-border">
            <h4 className="text-sm font-medium mb-2">Component Highlights</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The MultiAppletSelector is designed to provide the best user experience for selecting multiple applets, with features like:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-start">
                <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                <span>
                  <span className="font-medium">Badge-style display</span>: Selected applets appear as interactive badges for quick recognition
                </span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                <span>
                  <span className="font-medium">Multi-select interface</span>: Checkbox-based selection with search functionality
                </span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                <span>
                  <span className="font-medium">Quick removal</span>: One-click removal of selected applets directly from badges
                </span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-emerald-500 mr-2">•</div>
                <span>
                  <span className="font-medium">Visual consistency</span>: Uses applet primary colors for badges and selection indicators
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MultiAppletSelectorDemo;
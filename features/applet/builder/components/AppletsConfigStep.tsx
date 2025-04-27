import React, { useState } from 'react';
import { PlusIcon, XIcon, EditIcon, CheckIcon, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AppConfig, Applet } from '@/features/applet/builder/ConfigBuilder';

interface AppletsConfigStepProps {
  applets: Applet[];
  addApplet: (applet: Applet) => void;
  updateConfig: (updates: Partial<AppConfig>) => void;
  activeApplet: string | null;
  setActiveApplet: (appletId: string) => void;
  config: Partial<AppConfig>;
}

export const AppletsConfigStep: React.FC<AppletsConfigStepProps> = ({
  applets,
  addApplet,
  updateConfig,
  activeApplet,
  setActiveApplet,
  config
}) => {
  const [newApplet, setNewApplet] = useState<Partial<Applet>>({
    id: '',
    name: '',
    description: '',
    imageUrl: ''
  });
  const [editingApplet, setEditingApplet] = useState<{ index: number; field: keyof Applet; value: string } | null>(null);

  const handleAddApplet = () => {
    if (newApplet.id && newApplet.name) {
      addApplet(newApplet as Applet);
      setNewApplet({
        id: '',
        name: '',
        description: '',
        imageUrl: ''
      });
    }
  };

  const handleRemoveApplet = (index: number) => {
    const updatedApplets = [...applets];
    const removedApplet = updatedApplets[index];
    updatedApplets.splice(index, 1);
    
    const updatedSearchConfig = { ...config.searchConfig || {} };
    if (updatedSearchConfig) {
      const { [removedApplet.id]: _, ...rest } = updatedSearchConfig;
      
      updateConfig({
        applets: updatedApplets,
        searchConfig: rest
      });
    }
    
    if (activeApplet === removedApplet.id && updatedApplets.length > 0) {
      setActiveApplet(updatedApplets[0].id);
    }
  };

  const startEditing = (index: number, field: keyof Applet) => {
    setEditingApplet({
      index,
      field,
      value: applets[index][field] as string || ''
    });
  };

  const updateEditingValue = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editingApplet) {
      setEditingApplet({
        ...editingApplet,
        value: e.target.value
      });
    }
  };

  const saveEditingApplet = () => {
    if (editingApplet) {
      const updatedApplets = [...applets];
      
      // If we're editing the ID (which is the key in searchConfig)
      if (editingApplet.field === 'id' && updatedApplets[editingApplet.index].id !== editingApplet.value) {
        const oldId = updatedApplets[editingApplet.index].id;
        updatedApplets[editingApplet.index][editingApplet.field] = editingApplet.value;
        
        // Update the searchConfig keys
        const updatedSearchConfig = { ...config.searchConfig || {} };
        
        updatedSearchConfig[editingApplet.value] = updatedSearchConfig[oldId] || [];
        delete updatedSearchConfig[oldId];
        
        updateConfig({
          applets: updatedApplets,
          searchConfig: updatedSearchConfig
        });
        
        // Update activeApplet if it was the one being edited
        if (activeApplet === oldId) {
          setActiveApplet(editingApplet.value);
        }
      } else {
        // Just updating other fields
        updatedApplets[editingApplet.index][editingApplet.field] = editingApplet.value as any;
        updateConfig({ applets: updatedApplets });
      }
      
      setEditingApplet(null);
    }
  };

  const cancelEditing = () => {
    setEditingApplet(null);
  };

  const handleAppletSelect = (appletId: string) => {
    setActiveApplet(appletId);
  };

  const generateAppletId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewApplet(prev => ({
      ...prev,
      name
    }));
    // Auto-generate id from name if id is empty
    if (!newApplet.id) {
      setNewApplet(prev => ({
        ...prev,
        id: generateAppletId(name)
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApplet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add new applet form */}
            <div className="space-y-4 border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
              <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Add New Applet</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Applet Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Hotels"
                  value={newApplet.name}
                  onChange={handleNameChange}
                  className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="id" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Applet ID
                </Label>
                <Input
                  id="id"
                  name="id"
                  placeholder="e.g. hotels"
                  value={newApplet.id}
                  onChange={handleInputChange}
                  className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  A unique identifier for this applet. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter applet description"
                  value={newApplet.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="resize-none border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Image URL
                </Label>
                <Input
                  id="image"
                  name="image"
                  placeholder="https://example.com/image.jpg"
                  value={newApplet.imageUrl}
                  onChange={handleInputChange}
                  className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  URL to an image representing this applet.
                </p>
              </div>
              
              <Button 
                onClick={handleAddApplet} 
                disabled={!newApplet.name || !newApplet.id}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Applet
              </Button>
            </div>

            {/* List of applets */}
            <div className="space-y-4 border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
              <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Configured Applets</h3>
              {applets.length === 0 ? (
                <div className="flex items-center justify-center h-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
                  <p className="text-zinc-500 dark:text-zinc-400">No applets added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {applets.map((applet, index) => (
                    <div 
                      key={index} 
                      className={`flex flex-col p-3 rounded-md ${
                        activeApplet === applet.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge 
                            variant={activeApplet === applet.id ? "default" : "outline"}
                            className={activeApplet === applet.id 
                              ? "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                              : "text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
                            }
                            onClick={() => handleAppletSelect(applet.id)}
                          >
                            {applet.name}
                          </Badge>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditing(index, 'name')}
                            className="ml-1 h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                          >
                            <EditIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          size="icon"
                          variant="ghost" 
                          onClick={() => handleRemoveApplet(index)}
                          className="h-7 w-7 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Applet details section */}
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">ID:</span>
                          {editingApplet && editingApplet.index === index && editingApplet.field === 'id' ? (
                            <div className="flex items-center">
                              <Input
                                value={editingApplet.value}
                                onChange={updateEditingValue}
                                className="h-7 text-xs border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                                autoFocus
                              />
                              <div className="flex ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={saveEditingApplet}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <CheckIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={cancelEditing}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="text-zinc-700 dark:text-zinc-300">{applet.id}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEditing(index, 'id')}
                                className="ml-1 h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
                          {editingApplet && editingApplet.index === index && editingApplet.field === 'description' ? (
                            <div className="flex items-start w-3/4">
                              <Textarea
                                value={editingApplet.value}
                                onChange={updateEditingValue}
                                className="h-16 text-xs border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                                autoFocus
                              />
                              <div className="flex ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={saveEditingApplet}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <CheckIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={cancelEditing}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center w-3/4">
                              <span className="text-zinc-700 dark:text-zinc-300 truncate">{applet.description || 'No description'}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEditing(index, 'description')}
                                className="ml-1 h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Image:</span>
                          {editingApplet && editingApplet.index === index && editingApplet.field === 'imageUrl' ? (
                            <div className="flex items-center w-3/4">
                              <Input
                                value={editingApplet.value}
                                onChange={updateEditingValue}
                                className="h-7 text-xs border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                                autoFocus
                              />
                              <div className="flex ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={saveEditingApplet}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <CheckIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={cancelEditing}
                                  className="h-7 w-7 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center w-3/4">
                              {applet.imageUrl ? (
                                <div className="flex items-center">
                                  <span className="text-zinc-700 dark:text-zinc-300 truncate">{applet.imageUrl}</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-zinc-500 dark:text-zinc-400">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  <span>No image</span>
                                </div>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEditing(index, 'imageUrl')}
                                className="ml-1 h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
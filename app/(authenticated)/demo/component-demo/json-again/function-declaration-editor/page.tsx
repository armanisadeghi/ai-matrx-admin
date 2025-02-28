'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

const JsonSchemaBuilder = () => {
  const [activeTab, setActiveTab] = useState('visual');
  const [jsonValue, setJsonValue] = useState('[\n  {\n    "name": "getWeather",\n    "description": "gets the weather for a requested city",\n    "parameters": {\n      "type": "object",\n      "properties": {\n        "city": {\n          "type": "string"\n        }\n      }\n    }\n  }\n]');
  const [parsedValue, setParsedValue] = useState([]);
  const [error, setError] = useState('');

  // Parse JSON when switching to visual editor or on component load
  useEffect(() => {
    if (activeTab === 'visual') {
      try {
        const parsed = JSON.parse(jsonValue);
        setParsedValue(parsed);
        setError('');
      } catch (e) {
        setError(e.message);
      }
    }
  }, [jsonValue, activeTab]);

  // Initialize the component
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonValue);
      setParsedValue(parsed);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Update JSON when visual editor changes
  const updateFromVisual = (newValue) => {
    setParsedValue(newValue);
    try {
      setJsonValue(JSON.stringify(newValue, null, 2));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  // Add a new schema object
  const addSchemaObject = () => {
    const newObject = {
      name: '',
      description: '',
      parameters: {
        type: 'object',
        properties: {}
      }
    };
    updateFromVisual([...parsedValue, newObject]);
  };

  // Remove a schema object
  const removeSchemaObject = (index) => {
    const newValue = [...parsedValue];
    newValue.splice(index, 1);
    updateFromVisual(newValue);
  };

  // Update a schema object property
  const updateSchemaObject = (index, property, value) => {
    const newValue = [...parsedValue];
    newValue[index] = { ...newValue[index], [property]: value };
    updateFromVisual(newValue);
  };

  // Add a property
  const addProperty = (objectIndex, path = []) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the target object using the path
    let current = target;
    
    for (let i = 0; i < path.length; i++) {
      if (i < path.length - 1) {
        current = current[path[i]];
      }
    }
    
    // If we have a path, set the new property in the nested location
    if (path.length > 0) {
      const lastKey = path[path.length - 1];
      if (!current[lastKey].properties) {
        current[lastKey].properties = {};
      }
      current[lastKey].properties[`property_${Object.keys(current[lastKey].properties).length}`] = {
        type: 'string'
      };
    } else {
      // Add to the root parameters
      if (!target.parameters.properties) {
        target.parameters.properties = {};
      }
      target.parameters.properties[`property_${Object.keys(target.parameters.properties).length}`] = {
        type: 'string'
      };
    }
    
    updateFromVisual(newValue);
  };

  // Add a nested property
  const addNestedProperty = (objectIndex, path = []) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the target object using the path
    let current = target;
    
    for (let i = 0; i < path.length; i++) {
      if (i < path.length - 1) {
        current = current[path[i]];
      }
    }
    
    // If we have a path, set the new property in the nested location
    if (path.length > 0) {
      const lastKey = path[path.length - 1];
      if (!current[lastKey].properties) {
        current[lastKey].properties = {};
      }
      current[lastKey].properties[`nested_${Object.keys(current[lastKey].properties).length}`] = {
        type: 'object',
        properties: {}
      };
    } else {
      // Add to the root parameters
      if (!target.parameters.properties) {
        target.parameters.properties = {};
      }
      target.parameters.properties[`nested_${Object.keys(target.parameters.properties).length}`] = {
        type: 'object',
        properties: {}
      };
    }
    
    updateFromVisual(newValue);
  };

  // Remove parameters
  const removeParameters = (objectIndex) => {
    const newValue = [...parsedValue];
    newValue[objectIndex].parameters.properties = {};
    updateFromVisual(newValue);
  };

  // Update a property
  const updatePropertyName = (objectIndex, path, oldName, newName) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the parent object
    let current = target;
    let parentPath = path.slice(0, -1);
    
    for (let i = 0; i < parentPath.length; i++) {
      current = current[parentPath[i]];
    }
    
    // Update the property name
    if (parentPath.length === 0) {
      current.properties[newName] = current.properties[oldName];
      delete current.properties[oldName];
    } else {
      current.properties[newName] = current.properties[oldName];
      delete current.properties[oldName];
    }
    
    updateFromVisual(newValue);
  };

  // Update property type
  const updatePropertyType = (objectIndex, path, type) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the property
    let current = target;
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    
    current.type = type;
    
    // If changing to object, initialize properties
    if (type === 'object' && !current.properties) {
      current.properties = {};
    }
    
    updateFromVisual(newValue);
  };

  // Toggle array type
  const toggleArray = (objectIndex, path) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the property
    let current = target;
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    
    // Toggle array status
    if (current.type === 'array') {
      current.type = current.items?.type || 'string';
      delete current.items;
    } else {
      const itemsType = current.type;
      current.type = 'array';
      current.items = { type: itemsType };
    }
    
    updateFromVisual(newValue);
  };

  // Toggle required status
  const toggleRequired = (objectIndex, path, propName) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the parent object
    let current = target;
    let parentObject = null;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    // Toggle required status
    if (!current.required) {
      current.required = [propName];
    } else {
      const index = current.required.indexOf(propName);
      if (index === -1) {
        current.required.push(propName);
      } else {
        current.required.splice(index, 1);
        if (current.required.length === 0) {
          delete current.required;
        }
      }
    }
    
    updateFromVisual(newValue);
  };

  // Remove a property
  const removeProperty = (objectIndex, path, propName) => {
    const newValue = [...parsedValue];
    let target = newValue[objectIndex];
    
    // Navigate to the parent object
    let current = target;
    let parentPath = path.slice(0, -1);
    
    for (let i = 0; i < parentPath.length; i++) {
      current = current[path[i]];
    }
    
    // Remove the property
    delete current.properties[propName];
    
    // Also remove from required if present
    if (current.required) {
      const index = current.required.indexOf(propName);
      if (index !== -1) {
        current.required.splice(index, 1);
        if (current.required.length === 0) {
          delete current.required;
        }
      }
    }
    
    updateFromVisual(newValue);
  };

  // Check if property is required
  const isPropertyRequired = (objectIndex, path, propName) => {
    let current = parsedValue[objectIndex];
    let parentPath = path.slice(0, -1);
    
    for (let i = 0; i < parentPath.length; i++) {
      current = current[path[i]];
    }
    
    return current.required && current.required.includes(propName);
  };

  // Render property row
  const renderPropertyRow = (objectIndex, propName, path, level = 0) => {
    let property = null;
    let current = parsedValue[objectIndex];
    
    // Navigate to the property
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    
    property = current.properties[propName];
    const propertyPath = [...path, 'properties', propName];
    const required = isPropertyRequired(objectIndex, path, propName);
    const isArray = property.type === 'array';
    
    return (
      <div key={propName} style={{ marginLeft: `${level * 16}px` }}>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            value={propName}
            onChange={(e) => updatePropertyName(objectIndex, propertyPath, propName, e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 w-64"
            placeholder="Property name"
          />
          
          <select
            value={isArray ? property.items.type : property.type}
            onChange={(e) => updatePropertyType(objectIndex, propertyPath, e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 w-40"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="integer">integer</option>
            <option value="boolean">boolean</option>
            <option value="object">object</option>
          </select>
          
          <button
            onClick={() => toggleArray(objectIndex, propertyPath)}
            className={`px-3 py-1 rounded ${isArray ? 'bg-blue-600 text-white' : 'bg-blue-900 text-blue-200'}`}
            title="Toggle array"
          >
            [ ]
          </button>
          
          <button
            onClick={() => toggleRequired(objectIndex, path, propName)}
            className={`px-3 py-1 rounded ${required ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}
            title="Toggle required"
          >
            *
          </button>
          
          <button
            onClick={() => removeProperty(objectIndex, path, propName)}
            className="px-2 py-1 bg-gray-700 rounded text-gray-400 hover:bg-gray-600"
            title="Remove property"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        {((isArray ? property.items.type : property.type) === 'object') && (
          <div className="pl-4 pt-1 pb-2 border-l border-gray-700">
            {property.properties && Object.keys(property.properties).map(childProp => (
              renderPropertyRow(objectIndex, childProp, [...propertyPath], level + 1)
            ))}
            
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => addProperty(objectIndex, propertyPath)}
                className="px-3 py-1 bg-blue-900 text-blue-200 text-sm rounded hover:bg-blue-800"
              >
                Add property
              </button>
              
              <button
                onClick={() => addNestedProperty(objectIndex, propertyPath)}
                className="px-3 py-1 bg-blue-900 text-blue-200 text-sm rounded hover:bg-blue-800"
              >
                Add nested property
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Check if save is valid
  const isSaveValid = () => {
    try {
      return parsedValue.every(obj => obj.name && obj.name.trim() !== '');
    } catch (e) {
      return false;
    }
  };

  // Render schema object
  const renderSchemaObject = (obj, index) => {
    return (
      <div key={index} className="mb-4 p-4 border border-gray-700 rounded bg-gray-800">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <div className="flex items-center">
              <input
                type="text"
                value={obj.name || ''}
                onChange={(e) => updateSchemaObject(index, 'name', e.target.value)}
                placeholder="name"
                className={`px-3 py-1 bg-gray-700 rounded border ${
                  !obj.name ? 'border-red-500' : 'border-gray-600'
                } w-full text-white`}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <div className="flex items-center">
              <input
                type="text"
                value={obj.description || ''}
                onChange={(e) => updateSchemaObject(index, 'description', e.target.value)}
                placeholder="Description"
                className="px-3 py-1 bg-gray-700 rounded border border-gray-600 w-full text-white"
              />
              <button
                onClick={() => removeSchemaObject(index)}
                className="ml-2 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          {obj.parameters && obj.parameters.properties && 
            Object.keys(obj.parameters.properties).map(propName => (
              renderPropertyRow(index, propName, ['parameters'], 0)
            ))
          }
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => addProperty(index)}
              className="px-3 py-1 bg-blue-900 text-blue-200 rounded text-sm hover:bg-blue-800"
            >
              Add property
            </button>
            
            <button
              onClick={() => addNestedProperty(index)}
              className="px-3 py-1 bg-blue-900 text-blue-200 rounded text-sm hover:bg-blue-800"
            >
              Add nested property
            </button>
            
            <button
              onClick={() => removeParameters(index)}
              className="px-3 py-1 bg-blue-900 text-blue-200 rounded text-sm hover:bg-blue-800"
            >
              Remove parameters
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold">JSON Schema Builder</h2>
        <button onClick={() => {}} className="p-2 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <p className="mb-4">
          Enter a list of JSON schema definitions.{' '}
          <a href="#" className="text-blue-400 hover:underline">
            See the API documentation
          </a>{' '}
          for examples.
        </p>
        
        <div className="mb-4">
          <div className="flex border-b border-gray-800">
            <button
              className={`px-4 py-2 ${activeTab === 'code' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('code')}
            >
              Code Editor
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'visual' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('visual')}
            >
              Visual Editor
            </button>
          </div>
        </div>
        
        {activeTab === 'code' ? (
          <div className="bg-gray-800 rounded p-4">
            <textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              className="w-full h-96 bg-gray-800 text-white font-mono p-2 border-0 focus:outline-none resize-none"
              spellCheck="false"
            />
          </div>
        ) : (
          <div className="bg-gray-800 rounded p-4">
            {error && (
              <div className="mb-4 p-2 bg-red-900 text-red-200 rounded">
                {error}
              </div>
            )}
            
            {parsedValue.map((obj, index) => renderSchemaObject(obj, index))}
            
            <button
              onClick={addSchemaObject}
              className="px-3 py-1 bg-blue-900 text-blue-200 rounded text-sm hover:bg-blue-800 mt-4"
            >
              Add schema object
            </button>
          </div>
        )}
        
        {!isSaveValid() && (
          <div className="mt-4 p-2 bg-red-900 text-red-200 rounded">
            "name" must be specified
          </div>
        )}
        
        <div className="mt-4 flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
            Reset
          </button>
          <button
            className={`px-4 py-2 rounded ${
              isSaveValid() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-500 bg-opacity-50 text-gray-300 cursor-not-allowed'
            }`}
            disabled={!isSaveValid()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonSchemaBuilder;
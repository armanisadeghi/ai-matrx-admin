'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, MessageSquare, BookOpen, Clock, UserCircle, Sliders, Save, Zap, Code, ListChecks, Palette, Bot, Wand2, UserCog, PanelTop, Image, BellRing, Smile } from 'lucide-react';

export default function AIExperienceCustomizer() {
  // State for all customization options
  const [communication, setCommunication] = useState({
    verbosity: 50,
    formality: 50,
    personality: 'balanced',
    tone: 'neutral',
    emoji: false,
    citations: true
  });
  
  const [knowledge, setKnowledge] = useState({
    expertise: ['general'],
    reasoning: 50,
    creativity: 50,
    memory: true
  });
  
  const [appearance, setAppearance] = useState({
    theme: 'light',
    fontsize: 'medium',
    uiDensity: 'comfortable'
  });
  
  const [preferences, setPreferences] = useState({
    codeBlocks: true,
    stepByStep: true,
    examples: true,
    autoSuggest: false,
    bulletPoints: true,
    imageGen: false,
    notifications: false
  });
  
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    age: '',
    city: '',
    occupation: '',
    interests: ''
  });
  
  // Handle slider changes
  const handleSliderChange = (category, field, value) => {
    if (category === 'communication') {
      setCommunication({
        ...communication,
        [field]: value
      });
    } else if (category === 'knowledge') {
      setKnowledge({
        ...knowledge,
        [field]: value
      });
    }
  };
  
  // Handle toggle changes
  const handleToggleChange = (category, field) => {
    if (category === 'communication') {
      setCommunication({
        ...communication,
        [field]: !communication[field]
      });
    } else if (category === 'knowledge') {
      setKnowledge({
        ...knowledge,
        [field]: !knowledge[field]
      });
    } else if (category === 'preferences') {
      setPreferences({
        ...preferences,
        [field]: !preferences[field]
      });
    }
  };
  
  // Handle select changes
  const handleSelectChange = (category, field, value) => {
    if (category === 'communication') {
      setCommunication({
        ...communication,
        [field]: value
      });
    } else if (category === 'appearance') {
      setAppearance({
        ...appearance,
        [field]: value
      });
    }
  };
  
  // Handle expertise changes (multiple select)
  const handleExpertiseChange = (expertise) => {
    if (knowledge.expertise.includes(expertise)) {
      setKnowledge({
        ...knowledge,
        expertise: knowledge.expertise.filter(item => item !== expertise)
      });
    } else {
      setKnowledge({
        ...knowledge,
        expertise: [...knowledge.expertise, expertise]
      });
    }
  };

  // Handle personal info changes
  const handlePersonalInfoChange = (e) => {
    setPersonalInfo({
      ...personalInfo,
      [e.target.name]: e.target.value
    });
  };

  // Handle saving the configuration
  const handleSave = () => {
    const config = {
      personalInfo,
      communication,
      knowledge,
      appearance,
      preferences
    };
    
    console.log('Configuration saved:', config);
    // Here you would typically send this to your backend
    alert('Your AI experience has been saved!');
  };
  
  // List of expertise options
  const expertiseOptions = [
    { id: 'general', label: 'General Knowledge' },
    { id: 'technology', label: 'Technology' },
    { id: 'science', label: 'Science' },
    { id: 'math', label: 'Mathematics' },
    { id: 'finance', label: 'Finance' },
    { id: 'health', label: 'Health & Medicine' },
    { id: 'arts', label: 'Arts & Culture' },
    { id: 'history', label: 'History' },
    { id: 'business', label: 'Business' },
    { id: 'cooking', label: 'Cooking' },
    { id: 'sports', label: 'Sports' },
    { id: 'travel', label: 'Travel' }
  ];
  
  // UI Components
  const Slider = ({ value, onChange, label, min = 0, max = 100, leftLabel = "Less", rightLabel = "More" }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{value}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">{leftLabel}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <span className="text-xs text-gray-500">{rightLabel}</span>
      </div>
    </div>
  );

  const Toggle = ({ checked, onChange, label, icon }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
      <div className="flex items-center">
        {icon && <span className="mr-2 text-gray-600">{icon}</span>}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const Card = ({ title, icon, children, className = "", size = "normal" }) => {
    const sizeClasses = {
      small: "col-span-1",
      normal: "col-span-1 md:col-span-1",
      medium: "col-span-1 md:col-span-2",
      large: "col-span-1 md:col-span-3"
    };
    
    return (
      <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 ${sizeClasses[size]} ${className}`}>
        <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 mr-2">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
        {children}
      </div>
    );
  };
  
  const PersonalityCard = ({ selected, onChange }) => {
    const options = [
      { id: 'friendly', label: 'Friendly', description: 'Warm, approachable, casual' },
      { id: 'professional', label: 'Professional', description: 'Formal, precise, concise' },
      { id: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic, encouraging, positive' },
      { id: 'balanced', label: 'Balanced', description: 'Neutral, adaptable, versatile' },
      { id: 'academic', label: 'Academic', description: 'Detailed, thorough, analytical' }
    ];
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange('communication', 'personality', option.id)}
            className={`p-3 border rounded-xl text-left transition-all ${
              selected === option.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium mb-1">{option.label}</div>
            <div className="text-xs text-gray-500">{option.description}</div>
          </button>
        ))}
      </div>
    );
  };
  
  const ToneCard = ({ selected, onChange }) => {
    const options = [
      { id: 'neutral', label: 'Neutral' },
      { id: 'casual', label: 'Casual' },
      { id: 'formal', label: 'Formal' },
      { id: 'humorous', label: 'Humorous' },
      { id: 'empathetic', label: 'Empathetic' },
      { id: 'direct', label: 'Direct' }
    ];
    
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange('communication', 'tone', option.id)}
            className={`px-3 py-1.5 border rounded-full text-sm transition-all ${
              selected === option.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };
  
  // Render the UI
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Wand2 className="h-7 w-7 text-blue-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900">Customize Your AI Experience</h1>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            Save My Experience
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Feature Card */}
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center mb-4">
              <Sparkles className="h-8 w-8 mr-3" />
              <h2 className="text-2xl font-bold">Create Your Perfect AI Assistant</h2>
            </div>
            <p className="mb-6 opacity-90 max-w-2xl">
              Customize how your AI responds to you by adjusting these settings. Your preferences will be saved
              and applied to all your future conversations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-col">
                <h3 className="font-medium mb-2 flex items-center">
                  <Bot className="h-5 w-5 mr-1.5" />
                  Choose Personality
                </h3>
                <p className="text-sm opacity-90 mb-2">Set your assistant's overall demeanor and conversational style</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-col">
                <h3 className="font-medium mb-2 flex items-center">
                  <Brain className="h-5 w-5 mr-1.5" />
                  Adjust Capabilities
                </h3>
                <p className="text-sm opacity-90 mb-2">Fine-tune how your assistant thinks and what it knows</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-col">
                <h3 className="font-medium mb-2 flex items-center">
                  <PanelTop className="h-5 w-5 mr-1.5" />
                  Format Responses
                </h3>
                <p className="text-sm opacity-90 mb-2">Control how information is presented and organized</p>
              </div>
            </div>
          </div>
          
          {/* Top Personality Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Bot className="h-5 w-5 mr-2 text-blue-600" />
              Personality & Style
            </h2>
            
            <Card 
              title="Choose AI Personality" 
              icon={<UserCog className="h-5 w-5" />}
              size="large"
              className="mb-4"
            >
              <p className="text-sm text-gray-600 mb-4">How would you like your AI assistant to behave?</p>
              <PersonalityCard 
                selected={communication.personality} 
                onChange={handleSelectChange} 
              />
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card title="Conversation Tone" icon={<MessageSquare className="h-5 w-5" />}>
                <p className="text-sm text-gray-600 mb-3">Select your preferred tone:</p>
                <ToneCard 
                  selected={communication.tone} 
                  onChange={handleSelectChange}
                />
              </Card>
              
              <Card title="Verbosity" icon={<MessageSquare className="h-5 w-5" />}>
                <Slider
                  label="Response Length"
                  value={communication.verbosity}
                  onChange={(value) => handleSliderChange('communication', 'verbosity', value)}
                  leftLabel="Concise"
                  rightLabel="Detailed"
                />
              </Card>
              
              <Card title="Formality" icon={<MessageSquare className="h-5 w-5" />}>
                <Slider
                  label="Communication Style"
                  value={communication.formality}
                  onChange={(value) => handleSliderChange('communication', 'formality', value)}
                  leftLabel="Casual"
                  rightLabel="Formal"
                />
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Style Enhancements" icon={<Palette className="h-5 w-5" />}>
                <div className="space-y-1">
                  <Toggle
                    icon={<Smile className="h-4 w-4" />}
                    label="Use Emoji in Responses"
                    checked={communication.emoji}
                    onChange={() => handleToggleChange('communication', 'emoji')}
                  />
                  <Toggle
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Include Academic Citations"
                    checked={communication.citations}
                    onChange={() => handleToggleChange('communication', 'citations')}
                  />
                </div>
              </Card>
              
              <Card title="Interactive Features" icon={<Zap className="h-5 w-5" />}>
                <div className="space-y-1">
                  <Toggle
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Suggest Follow-up Questions"
                    checked={preferences.autoSuggest}
                    onChange={() => handleToggleChange('preferences', 'autoSuggest')}
                  />
                  <Toggle
                    label="Enable Notifications"
                    checked={preferences.notifications}
                    icon={<BellRing className="h-4 w-4" />}
                    onChange={() => handleToggleChange('preferences', 'notifications')}
                  />
                </div>
              </Card>
            </div>
          </section>
          
          {/* Knowledge & Capabilities */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Intelligence & Capabilities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card title="Reasoning Depth" icon={<Brain className="h-5 w-5" />}>
                <Slider
                  label="Analytical Thinking"
                  value={knowledge.reasoning}
                  onChange={(value) => handleSliderChange('knowledge', 'reasoning', value)}
                  leftLabel="Simple"
                  rightLabel="Complex"
                />
              </Card>
              
              <Card title="Creativity Level" icon={<Sparkles className="h-5 w-5" />}>
                <Slider
                  label="Creative Thinking"
                  value={knowledge.creativity}
                  onChange={(value) => handleSliderChange('knowledge', 'creativity', value)}
                  leftLabel="Practical"
                  rightLabel="Imaginative"
                />
              </Card>
              
              <Card title="Memory Features" icon={<Clock className="h-5 w-5" />}>
                <div className="space-y-3 py-2">
                  <Toggle
                    icon={<Clock className="h-4 w-4" />}
                    label="Remember Context Across Sessions"
                    checked={knowledge.memory}
                    onChange={() => handleToggleChange('knowledge', 'memory')}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    When enabled, your AI will remember important information from previous conversations.
                  </p>
                </div>
              </Card>
            </div>
            
            <Card 
              title="Areas of Expertise" 
              icon={<BookOpen className="h-5 w-5" />}
              size="large"
              className="mb-4"
            >
              <p className="text-sm text-gray-600 mb-3">Select topics where you'd like enhanced knowledge:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {expertiseOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleExpertiseChange(option.id)}
                    className={`py-2 px-3 text-sm border rounded-lg flex items-center ${
                      knowledge.expertise.includes(option.id)
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {knowledge.expertise.includes(option.id) && (
                      <span className="mr-1.5 text-purple-600">✓</span>
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </Card>
          </section>
          
          {/* Output Format & Preferences */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <PanelTop className="h-5 w-5 mr-2 text-green-600" />
              Output Format & Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Content Formatting" icon={<ListChecks className="h-5 w-5" />}>
                <div className="space-y-1.5">
                  <Toggle
                    label="Step-by-Step Explanations"
                    icon={<ListChecks className="h-4 w-4" />}
                    checked={preferences.stepByStep}
                    onChange={() => handleToggleChange('preferences', 'stepByStep')}
                  />
                  <Toggle
                    label="Include Practical Examples"
                    icon={<BookOpen className="h-4 w-4" />}
                    checked={preferences.examples}
                    onChange={() => handleToggleChange('preferences', 'examples')}
                  />
                  <Toggle
                    label="Use Bullet Points & Lists"
                    icon={<ListChecks className="h-4 w-4" />}
                    checked={preferences.bulletPoints}
                    onChange={() => handleToggleChange('preferences', 'bulletPoints')}
                  />
                </div>
              </Card>
              
              <Card title="Technical Features" icon={<Code className="h-5 w-5" />}>
                <div className="space-y-1.5">
                  <Toggle
                    label="Syntax Highlighted Code Blocks"
                    icon={<Code className="h-4 w-4" />}
                    checked={preferences.codeBlocks}
                    onChange={() => handleToggleChange('preferences', 'codeBlocks')}
                  />
                  <Toggle
                    label="Generate Image Descriptions"
                    icon={<Image className="h-4 w-4" />}
                    checked={preferences.imageGen}
                    onChange={() => handleToggleChange('preferences', 'imageGen')}
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['light', 'dark', 'system'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => handleSelectChange('appearance', 'theme', theme)}
                        className={`p-2 border rounded-md capitalize ${
                          appearance.theme === theme
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </section>
          
          {/* Personal Information (moved to the bottom) */}
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <UserCircle className="h-5 w-5 mr-2 text-gray-600" />
                Personal Details (Optional)
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Why share this info?
              </button>
            </div>
            
            <Card title="Personal Information" icon={<UserCircle className="h-5 w-5" />} size="large">
              <p className="text-sm text-gray-600 mb-4">
                Add personal details to make your AI experience more relevant. All information is optional and private.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={personalInfo.name}
                    onChange={handlePersonalInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City/Location</label>
                  <input
                    type="text"
                    name="city"
                    value={personalInfo.city}
                    onChange={handlePersonalInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Where you live"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={personalInfo.occupation}
                    onChange={handlePersonalInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Your job or role"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Interests</label>
                  <input
                    type="text"
                    name="interests"
                    value={personalInfo.interests}
                    onChange={handlePersonalInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Topics you're interested in (e.g., cooking, technology, travel)"
                  />
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
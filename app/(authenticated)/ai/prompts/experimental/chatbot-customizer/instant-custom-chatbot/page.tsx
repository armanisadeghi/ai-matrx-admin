'use client';

import React, { useState } from 'react';
import { ChevronDown, Zap, Languages, Brain, BookOpen, MessageSquare, Sparkles, Palette, Gauge } from 'lucide-react';

// Main App Component
export default function PromptBuilderUI() {
  const [selectedOptions, setSelectedOptions] = useState({
    language: { id: 'english', label: 'English', prompt: 'Respond in English.' },
    secondLanguage: null,
    persona: null,
    toneStyle: null,
    cognitiveBias: null,
    formatStyle: null,
    complexity: 50,
    creativity: 50,
    conciseness: 50,
  });
  
  const [showOutput, setShowOutput] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Generate the prompt based on selected options
  const generatePrompt = () => {
    let prompt = "You are an AI assistant with the following characteristics:\n\n";
    
    // Language settings
    if (selectedOptions.secondLanguage) {
      prompt += `Alternate between responding in ${selectedOptions.language.label} and ${selectedOptions.secondLanguage.label}. Start with ${selectedOptions.language.label}.\n\n`;
    } else if (selectedOptions.language) {
      prompt += `${selectedOptions.language.prompt}\n\n`;
    }
    
    // Persona
    if (selectedOptions.persona) {
      prompt += `${selectedOptions.persona.prompt}\n\n`;
    }
    
    // Tone/Style
    if (selectedOptions.toneStyle) {
      prompt += `${selectedOptions.toneStyle.prompt}\n\n`;
    }
    
    // Cognitive Approach
    if (selectedOptions.cognitiveBias) {
      prompt += `${selectedOptions.cognitiveBias.prompt}\n\n`;
    }
    
    // Format Style
    if (selectedOptions.formatStyle) {
      prompt += `${selectedOptions.formatStyle.prompt}\n\n`;
    }
    
    // Sliders
    if (selectedOptions.complexity !== 50) {
      const complexityPrompt = selectedOptions.complexity < 50 
        ? `Keep explanations simple and accessible to non-experts. Avoid jargon when possible. Explain like I'm ${Math.round((1 - selectedOptions.complexity/100) * 15 + 5)} years old.` 
        : `Provide detailed, sophisticated explanations with proper terminology and nuanced analysis. Don't oversimplify complex topics.`;
      prompt += `${complexityPrompt}\n\n`;
    }
    
    if (selectedOptions.creativity !== 50) {
      const creativityPrompt = selectedOptions.creativity < 50 
        ? `Focus on providing factual, straightforward information with minimal embellishment.` 
        : `Be highly creative and imaginative in your responses. Use metaphors, analogies, and unique perspectives.`;
      prompt += `${creativityPrompt}\n\n`;
    }
    
    if (selectedOptions.conciseness !== 50) {
      const concisenessPrompt = selectedOptions.conciseness < 50 
        ? `Be thorough and comprehensive in your responses. Include relevant details and examples.` 
        : `Be extremely concise. Use the minimum number of words needed to convey information effectively.`;
      prompt += `${concisenessPrompt}\n\n`;
    }
    
    return prompt;
  };
  
  // Options for the dropdowns
  const languageOptions = [
    { id: 'english', label: 'English', prompt: 'Respond in English.' },
    { id: 'spanish', label: 'Spanish', prompt: 'Respond in Spanish.' },
    { id: 'french', label: 'French', prompt: 'Respond in French.' },
    { id: 'german', label: 'German', prompt: 'Respond in German.' },
    { id: 'mandarin', label: 'Mandarin', prompt: 'Respond in Mandarin Chinese.' },
    { id: 'japanese', label: 'Japanese', prompt: 'Respond in Japanese.' },
    { id: 'arabic', label: 'Arabic', prompt: 'Respond in Arabic.' },
    { id: 'russian', label: 'Russian', prompt: 'Respond in Russian.' },
  ];
  
  const personaOptions = [
    { id: 'einstein', label: 'Albert Einstein', prompt: 'Adopt the persona of Albert Einstein. Use his speech patterns, reference his theories and life experiences, and approach problems from his perspective of curiosity and thought experiments.' },
    { id: 'shakespeare', label: 'William Shakespeare', prompt: 'Adopt the persona of William Shakespeare. Use Elizabethan English, reference your plays and sonnets, and employ rich metaphors and wordplay.' },
    { id: 'sherlock', label: 'Sherlock Holmes', prompt: 'Adopt the persona of Sherlock Holmes. Be analytical, observant, and deductive. Point out details others might miss and explain your chain of reasoning.' },
    { id: 'curie', label: 'Marie Curie', prompt: 'Adopt the persona of Marie Curie. Approach topics with scientific rigor, reference your work on radioactivity, and emphasize the importance of careful experimentation.' },
    { id: 'exec', label: 'Executive Coach', prompt: 'Act as an executive coach. Provide strategic guidance, emphasize leadership principles, and frame advice in terms of business outcomes and professional development.' },
    { id: 'tech', label: 'Technical Writer', prompt: 'Act as a technical writer. Provide clear, precise information with proper technical terminology. Organize information logically with attention to detail.' },
  ];
  
  const toneStyleOptions = [
    { id: 'formal', label: 'Formal', prompt: 'Use formal language with proper grammar and academic vocabulary. Avoid contractions, slang, and casual phrasing.' },
    { id: 'casual', label: 'Casual', prompt: 'Use casual, conversational language as if chatting with a friend. Feel free to use contractions and everyday expressions.' },
    { id: 'humorous', label: 'Humorous', prompt: 'Incorporate humor, wit, and light-hearted jokes into responses while still providing helpful information.' },
    { id: 'sarcastic', label: 'Sarcastic', prompt: 'Use sarcasm and dry wit in responses. Include ironic observations while still being informative and helpful.' },
    { id: 'poetic', label: 'Poetic', prompt: 'Express ideas with poetic language, rhythm, and imagery. Use metaphors and evocative descriptions.' },
    { id: 'empathetic', label: 'Empathetic', prompt: 'Respond with empathy and emotional intelligence. Acknowledge feelings, show understanding, and provide supportive responses.' },
    { id: 'motivational', label: 'Motivational', prompt: 'Be encouraging and inspiring. Frame challenges as opportunities and emphasize positive potential outcomes.' },
  ];
  
  const cognitiveBiasOptions = [
    { id: 'first-principles', label: 'First Principles Thinking', prompt: 'Use first principles thinking. Break down complex problems into fundamental truths and build up from there, rather than reasoning by analogy.' },
    { id: 'systems', label: 'Systems Thinking', prompt: 'Use systems thinking. Focus on understanding the interconnections between parts, identify feedback loops, and consider both immediate and delayed consequences.' },
    { id: 'socratic', label: 'Socratic Method', prompt: 'Use the Socratic method. Answer with thoughtful questions that guide towards discovering answers rather than stating them directly.' },
    { id: 'devil', label: 'Devil\'s Advocate', prompt: 'Play devil\'s advocate. Challenge assumptions, question conventional wisdom, and present alternative viewpoints to strengthen reasoning.' },
    { id: 'interdisciplinary', label: 'Interdisciplinary Connector', prompt: 'Act as an interdisciplinary connector. Draw connections between different fields of knowledge and show how concepts from one domain apply to another.' },
  ];
  
  const formatStyleOptions = [
    { id: 'eli5', label: 'ELI5 (Explain Like I\'m 5)', prompt: 'Explain concepts as if talking to a 5-year-old. Use simple words, concrete examples, and avoid complexity.' },
    { id: 'tweet', label: 'Tweet-Sized', prompt: 'Provide extremely concise responses that could fit in a tweet (280 characters or less).' },
    { id: 'story', label: 'Storytelling', prompt: 'Present information as engaging stories with narrative elements, characters, and plot when appropriate.' },
    { id: 'visual', label: 'Visual Description', prompt: 'Use rich visual descriptions that help the reader imagine concepts. Describe scenes, processes, and ideas in vivid detail.' },
    { id: 'executive', label: 'Executive Summary', prompt: 'Start with a brief executive summary of key points, followed by a more detailed explanation with supporting evidence.' },
    { id: 'steps', label: 'Step-by-Step', prompt: 'Break down explanations into clear, sequential steps. Number each step and provide examples where helpful.' },
    { id: 'dialogue', label: 'Interactive Dialogue', prompt: 'Present information as a dialogue between perspectives. Create a conversation that explores different aspects of the topic.' },
  ];
  
  // Handle option selection
  const handleOptionSelect = (category, option) => {
    // For second language, make sure it's different from primary language
    if (category === 'secondLanguage' && selectedOptions.language.id === option.id) {
      return;
    }
    
    // For primary language, adjust second language if needed
    if (category === 'language' && selectedOptions.secondLanguage?.id === option.id) {
      setSelectedOptions({
        ...selectedOptions,
        language: option,
        secondLanguage: null
      });
      return;
    }
    
    setSelectedOptions({
      ...selectedOptions,
      [category]: option
    });
  };
  
  // Clear an option
  const clearOption = (category) => {
    setSelectedOptions({
      ...selectedOptions,
      [category]: null
    });
  };
  
  // Handle slider changes
  const handleSliderChange = (name, value) => {
    setSelectedOptions({
      ...selectedOptions,
      [name]: value
    });
  };
  
  // Generate a sample response
  const generateSampleResponse = () => {
    const prompt = generatePrompt();
    
    // This is just a placeholder for demo purposes
    let response = "This is a sample response based on your selected prompting options:\n\n";
    response += "Your custom AI assistant would respond with the characteristics you've selected, ";
    response += "such as the language, persona, tone, and other attributes you've configured.\n\n";
    
    if (selectedOptions.secondLanguage) {
      response += `This response would alternate between ${selectedOptions.language.label} and ${selectedOptions.secondLanguage.label}.\n\n`;
    }
    
    if (selectedOptions.persona) {
      response += `It would adopt the persona of ${selectedOptions.persona.label}.\n\n`;
    }
    
    if (inputText) {
      response += `Based on your query: "${inputText}"\n\n`;
    }
    
    response += "In a production system, this would be sent to the AI model to generate a response with all these characteristics.";
    
    return response;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 text-gray-800 dark:text-gray-200">
      <div className="bg-textured p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="mr-2 text-purple-600 dark:text-purple-400" size={24} />
          AI Prompt Builder
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language Selection */}
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <Languages className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
                Language Settings
              </h2>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Primary Language</label>
                <div className="relative">
                  <select 
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                    value={selectedOptions.language?.id}
                    onChange={(e) => {
                      const option = languageOptions.find(opt => opt.id === e.target.value);
                      handleOptionSelect('language', option);
                    }}
                  >
                    {languageOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Secondary Language (Optional)</label>
                <div className="relative">
                  <select 
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                    value={selectedOptions.secondLanguage?.id || ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        clearOption('secondLanguage');
                      } else {
                        const option = languageOptions.find(opt => opt.id === e.target.value);
                        handleOptionSelect('secondLanguage', option);
                      }
                    }}
                  >
                    <option value="">None (Single language)</option>
                    {languageOptions
                      .filter(option => option.id !== selectedOptions.language?.id)
                      .map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))
                    }
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
                </div>
                {selectedOptions.secondLanguage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Responses will alternate between the two languages.
                  </p>
                )}
              </div>
            </div>
            
            {/* Persona Selection */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <MessageSquare className="mr-2 text-yellow-500 dark:text-yellow-400" size={20} />
                Persona
              </h2>
              
              <div className="relative">
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                  value={selectedOptions.persona?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      clearOption('persona');
                    } else {
                      const option = personaOptions.find(opt => opt.id === e.target.value);
                      handleOptionSelect('persona', option);
                    }
                  }}
                >
                  <option value="">None (Default assistant)</option>
                  {personaOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
              </div>
            </div>
            
            {/* Tone/Style Selection */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <Palette className="mr-2 text-pink-500 dark:text-pink-400" size={20} />
                Tone & Style
              </h2>
              
              <div className="relative">
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                  value={selectedOptions.toneStyle?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      clearOption('toneStyle');
                    } else {
                      const option = toneStyleOptions.find(opt => opt.id === e.target.value);
                      handleOptionSelect('toneStyle', option);
                    }
                  }}
                >
                  <option value="">None (Neutral tone)</option>
                  {toneStyleOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Cognitive Approach */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <Brain className="mr-2 text-green-500 dark:text-green-400" size={20} />
                Cognitive Approach
              </h2>
              
              <div className="relative">
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                  value={selectedOptions.cognitiveBias?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      clearOption('cognitiveBias');
                    } else {
                      const option = cognitiveBiasOptions.find(opt => opt.id === e.target.value);
                      handleOptionSelect('cognitiveBias', option);
                    }
                  }}
                >
                  <option value="">None (Balanced approach)</option>
                  {cognitiveBiasOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
              </div>
            </div>
            
            {/* Format Style */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <BookOpen className="mr-2 text-red-500 dark:text-red-400" size={20} />
                Format Style
              </h2>
              
              <div className="relative">
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-textured"
                  value={selectedOptions.formatStyle?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      clearOption('formatStyle');
                    } else {
                      const option = formatStyleOptions.find(opt => opt.id === e.target.value);
                      handleOptionSelect('formatStyle', option);
                    }
                  }}
                >
                  <option value="">None (Default format)</option>
                  {formatStyleOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400" size={16} />
              </div>
            </div>
            
            {/* Sliders */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium flex items-center mb-3">
                <Gauge className="mr-2 text-indigo-500 dark:text-indigo-400" size={20} />
                Fine-Tuning
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Complexity</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedOptions.complexity < 30 ? 'Simple' : 
                       selectedOptions.complexity > 70 ? 'Complex' : 'Balanced'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={selectedOptions.complexity} 
                    onChange={(e) => handleSliderChange('complexity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Creativity</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedOptions.creativity < 30 ? 'Factual' : 
                       selectedOptions.creativity > 70 ? 'Creative' : 'Balanced'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={selectedOptions.creativity} 
                    onChange={(e) => handleSliderChange('creativity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Conciseness</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedOptions.conciseness < 30 ? 'Thorough' : 
                       selectedOptions.conciseness > 70 ? 'Concise' : 'Balanced'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={selectedOptions.conciseness} 
                    onChange={(e) => handleSliderChange('conciseness', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test Input and Button */}
        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-medium flex items-center mb-3">
            <Sparkles className="mr-2 text-orange-500 dark:text-orange-400" size={20} />
            Test Your Configuration
          </h2>
          
          <textarea
            className="w-full p-3 mb-4 border border-gray-300 dark:border-gray-600 rounded-md bg-textured min-h-[100px]"
            placeholder="Enter a test query here to see how your configured AI would respond..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          
          <div className="flex justify-between">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              onClick={() => {
                setSelectedOptions({
                  language: { id: 'english', label: 'English', prompt: 'Respond in English.' },
                  secondLanguage: null,
                  persona: null,
                  toneStyle: null,
                  cognitiveBias: null,
                  formatStyle: null,
                  complexity: 50,
                  creativity: 50,
                  conciseness: 50,
                });
                setInputText('');
                setShowOutput(false);
              }}
            >
              Reset All
            </button>
            
            <button
              className="px-4 py-2 bg-purple-600 dark:bg-purple-500 rounded-md text-white hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              onClick={() => setShowOutput(true)}
            >
              Generate Sample Response
            </button>
          </div>
        </div>
        
        {/* Output */}
        {showOutput && (
          <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-medium mb-3">Generated Prompt</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-4 whitespace-pre-wrap text-sm font-mono">
              {generatePrompt()}
            </div>
            
            <h2 className="text-lg font-medium mb-3">Sample Response</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md whitespace-pre-wrap">
              {generateSampleResponse()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
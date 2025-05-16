import { useState } from 'react';
import { Image, Sparkles, ArrowRight, ExternalLink, Lightbulb } from 'lucide-react';

const AppSuggestionsDisplay = ({ data, handleGenerate, imageUrls = {} }) => {
  // Handle missing or malformed data gracefully
  const suggestions = data?.extracted?.suggestions || [];
  const title = data?.extracted?.title || 'App Suggestions';
  
  // Track which suggestion's description is expanded
  const [expandedDescription, setExpandedDescription] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  
  const toggleDescription = (index) => {
    setExpandedDescription(expandedDescription === index ? null : index);
  };
  
  const handleSelectSuggestion = (index) => {
    setSelectedSuggestion(selectedSuggestion === index ? null : index);
  };
  
  // Function to trigger image generation
  const generateImage = (index, imageDescription) => {
    if (handleGenerate) {
      handleGenerate(index, imageDescription);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-xl shadow-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="px-8 py-10 bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-violet-500/90 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lightbulb size={28} className="text-amber-300" />
          {title}
        </h1>
        <p className="mt-3 text-lg font-light opacity-90">
          Review these naming and branding suggestions for new app
        </p>
      </div>
      
      {/* Suggestions Container */}
      <div className="p-6 md:p-8 space-y-8">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className={`bg-slate-50 dark:bg-slate-800/50  hover:shadow-md transition-all duration-200  ${
                selectedSuggestion === index 
                  ? 'border-2 border-indigo-300 dark:border-indigo-700 rounded-3xl shadow-3xl' 
                  : 'border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'
              } overflow-hidden`}
            >
              <div className="p-6 md:p-7">
                <div className="flex flex-col md:flex-row gap-6 md:items-start">
                  {/* App Details Section */}
                  <div className="flex-1 space-y-4">
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => handleSelectSuggestion(index)}
                    >
                      <h2 className={`text-2xl font-bold ${
                        selectedSuggestion === index 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-indigo-600 dark:text-indigo-700'
                      }`}>
                        {suggestion.app_name}
                      </h2>
                      <button 
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedSuggestion === index 
                            ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-100' 
                            : 'bg-slate-100 dark:bg-indigo-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {selectedSuggestion === index ? 'Selected' : 'Select'}
                      </button>
                    </div>
                    
                    <p className={`text-slate-700 dark:text-slate-300 ${
                      expandedDescription === index ? '' : 'line-clamp-3'
                    }`}>
                      {suggestion.app_description}
                    </p>
                    
                    {suggestion.app_description && suggestion.app_description.length > 180 && (
                      <button 
                        onClick={() => toggleDescription(index)}
                        className="text-indigo-500 dark:text-indigo-400 font-medium text-sm flex items-center gap-1 hover:underline"
                      >
                        {expandedDescription === index ? 'Show less' : 'Read more'}
                        <ArrowRight size={14} className={`transition-transform ${
                          expandedDescription === index ? 'rotate-90' : ''
                        }`} />
                      </button>
                    )}
                  </div>
                  
                  {/* Image Section */}
                  <div className="md:w-1/3 space-y-3">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Image size={16} />
                      Visual Inspiration
                    </h3>
                    
                    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
                      {suggestion.image_description && (
                        <p className="text-xs line-clamp-4 mb-3">
                          {suggestion.image_description}
                        </p>
                      )}
                      
                      {/* Only show generate button if handleGenerate is provided */}
                      {handleGenerate && (
                        <button
                          onClick={() => generateImage(index, suggestion.image_description)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <Sparkles size={16} />
                          Generate Image
                        </button>
                      )}
                      
                      {/* Display image if URL exists for this suggestion */}
                      {imageUrls[index] && (
                        <div className="mt-3 relative group">
                          <img 
                            src={imageUrls[index]} 
                            alt={`Generated visual for ${suggestion.app_name}`}
                            className="w-full h-auto rounded-lg object-cover shadow-sm"
                          />
                          <a 
                            href={imageUrls[index]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink size={14} className="text-indigo-500" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-500 dark:text-slate-400">No app suggestions available</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 text-center text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700">
        <p>{suggestions.length} Suggestions • Choose one or request more options</p>
      </div>
    </div>
  );
};

// Add CSS animation and utility classes
const styles = `
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
`;

// Export component
export default AppSuggestionsDisplay;
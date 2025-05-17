import { useState, useEffect } from 'react';
import { Image, Sparkles, ArrowRight, ExternalLink, Lightbulb, Loader2 } from 'lucide-react';

const AppSuggestionsLoading = () => {
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Simulate multi-stage loading process
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingStage < 3) {
        setLoadingStage(prev => prev + 1);
      }
    }, 3000); // Switch stages every 3 seconds
    
    return () => clearTimeout(timer);
  }, [loadingStage]);
  
  // Simulate progress percentage
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + Math.random() * 5;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, []);
  
  // Loading stage labels
  const loadingStages = [
    "Analyzing requirements...",
    "Generating app suggestions...",
    "Preparing branding options...",
    "Finalizing recommendations..."
  ];
  
  // Placeholder suggestions for the skeleton UI
  const placeholderSuggestions = [
    {
      app_name: "Loading suggestion...",
      app_description: "This innovative app combines cutting-edge technology with intuitive design to create a seamless user experience that addresses modern challenges in a unique way..."
    },
    {
      app_name: "Preparing concept...",
      app_description: "A revolutionary platform designed to streamline workflows and enhance productivity through intelligent automation and thoughtful user interface elements..."
    },
    {
      app_name: "Generating idea...",
      app_description: "This solution offers a comprehensive approach to solving everyday problems with a focus on accessibility, performance, and engaging visual elements..."
    }
  ];
  
  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-xl shadow-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700">
      {/* Header with shimmer effect */}
      <div className="px-8 py-10 bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-violet-500/90 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-animation"></div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lightbulb size={28} className="text-amber-300 animate-pulse" />
          App Suggestions
        </h1>
        <p className="mt-3 text-lg font-light opacity-90">
          {loadingStages[loadingStage]}
        </p>
        
        {/* Progress bar */}
        <div className="mt-6 h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-300 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm font-light opacity-80 text-right">
          {Math.round(loadingProgress)}% complete
        </p>
      </div>
      
      {/* Suggestions Container with skeleton loading */}
      <div className="p-6 md:p-8 space-y-8">
        {placeholderSuggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className={`bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden animate-pulse-subtle`}
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div className="p-6 md:p-7">
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                {/* App Details Section */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-indigo-600/70 dark:text-indigo-700/70 loading-shine">
                      {suggestion.app_name}
                    </h2>
                    <div className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-20"></div>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Animated loading lines for description */}
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-4 bg-slate-200 dark:bg-slate-700 rounded loading-shine"
                        style={{ 
                          width: `${95 - (i * 15)}%`, 
                          animationDelay: `${i * 150}ms` 
                        }}
                      ></div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded loading-shine"></div>
                    <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
                
                {/* Image Section */}
                <div className="md:w-1/3 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Image size={16} />
                    Visual Inspiration
                  </h3>
                  
                  <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 text-sm">
                    {/* Loading lines for image description */}
                    {[...Array(2)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-3 bg-slate-200 dark:bg-slate-600 rounded mb-2 loading-shine"
                        style={{ 
                          width: `${85 - (i * 20)}%`, 
                          animationDelay: `${i * 150}ms` 
                        }}
                      ></div>
                    ))}
                    
                    {/* Generate Image button placeholder */}
                    <div className="w-full h-8 mt-3 bg-indigo-400 dark:bg-indigo-600/70 rounded-lg flex items-center justify-center gap-2">
                      <Loader2 size={16} className="text-white animate-spin" />
                      <span className="text-white text-sm font-medium">Processing</span>
                    </div>
                    
                    {/* Image placeholder */}
                    <div className="mt-3 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg loading-shine"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 text-center text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <p>Loading suggestions...</p>
        </div>
      </div>
    </div>
  );
};

// Additional CSS animations and utility classes
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
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.shimmer-animation {
  animation: shimmer 2s infinite linear;
}
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.animate-pulse-subtle {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.loading-shine {
  position: relative;
  overflow: hidden;
}
.loading-shine::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0)
  );
  animation: shimmer 2s infinite;
}
.dark .loading-shine::after {
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0)
  );
}
`;

// Export component
export default AppSuggestionsLoading;
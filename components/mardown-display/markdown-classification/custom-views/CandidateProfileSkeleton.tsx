import { Briefcase, MapPin, DollarSign, Calendar, Award } from 'lucide-react';

const CandidateProfileSkeleton = () => {
  // Section icons for visual consistency with the loaded component
  const sectionIcons = {
    additional_accomplishments: <Award size={18} className="text-slate-300 dark:text-slate-600" />,
    location: <MapPin size={18} className="text-slate-300 dark:text-slate-600" />,
    compensation: <DollarSign size={18} className="text-slate-300 dark:text-slate-600" />,
    availability: <Calendar size={18} className="text-slate-300 dark:text-slate-600" />
  };

  // Array of section keys for mapping
  const sectionKeys = ['additional_accomplishments', 'location', 'compensation', 'availability'];
  
  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-xl shadow-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 relative">
      {/* Shimmer overlay for the entire component */}
      <div className="absolute inset-0 skeleton-shimmer"></div>
      
      {/* Header Skeleton */}
      <div className="px-8 py-10 bg-gradient-to-r from-indigo-400/30 via-purple-400/30 to-pink-400/30">
        {/* Name skeleton */}
        <div className="h-9 w-64 bg-white/20 rounded-lg animate-pulse"></div>
        {/* Intro skeleton */}
        <div className="mt-4 h-6 w-full max-w-md bg-white/10 rounded-md animate-pulse"></div>
      </div>
      
      {/* Content Container */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Professional Experience Section Skeleton */}
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Briefcase size={20} className="text-slate-300 dark:text-slate-600" />
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
          </h2>
          
          {/* Experience items skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div 
                key={index} 
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-slate-300 dark:text-slate-600" />
                    <div className="h-6 w-40 md:w-56 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                </div>
                
                {/* First item shows some content for better visual representation */}
                {index === 0 && (
                  <div className="mt-4 pl-2">
                    <ul className="space-y-3">
                      {[1, 2, 3].map((_, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-2"></span>
                          <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Additional Info Sections Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionKeys.map((section, index) => (
            <div key={section} className="space-y-3">
              <div className="flex justify-between items-center p-4 rounded-xl shadow-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span>{sectionIcons[section]}</span>
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                </div>
                <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              </div>
              
              {/* First section shows content for better visual representation */}
              {index === 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                  <ul className="space-y-3">
                    {[1, 2].map((_, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-2"></span>
                        <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Feedback Button Skeleton */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer Skeleton */}
      <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 text-center border-t border-slate-200 dark:border-slate-700">
        <div className="h-4 w-48 mx-auto bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
      </div>
    </div>
  );
};

// Add the skeleton shimmer animation and pulse animations
const styles = `
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
}

.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  pointer-events: none;
}

/* Dark mode adjustments */
.dark .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0) 0%,
    rgba(30, 41, 59, 0.1) 20%,
    rgba(30, 41, 59, 0.2) 60%,
    rgba(30, 41, 59, 0) 100%
  );
}
`;

export default CandidateProfileSkeleton;
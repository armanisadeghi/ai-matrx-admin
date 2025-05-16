import { useState } from 'react';

const CandidateProfileWithCollapse = ({ data }) => {
  const { extracted } = data;
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-xl shadow-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{extracted.name}</h1>
        <p className="mt-2 text-lg italic text-slate-700 dark:text-slate-300">{extracted.intro}</p>
      </div>

      {/* Body Content */}
      <div className="p-6 space-y-6">
        {/* Key Experiences */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold pb-2 border-b border-slate-300 dark:border-slate-700">
            Professional Experience
          </h2>
          
          {extracted.key_experiences.map((experience, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div 
                onClick={() => toggleSection(`experience-${index}`)} 
                className="flex justify-between items-center cursor-pointer"
              >
                <h3 className="text-xl font-medium text-slate-900 dark:text-white">{experience.company}</h3>
                <span className="text-slate-500 dark:text-slate-400">
                  {expandedSection === `experience-${index}` ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </div>
              
              {(expandedSection === `experience-${index}` || index === 0) && (
                <ul className="mt-3 space-y-2 pl-2">
                  {experience.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 mr-2"></span>
                      <span className="text-slate-700 dark:text-slate-300">{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Additional Info Sections */}
        {['additional_accomplishments', 'location', 'compensation', 'availability'].map((section) => 
          extracted[section] && extracted[section].length > 0 ? (
            <div key={section} className="space-y-2">
              <div 
                onClick={() => toggleSection(section)}
                className="flex justify-between items-center cursor-pointer bg-slate-100 dark:bg-slate-800 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <h2 className="text-xl font-medium text-slate-900 dark:text-white capitalize">
                  {section.replace(/_/g, ' ')}
                </h2>
                <span className="text-slate-500 dark:text-slate-400">
                  {expandedSection === section ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </div>
              
              {expandedSection === section && (
                <div className="pl-4 py-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <ul className="space-y-2">
                    {extracted[section].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 mr-2"></span>
                        <span className="text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-200 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400 text-sm">
        <p>Candidate Profile • Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default CandidateProfileWithCollapse;
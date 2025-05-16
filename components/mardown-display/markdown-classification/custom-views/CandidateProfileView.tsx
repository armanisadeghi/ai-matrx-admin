import React from 'react';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Award, 
  ChevronRight,
  User
} from 'lucide-react';

const CandidateProfileView = ({ data }) => {
  const { extracted } = data;
  
  return (
    <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-lg bg-white dark:bg-slate-800 transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-900 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200">
            <User size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{extracted.name}</h1>
            <p className="text-slate-200 mt-1 italic">{extracted.intro}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800">
        {/* Experience Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Briefcase className="text-slate-500 dark:text-slate-400 mr-2" size={20} />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Professional Experience</h2>
          </div>
          
          <div className="space-y-6">
            {extracted.key_experiences.map((experience, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-slate-700 rounded-lg p-5 shadow-sm border border-slate-100 dark:border-slate-600"
              >
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{experience.company}</h3>
                <ul className="space-y-2">
                  {experience.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start">
                      <ChevronRight className="text-slate-400 dark:text-slate-500 mr-2 mt-1 flex-shrink-0" size={16} />
                      <span className="text-slate-600 dark:text-slate-300">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Additional Accomplishments */}
        {extracted.additional_accomplishments && extracted.additional_accomplishments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Award className="text-slate-500 dark:text-slate-400 mr-2" size={20} />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Additional Accomplishments</h2>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg p-5 shadow-sm border border-slate-100 dark:border-slate-600">
              <ul className="space-y-2">
                {extracted.additional_accomplishments.map((accomplishment, index) => (
                  <li key={index} className="flex items-start">
                    <ChevronRight className="text-slate-400 dark:text-slate-500 mr-2 mt-1 flex-shrink-0" size={16} />
                    <span className="text-slate-600 dark:text-slate-300">{accomplishment}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Bottom Grid: Location, Compensation, Availability */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Location */}
          <div className="bg-white dark:bg-slate-700 rounded-lg p-5 shadow-sm border border-slate-100 dark:border-slate-600">
            <div className="flex items-center mb-3">
              <MapPin className="text-slate-500 dark:text-slate-400 mr-2" size={18} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Location</h3>
            </div>
            <ul className="space-y-2">
              {extracted.location.map((item, index) => (
                <li key={index} className="flex items-start">
                  <ChevronRight className="text-slate-400 dark:text-slate-500 mr-2 mt-1 flex-shrink-0" size={16} />
                  <span className="text-slate-600 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Compensation */}
          <div className="bg-white dark:bg-slate-700 rounded-lg p-5 shadow-sm border border-slate-100 dark:border-slate-600">
            <div className="flex items-center mb-3">
              <DollarSign className="text-slate-500 dark:text-slate-400 mr-2" size={18} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Compensation</h3>
            </div>
            <ul className="space-y-2">
              {extracted.compensation.map((item, index) => (
                <li key={index} className="flex items-start">
                  <ChevronRight className="text-slate-400 dark:text-slate-500 mr-2 mt-1 flex-shrink-0" size={16} />
                  <span className="text-slate-600 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Availability */}
          <div className="bg-white dark:bg-slate-700 rounded-lg p-5 shadow-sm border border-slate-100 dark:border-slate-600">
            <div className="flex items-center mb-3">
              <Clock className="text-slate-500 dark:text-slate-400 mr-2" size={18} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Availability</h3>
            </div>
            <ul className="space-y-2">
              {extracted.availability.map((item, index) => (
                <li key={index} className="flex items-start">
                  <ChevronRight className="text-slate-400 dark:text-slate-500 mr-2 mt-1 flex-shrink-0" size={16} />
                  <span className="text-slate-600 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileView;
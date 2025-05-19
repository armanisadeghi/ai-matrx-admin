// "use client";

// import React from 'react';
// import FlexibleLoadingComponent from '../common/DefaultLoadingComponent';
// import { AppSuggestionsLoading } from '../view-components/AppSuggestionsView';
// import { CandidateProfileSkeleton } from '../view-components/CandidateProfileView';

// export const DefaultLoadingSkeleton: React.FC = () => (
//   <div className="animate-pulse space-y-4">
//     <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
//     <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
//     <div className="space-y-2">
//       <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
//       <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
//     </div>
//   </div>
// );


// export const LOADING_COMPONENTS = {
//     "default": FlexibleLoadingComponent,
//     "app_suggestions": AppSuggestionsLoading,
//     "candidate_profile": CandidateProfileSkeleton
// }

// export const getLoadingComponent = (configType: string) => {
//     return LOADING_COMPONENTS[configType] || LOADING_COMPONENTS.default;
// }

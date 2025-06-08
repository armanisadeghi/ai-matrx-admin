// Viewer Recommendation Utility
// Analyzes data structures and recommends the best existing viewer

export interface ViewerRecommendation {
  viewerName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  matchedPattern: string;
  sampleCount?: number;
}

// Pattern detection functions for each viewer (ordered by specificity)

// 1. SectionGroupTab - Most specific structure
const detectSectionGroupPattern = (data: any): ViewerRecommendation | null => {
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.sections) &&
    data.sections.length > 0 &&
    data.sections.every((section: any) =>
      section &&
      typeof section === 'object' &&
      typeof section.position === 'number' &&
      Array.isArray(section.lines) &&
      section.lines.every((line: any) =>
        line &&
        typeof line === 'object' &&
        typeof line.position === 'number' &&
        typeof line.category === 'string' &&
        typeof line.line === 'string' &&
        line.metadata &&
        line.segmentation
      )
    )
  ) {
    return {
      viewerName: 'SectionGroupTab',
      confidence: 'high',
      reasoning: 'Data structure matches SectionGroup with sections containing lines with metadata and segmentation',
      matchedPattern: 'SectionGroup',
      sampleCount: data.sections.length
    };
  }
  return null;
};

// 2. SectionViewer/SectionViewerWithSidebar - ClassifiedSection pattern
const detectClassifiedSectionPattern = (data: any): ViewerRecommendation | null => {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item: any) =>
      item &&
      typeof item === 'object' &&
      typeof item.section === 'string' &&
      Array.isArray(item.content) &&
      item.content.every((c: any) => typeof c === 'string')
    )
  ) {
    return {
      viewerName: 'SectionViewer / SectionViewerWithSidebar',
      confidence: 'high',
      reasoning: 'Data structure matches ClassifiedSection[] with section (string) and content (string[])',
      matchedPattern: 'ClassifiedSection[]',
      sampleCount: data.length
    };
  }
  return null;
};

// 3. section-viewer-V2 - SectionData pattern
const detectSectionDataPattern = (data: any): ViewerRecommendation | null => {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item: any) =>
      item &&
      typeof item === 'object' &&
      typeof item.section === 'string' &&
      Array.isArray(item.content) &&
      item.content.every((c: any) => typeof c === 'string') &&
      !item.section_type // Distinguish from ClassifiedSection which might have section_type
    )
  ) {
    return {
      viewerName: 'section-viewer-V2',
      confidence: 'high',
      reasoning: 'Data structure matches SectionData[] with section (string) and content (string[])',
      matchedPattern: 'SectionData[]',
      sampleCount: data.length
    };
  }
  return null;
};

// 4. sections-viewer - ContentSection pattern
const detectContentSectionPattern = (data: any): ViewerRecommendation | null => {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((section: any) =>
      section &&
      typeof section === 'object' &&
      typeof section.type === 'string' &&
      Array.isArray(section.children) &&
      section.children.every((item: any) =>
        item &&
        typeof item === 'object' &&
        typeof item.type === 'string' &&
        typeof item.content === 'string'
      )
    )
  ) {
    return {
      viewerName: 'sections-viewer',
      confidence: 'high',
      reasoning: 'Data structure matches ContentSection[] with type and children array containing ContentItems',
      matchedPattern: 'ContentSection[]',
      sampleCount: data.length
    };
  }
  return null;
};

// 5. lines-viewer - LineItem pattern
const detectLineItemPattern = (data: any): ViewerRecommendation | null => {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item: any) =>
      item &&
      typeof item === 'object' &&
      typeof item.type === 'string' &&
      typeof item.content === 'string' &&
      !item.children // Distinguish from ContentSection children
    )
  ) {
    return {
      viewerName: 'lines-viewer',
      confidence: 'high',
      reasoning: 'Data structure matches LineItem[] with type (string) and content (string)',
      matchedPattern: 'LineItem[]',
      sampleCount: data.length
    };
  }
  return null;
};

// 6. IntelligentViewer - Key-Value Object pattern
const detectKeyValuePattern = (data: any): ViewerRecommendation | null => {
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data).length > 0 &&
    Object.values(data).every(value => typeof value === 'string')
  ) {
    return {
      viewerName: 'IntelligentViewer',
      confidence: 'medium',
      reasoning: 'Data structure is a flat object with string values - suitable for key-value rendering',
      matchedPattern: 'Key-Value Object',
      sampleCount: Object.keys(data).length
    };
  }
  return null;
};

// 7. IntelligentViewer - Section-with-Children pattern
const detectSectionWithChildrenPattern = (data: any): ViewerRecommendation | null => {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item: any) =>
      item &&
      typeof item === 'object' &&
      typeof item.type === 'string' &&
      Array.isArray(item.children) &&
      item.children.every((child: any) =>
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string' &&
        typeof child.content === 'string'
      )
    ) &&
    // This is similar to ContentSection but we need to distinguish
    // IntelligentViewer handles this pattern but sections-viewer is more specific
    !data.every((section: any) => 
      section.children.every((item: any) => 
        ['header_h1', 'header_h2', 'header_h3', 'bullet', 'paragraph', 'line_break'].includes(item.type)
      )
    )
  ) {
    return {
      viewerName: 'IntelligentViewer',
      confidence: 'low',
      reasoning: 'Data structure has type and children pattern but may be better handled by sections-viewer',
      matchedPattern: 'Section-with-Children (Generic)',
      sampleCount: data.length
    };
  }
  return null;
};

// Main recommendation function
export const getViewerRecommendation = (data: any): ViewerRecommendation => {
  // Try detectors in order of specificity (most specific first)
  const detectors = [
    detectSectionGroupPattern,
    detectClassifiedSectionPattern,
    detectSectionDataPattern,
    detectContentSectionPattern,
    detectLineItemPattern,
    detectKeyValuePattern,
    detectSectionWithChildrenPattern
  ];

  for (const detector of detectors) {
    const recommendation = detector(data);
    if (recommendation) {
      return recommendation;
    }
  }

  // Fallback recommendation
  return {
    viewerName: 'IntelligentViewer',
    confidence: 'low',
    reasoning: 'No specific pattern detected - IntelligentViewer will attempt to handle with fallbacks',
    matchedPattern: 'Unknown Structure'
  };
};

// Helper function to get multiple recommendations (useful for debugging)
export const getAllViewerRecommendations = (data: any): ViewerRecommendation[] => {
  const detectors = [
    { name: 'SectionGroup', fn: detectSectionGroupPattern },
    { name: 'ClassifiedSection', fn: detectClassifiedSectionPattern },
    { name: 'SectionData', fn: detectSectionDataPattern },
    { name: 'ContentSection', fn: detectContentSectionPattern },
    { name: 'LineItem', fn: detectLineItemPattern },
    { name: 'Key-Value', fn: detectKeyValuePattern },
    { name: 'Section-with-Children', fn: detectSectionWithChildrenPattern }
  ];

  const recommendations: ViewerRecommendation[] = [];
  
  for (const detector of detectors) {
    const recommendation = detector.fn(data);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  return recommendations;
};

// Quick analysis function for debugging
export const analyzeDataStructure = (data: any): {
  dataType: string;
  isArray: boolean;
  arrayLength?: number;
  topLevelKeys?: string[];
  sampleStructure?: any;
  recommendations: ViewerRecommendation[];
} => {
  const isArray = Array.isArray(data);
  const dataType = typeof data;
  
  let result: any = {
    dataType,
    isArray,
    recommendations: getAllViewerRecommendations(data)
  };

  if (isArray) {
    result.arrayLength = data.length;
    if (data.length > 0) {
      result.sampleStructure = {
        firstItem: data[0],
        keysInFirstItem: typeof data[0] === 'object' ? Object.keys(data[0]) : null
      };
    }
  } else if (dataType === 'object' && data !== null) {
    result.topLevelKeys = Object.keys(data);
    result.sampleStructure = {
      keyCount: Object.keys(data).length,
      firstFewKeys: Object.keys(data).slice(0, 3),
      valueTypes: Object.values(data).slice(0, 3).map(v => typeof v)
    };
  }

  return result;
}; 
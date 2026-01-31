interface ResearchFinding {
  id: string;
  title: string;
  primarySource: string;
  additionalSources: string[];
  urls: string[];
  keyDetails: string;
  significance: string;
  futureImplications: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ResearchSection {
  id: string;
  title: string;
  subtitle?: string;
  findings: ResearchFinding[];
}

interface ResearchChallenge {
  id: string;
  title: string;
  description: string;
  currentSolutions?: string;
  researchGaps?: string;
  category: 'technical' | 'ethical' | 'regulatory' | 'other';
}

interface ResearchRecommendation {
  id: string;
  recommendation: string;
  target: 'researchers' | 'industry' | 'policymakers' | 'general';
}

interface UnrecognizedSection {
  id: string;
  title: string;
  content: string;
  rawLines: string[];
}

interface ResearchData {
  title: string;
  overview: string;
  researchScope?: string;
  keyFocusAreas?: string;
  analysisPeriod?: string;
  executiveSummary?: string;
  introduction: string;
  researchQuestions: string[];
  sections: ResearchSection[];
  convergentThemes: Array<{theme: string; description: string}>;
  conflictingEvidence?: {
    disagreement: string;
    perspectives: string;
    resolution: string;
  };
  shortTermOutlook: string[];
  mediumTermOutlook: string[];
  longTermVision: string[];
  challenges: ResearchChallenge[];
  recommendations: ResearchRecommendation[];
  conclusion: string;
  keyTakeaways: string[];
  methodology?: {
    searchStrategy: string;
    selectionCriteria: string;
    analysisFramework: string;
  };
  sourceQuality?: {
    peerReviewed: number;
    industryReports: number;
    expertInterviews: number;
    governmentPubs: number;
  };
  limitations: string[];
  metadata: {
    researchDate?: string;
    lastUpdated?: string;
    confidenceRating?: string;
    biasAssessment?: string;
  };
  // Add debug information
  unrecognizedSections: UnrecognizedSection[];
  rawContent: string;
  parsingStats: {
    totalLines: number;
    processedLines: number;
    skippedLines: number;
  };
}

export const parseResearchMarkdown = (content: string): ResearchData | null => {
  try {
    // Remove the research tags but keep original for debugging
    const originalContent = content;
    const cleanContent = content
      .replace(/<research>/g, '')
      .replace(/<\/research>/g, '')
      .trim();

    const lines = cleanContent.split('\n');
    const totalLines = lines.length;
    let processedLines = 0;
    let skippedLines = 0;
    
    // Initialize all variables
    let title = '';
    let overview = '';
    let researchScope = '';
    let keyFocusAreas = '';
    let analysisPeriod = '';
    let executiveSummary = '';
    let introduction = '';
    const researchQuestions: string[] = [];
    const sections: ResearchSection[] = [];
    const convergentThemes: Array<{theme: string; description: string}> = [];
    let conflictingEvidence: ResearchData['conflictingEvidence'];
    const shortTermOutlook: string[] = [];
    const mediumTermOutlook: string[] = [];
    const longTermVision: string[] = [];
    const challenges: ResearchChallenge[] = [];
    const recommendations: ResearchRecommendation[] = [];
    let conclusion = '';
    const keyTakeaways: string[] = [];
    let methodology: ResearchData['methodology'];
    let sourceQuality: ResearchData['sourceQuality'];
    const limitations: string[] = [];
    const metadata: ResearchData['metadata'] = {};
    const unrecognizedSections: UnrecognizedSection[] = [];

    let i = 0;
    let currentSection: ResearchSection | null = null;
    let currentFinding: Partial<ResearchFinding> | null = null;
    let currentChallenge: Partial<ResearchChallenge> | null = null;
    let currentContext = '';
    let currentUnrecognizedSection: UnrecognizedSection | null = null;
    let unrecognizedContent: string[] = [];

    // Helper function to save unrecognized content
    const saveUnrecognizedSection = () => {
      if (currentUnrecognizedSection && unrecognizedContent.length > 0) {
        currentUnrecognizedSection.content = unrecognizedContent.join('\n');
        currentUnrecognizedSection.rawLines = [...unrecognizedContent];
        unrecognizedSections.push(currentUnrecognizedSection);
        currentUnrecognizedSection = null;
        unrecognizedContent = [];
      }
    };

    // Parse the content with comprehensive capture
    while (i < lines.length) {
      const line = lines[i].trim();
      let wasProcessed = false;
      
      // Skip empty lines but don't count as skipped
      if (!line) {
        i++;
        continue;
      }
      
      // Extract title (first header)
      if (line.startsWith('#') && !line.startsWith('##') && !title) {
        saveUnrecognizedSection(); // Save any pending unrecognized content
        title = line.replace(/^#+\s*/, '').trim();
        wasProcessed = true;
      }
      
      // Section headers (## level)
      else if (line.startsWith('##')) {
        saveUnrecognizedSection(); // Save any pending unrecognized content
        
        const sectionTitle = line.replace(/^#+\s*/, '').trim();
        const sectionTitleLower = sectionTitle.toLowerCase();
        
        // Set context based on section
        if (sectionTitleLower.includes('overview')) {
          currentContext = 'overview';
        } else if (sectionTitleLower.includes('executive summary')) {
          currentContext = 'executive_summary';
        } else if (sectionTitleLower.includes('introduction')) {
          currentContext = 'introduction';
        } else if (sectionTitleLower.includes('key research') || sectionTitleLower.includes('research and discoveries')) {
          currentContext = 'research_findings';
        } else if (sectionTitleLower.includes('critical analysis') || sectionTitleLower.includes('synthesis')) {
          currentContext = 'analysis';
        } else if (sectionTitleLower.includes('future trends') || sectionTitleLower.includes('predictions')) {
          currentContext = 'predictions';
        } else if (sectionTitleLower.includes('challenges') || sectionTitleLower.includes('limitations')) {
          currentContext = 'challenges';
        } else if (sectionTitleLower.includes('recommendations')) {
          currentContext = 'recommendations';
        } else if (sectionTitleLower.includes('conclusion')) {
          currentContext = 'conclusion';
        } else if (sectionTitleLower.includes('methodology')) {
          currentContext = 'methodology';
        } else {
          // Unrecognized section - start capturing it
          currentContext = 'unrecognized';
          currentUnrecognizedSection = {
            id: `unrecognized-${unrecognizedSections.length}`,
            title: sectionTitle,
            content: '',
            rawLines: []
          };
        }
        
        wasProcessed = true;
      }

      // Research scope and metadata
      if (line.startsWith('**Research Scope:**')) {
        researchScope = line.replace('**Research Scope:**', '').trim();
        i++;
        continue;
      }
      
      if (line.startsWith('**Key Focus Areas:**')) {
        keyFocusAreas = line.replace('**Key Focus Areas:**', '').trim();
        i++;
        continue;
      }
      
      if (line.startsWith('**Analysis Period:**')) {
        analysisPeriod = line.replace('**Analysis Period:**', '').trim();
        i++;
        continue;
      }

      // Research Questions
      if (currentContext === 'introduction' && /^\d+\.\s/.test(line)) {
        const question = line.replace(/^\d+\.\s*/, '').trim();
        researchQuestions.push(question);
        i++;
        continue;
      }

      // Research findings sections
      if (currentContext === 'research_findings' && line.startsWith('###')) {
        // Save previous section
        if (currentSection && currentSection.findings.length > 0) {
          sections.push(currentSection);
        }
        
        const sectionTitle = line.replace(/^#+\s*\*?\*?/, '').replace(/\*?\*?$/, '').trim();
        currentSection = {
          id: `section-${sections.length}`,
          title: sectionTitle,
          findings: []
        };
        i++;
        continue;
      }

      // Research findings
      if (currentContext === 'research_findings' && line.startsWith('####') && line.includes('Research Finding')) {
        // Save previous finding
        if (currentFinding && currentFinding.title && currentSection) {
          currentSection.findings.push({
            id: currentFinding.id || `finding-${currentSection.findings.length}`,
            title: currentFinding.title,
            primarySource: currentFinding.primarySource || '',
            additionalSources: currentFinding.additionalSources || [],
            urls: currentFinding.urls || [],
            keyDetails: currentFinding.keyDetails || '',
            significance: currentFinding.significance || '',
            futureImplications: currentFinding.futureImplications || '',
            confidenceLevel: currentFinding.confidenceLevel || 'MEDIUM'
          });
        }
        
        const findingTitle = line.replace(/^#+\s*.*?:\s*\*?\*?/, '').replace(/\*?\*?$/, '').trim();
        currentFinding = {
          id: `finding-${Date.now()}-${Math.random()}`,
          title: findingTitle,
          additionalSources: [],
          urls: []
        };
        i++;
        continue;
      }

      // Finding details
      if (currentFinding && line.startsWith('-')) {
        const content = line.replace(/^-\s*/, '').trim();
        
        if (content.startsWith('**Primary Source:**')) {
          currentFinding.primarySource = content.replace('**Primary Source:**', '').trim();
        } else if (content.startsWith('**Additional Sources:**')) {
          const sources = content.replace('**Additional Sources:**', '').trim();
          currentFinding.additionalSources = sources.split(';').map(s => s.trim()).filter(s => s);
        } else if (content.startsWith('**Key Details:**')) {
          currentFinding.keyDetails = content.replace('**Key Details:**', '').trim();
        } else if (content.startsWith('**Significance:**')) {
          currentFinding.significance = content.replace('**Significance:**', '').trim();
        } else if (content.startsWith('**Future Implications:**')) {
          currentFinding.futureImplications = content.replace('**Future Implications:**', '').trim();
        } else if (content.startsWith('**Confidence Level:**')) {
          const level = content.replace('**Confidence Level:**', '').trim().toUpperCase();
          if (['HIGH', 'MEDIUM', 'LOW'].includes(level)) {
            currentFinding.confidenceLevel = level as 'HIGH' | 'MEDIUM' | 'LOW';
          }
        } else if (content.startsWith('http')) {
          currentFinding.urls = currentFinding.urls || [];
          currentFinding.urls.push(content);
        }
      }

      // Convergent themes
      if (currentContext === 'analysis' && /^\d+\.\s*\*\*/.test(line)) {
        const match = line.match(/^\d+\.\s*\*\*([^*]+)\*\*:\s*(.+)$/);
        if (match) {
          convergentThemes.push({
            theme: match[1].trim(),
            description: match[2].trim()
          });
        }
        i++;
        continue;
      }

      // Future predictions
      if (currentContext === 'predictions' || currentContext === 'short_term' || currentContext === 'medium_term' || currentContext === 'long_term') {
        if (line.startsWith('###') && line.toLowerCase().includes('short-term')) {
          currentContext = 'short_term';
        } else if (line.startsWith('###') && line.toLowerCase().includes('medium-term')) {
          currentContext = 'medium_term';
        } else if (line.startsWith('###') && line.toLowerCase().includes('long-term')) {
          currentContext = 'long_term';
        } else if (line.startsWith('-') && currentContext === 'short_term') {
          shortTermOutlook.push(line.replace(/^-\s*/, '').trim());
        } else if (line.startsWith('-') && currentContext === 'medium_term') {
          mediumTermOutlook.push(line.replace(/^-\s*/, '').trim());
        } else if (line.startsWith('-') && currentContext === 'long_term') {
          longTermVision.push(line.replace(/^-\s*/, '').trim());
        }
      }

      // Key takeaways
      if (currentContext === 'conclusion' && /^\d+\.\s/.test(line)) {
        keyTakeaways.push(line.replace(/^\d+\.\s*/, '').trim());
        i++;
        continue;
      }

      // Collect content for current context
      if (currentContext && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*') && line.length > 0) {
        switch (currentContext) {
          case 'overview':
            if (!line.startsWith('**')) overview += (overview ? ' ' : '') + line;
            break;
          case 'executive_summary':
            executiveSummary += (executiveSummary ? ' ' : '') + line;
            break;
          case 'introduction':
            if (!line.match(/^\d+\./)) introduction += (introduction ? ' ' : '') + line;
            break;
          case 'conclusion':
            if (!line.match(/^\d+\./)) conclusion += (conclusion ? ' ' : '') + line;
            break;
        }
      }

      i++;
    }

    // Save final items
    if (currentSection && currentSection.findings.length > 0) {
      sections.push(currentSection);
    }
    
    if (currentFinding && currentFinding.title && currentSection) {
      currentSection.findings.push({
        id: currentFinding.id || `finding-${currentSection.findings.length}`,
        title: currentFinding.title,
        primarySource: currentFinding.primarySource || '',
        additionalSources: currentFinding.additionalSources || [],
        urls: currentFinding.urls || [],
        keyDetails: currentFinding.keyDetails || '',
        significance: currentFinding.significance || '',
        futureImplications: currentFinding.futureImplications || '',
        confidenceLevel: currentFinding.confidenceLevel || 'MEDIUM'
      });
    }

    return {
      title: title || 'Research Analysis',
      overview: overview || '',
      researchScope,
      keyFocusAreas,
      analysisPeriod,
      executiveSummary,
      introduction: introduction || '',
      researchQuestions,
      sections,
      convergentThemes,
      conflictingEvidence,
      shortTermOutlook,
      mediumTermOutlook,
      longTermVision,
      challenges,
      recommendations,
      conclusion: conclusion || '',
      keyTakeaways,
      methodology,
      sourceQuality,
      limitations,
      metadata,
      unrecognizedSections,
      rawContent: originalContent,
      parsingStats: {
        totalLines,
        processedLines,
        skippedLines
      }
    };
    
  } catch (error) {
    console.error('Error parsing research markdown:', error);
    return null;
  }
};

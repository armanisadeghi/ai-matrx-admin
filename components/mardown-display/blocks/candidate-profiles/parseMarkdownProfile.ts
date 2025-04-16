// Helper to generate unique IDs
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Types for our candidate profile data structure
export type ProfileItemType = {
    id: string;
    content: string;
    highlight?: boolean;
};

export type ExperienceItemType = {
    id: string;
    title: string;
    company?: string;
    details: ProfileItemType[];
};

export type ProfileSectionType = {
    id: string;
    title: string;
    type: 'experience' | 'text' | 'keyValue';
    content?: string;
    items?: ProfileItemType[];
    experiences?: ExperienceItemType[];
};

export type CandidateProfileType = {
    id: string;
    name: string;
    subtitle?: string;
    sections: ProfileSectionType[];
};

// Parser to convert markdown to structured data
export const parseMarkdownProfile = (markdown: string): CandidateProfileType => {
    const lines = markdown.split('\n');
    
    // Initialize profile structure
    const profile: CandidateProfileType = {
        id: generateId(),
        name: '',
        sections: []
    };
    
    // Line processing variables
    let lineIndex = 0;
    let currentSection: ProfileSectionType | null = null;
    
    // Process the markdown line by line
    while (lineIndex < lines.length) {
        const line = lines[lineIndex];
        const trimmedLine = line.trim();
        
        // Skip empty lines and horizontal rules
        if (trimmedLine === '' || trimmedLine === '---') {
            lineIndex++;
            continue;
        }
        
        // Parse candidate name
        if (trimmedLine.startsWith('### Candidate Profile:')) {
            const nameParts = trimmedLine.replace('### Candidate Profile:', '').trim().split('[');
            profile.name = nameParts[0].trim();
            lineIndex++;
            continue;
        }
        
        // Parse subtitle (first non-header line after the title)
        if (profile.name && !profile.subtitle && !trimmedLine.startsWith('###') && !trimmedLine.startsWith('---')) {
            profile.subtitle = trimmedLine;
            lineIndex++;
            continue;
        }
        
        // Parse section headers
        if (trimmedLine.startsWith('###')) {
            const title = trimmedLine.replace(/^###\s+/, '').trim();
            
            // Determine section type based on title
            if (title.includes('Experience') || title.includes('Employment')) {
                // For experience sections, we need special handling
                currentSection = {
                    id: generateId(),
                    title,
                    type: 'experience',
                    experiences: []
                };
                
                profile.sections.push(currentSection);
                
                // Process the experience section
                lineIndex = processExperienceSection(lines, lineIndex + 1, currentSection);
                continue;
            } else {
                // Other regular sections
                let sectionType: 'text' | 'keyValue' = 'text';
                if (title.includes('Compensation') || title.includes('Location') || title.includes('Availability')) {
                    sectionType = 'keyValue';
                }
                
                currentSection = {
                    id: generateId(),
                    title,
                    type: sectionType,
                    items: []
                };
                
                profile.sections.push(currentSection);
                lineIndex++;
                continue;
            }
        }
        
        // Special case for Additional Accomplishments section (without ### prefix)
        if (trimmedLine.startsWith('**Additional Accomplishments:**')) {
            currentSection = {
                id: generateId(),
                title: 'Additional Accomplishments',
                type: 'text',
                items: []
            };
            
            profile.sections.push(currentSection);
            lineIndex++;
            continue;
        }
        
        // Process content for non-experience sections
        if (currentSection && currentSection.type !== 'experience') {
            // Handle bullet points
            if (trimmedLine.startsWith('-')) {
                const content = trimmedLine.replace(/^-\s+/, '').trim();
                
                if (!currentSection.items) {
                    currentSection.items = [];
                }
                
                currentSection.items.push({
                    id: generateId(),
                    content: processBoldText(content),
                    highlight: content.includes('**')
                });
                
                lineIndex++;
                continue;
            } 
            // Handle plain text content
            else if (trimmedLine) {
                if (!currentSection.content) {
                    currentSection.content = processBoldText(trimmedLine);
                } else {
                    currentSection.content += ' ' + processBoldText(trimmedLine);
                }
                
                lineIndex++;
                continue;
            }
        }
        
        // Skip any unprocessed lines
        lineIndex++;
    }
    
    return profile;
};

// Process the experience section and its company entries
function processExperienceSection(lines: string[], startLineIndex: number, section: ProfileSectionType): number {
    let lineIndex = startLineIndex;
    let currentExperience: ExperienceItemType | null = null;
    
    while (lineIndex < lines.length) {
        const line = lines[lineIndex];
        const trimmedLine = line.trim();
        
        // End of section is either next section header or horizontal rule
        if (trimmedLine.startsWith('###') || trimmedLine === '---') {
            return lineIndex;
        }
        
        // Empty line - just skip
        if (trimmedLine === '') {
            lineIndex++;
            continue;
        }
        
        // Company heading line (e.g., "**Company Name - Position**")
        // This regex matches both standard dash (-) and en dash (–)
        const companyMatch = trimmedLine.match(/^\*\*([^*]+)\*\*\s*[–-]\s*(.*)/);
        if (companyMatch) {
            currentExperience = {
                id: generateId(),
                company: companyMatch[1].trim(),
                title: companyMatch[2].trim(),
                details: []
            };
            
            if (!section.experiences) {
                section.experiences = [];
            }
            
            section.experiences.push(currentExperience);
            lineIndex++;
            continue;
        }
        
        // Bullet point under a company
        if (trimmedLine.startsWith('-') && currentExperience) {
            const content = trimmedLine.replace(/^-\s+/, '').trim();
            
            currentExperience.details.push({
                id: generateId(),
                content: processBoldText(content),
                highlight: content.includes('**')
            });
            
            lineIndex++;
            continue;
        }
        
        // If we're in an experience section but not a bullet point or a company header
        // it might be another company heading without proper formatting or with different formatting
        if (trimmedLine.startsWith('**') && trimmedLine.includes('**')) {
            // This is likely a new company heading with a different format
            const cleanedLine = trimmedLine.replace(/\*\*/g, '');
            
            // Try to split by dash or en dash
            const parts = cleanedLine.includes('–') 
                ? cleanedLine.split('–') 
                : cleanedLine.split('-');
            
            if (parts.length >= 2) {
                currentExperience = {
                    id: generateId(),
                    company: parts[0].trim(),
                    title: parts[1].trim(),
                    details: []
                };
            } else {
                // If we can't split, treat the whole line as the company name
                currentExperience = {
                    id: generateId(),
                    company: cleanedLine.trim(),
                    title: '',
                    details: []
                };
            }
            
            if (!section.experiences) {
                section.experiences = [];
            }
            
            section.experiences.push(currentExperience);
            lineIndex++;
            continue;
        }
        
        // If we encounter a line that looks like it might be the start of another section
        // but wasn't caught by the section end detection
        if (!currentExperience && trimmedLine.startsWith('**') && 
            (trimmedLine.includes('Accomplishments') || 
             trimmedLine.includes('Summary') || 
             trimmedLine.includes('Skills'))) {
            return lineIndex;
        }
        
        // Skip any other lines in the experience section
        lineIndex++;
    }
    
    return lineIndex;
}

// Process markdown bold text into HTML format
function processBoldText(text: string): string {
    return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

// Extract highlighted text for display
export const extractHighlights = (text: string): string[] => {
    const matches = text.match(/<b>(.*?)<\/b>/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/<\/?b>/g, ''));
};
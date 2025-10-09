interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status?: 'completed' | 'in-progress' | 'pending';
  category?: string;
}

interface TimelinePeriod {
  period: string;
  events: TimelineEvent[];
}

interface TimelineData {
  title: string;
  description?: string;
  periods: TimelinePeriod[];
}

export const parseTimelineMarkdown = (content: string): TimelineData | null => {
  try {
    // Remove the timeline tags
    const cleanContent = content
      .replace(/<timeline>/g, '')
      .replace(/<\/timeline>/g, '')
      .trim();

    const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let title = '';
    let description = '';
    const periods: TimelinePeriod[] = [];
    let currentPeriod: TimelinePeriod | null = null;
    let i = 0;

    // Parse the content
    while (i < lines.length) {
      const line = lines[i];
      
      // Extract title (first header)
      if (line.startsWith('###') && !title) {
        title = line.replace(/^#+\s*/, '').trim();
        i++;
        continue;
      }
      
      // Extract description (paragraph after title)
      if (title && !description && !line.startsWith('#') && !line.startsWith('**')) {
        description = line;
        i++;
        continue;
      }
      
      // Period headers (bold text like **Q1 2024:**)
      if (line.match(/^\*\*([^*]+):\*\*$/)) {
        // Save previous period
        if (currentPeriod && currentPeriod.events.length > 0) {
          periods.push(currentPeriod);
        }
        
        const periodName = line.replace(/^\*\*([^*]+):\*\*$/, '$1').trim();
        currentPeriod = {
          period: periodName,
          events: []
        };
        i++;
        continue;
      }
      
      // Event items (bullet points with descriptions)
      if (line.startsWith('-') && currentPeriod) {
        const eventText = line.replace(/^-\s*/, '').trim();
        
        // Parse event format: "Title (Date) [Category] [Status]"
        // or simple: "Title (Date)"
        let eventTitle = eventText;
        let eventDate = '';
        let eventCategory = '';
        let eventStatus: TimelineEvent['status'] = undefined;
        let eventDescription = '';
        
        // Extract date in parentheses
        const dateMatch = eventText.match(/^(.+?)\s*\(([^)]+)\)(.*)$/);
        if (dateMatch) {
          eventTitle = dateMatch[1].trim();
          eventDate = dateMatch[2].trim();
          const remainder = dateMatch[3].trim();
          
          // Extract category in brackets [Category]
          const categoryMatch = remainder.match(/^\s*\[([^\]]+)\](.*)$/);
          if (categoryMatch) {
            eventCategory = categoryMatch[1].trim();
            const afterCategory = categoryMatch[2].trim();
            
            // Extract status
            if (afterCategory.toLowerCase().includes('completed')) {
              eventStatus = 'completed';
            } else if (afterCategory.toLowerCase().includes('in-progress') || afterCategory.toLowerCase().includes('in progress')) {
              eventStatus = 'in-progress';
            } else if (afterCategory.toLowerCase().includes('pending')) {
              eventStatus = 'pending';
            }
          }
        }
        
        // Look for description on next line(s)
        let j = i + 1;
        const descriptionLines: string[] = [];
        while (j < lines.length && !lines[j].startsWith('-') && !lines[j].startsWith('**') && !lines[j].startsWith('#')) {
          if (lines[j].trim()) {
            descriptionLines.push(lines[j].trim());
          }
          j++;
        }
        
        eventDescription = descriptionLines.join(' ') || eventTitle;
        
        const eventId = `${currentPeriod.period}-${currentPeriod.events.length}`;
        
        currentPeriod.events.push({
          id: eventId,
          title: eventTitle,
          date: eventDate || 'TBD',
          description: eventDescription,
          status: eventStatus,
          category: eventCategory || undefined
        });
        
        i = j;
        continue;
      }
      
      i++;
    }
    
    // Add the last period
    if (currentPeriod && currentPeriod.events.length > 0) {
      periods.push(currentPeriod);
    }

    return {
      title: title || 'Timeline',
      description: description || undefined,
      periods
    };
    
  } catch (error) {
    console.error('Error parsing timeline markdown:', error);
    return null;
  }
};

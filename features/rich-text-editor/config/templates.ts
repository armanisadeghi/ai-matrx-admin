export const deepThinkingTemplate = `You are a highly intelligent being capable of extremely high-level reasoning and extreme attention to detail. You excel at reviewing a user's request to determine EXACTLY what they are saying, what they actually mean, and what their goal is.

You always consider the following:
1. What does the user really want?
2. What information do I need to know in order to complete this task?
3. Am I missing any information that would hinder my ability to answer the request completely and successfully?
4. What are the logical steps I need to take to handle this task?
5. Are there any potential pitfalls I should be aware of or likely mistakes I might make that I need to be careful to avoid?

Finally, once you have all of that information, you either directly handle the user's request or you ask the user a list of specific questions that will ensure you are able to complete the task without taking guesses. You never ask questions that are not necessary for completing the task, but you always ask questions, if you are missing critical information.

When going through your 'thinking' process, you will use these exact XML tags:
<thinking>All thoughts here...</thinking>

Your thinking will always include a minimum of the 5 sections mentioned above. However, for more complex tasks, you can create additional sections that will help you prepare for your final response.

When the user makes a request, always begin with your thinking and then handle the task.

Example:
<thinking>

I'm carefully reviewing the user's request.

### Request Analysis:
1. They want recommendations for places to visit in New York
2. They are planning a family trip and mentioned children
3. They are looking for family-friendly destinations
4. They want to know what places are considered "best" for their situation

### Missing Information:
1. I don't know the ages of the children, which will be very important for making ideal suggestions.
2. I don't know how many children are involved, but that may not be important since it likely will not influence suggestions.
3. I don't know when they plan to visit (season/time of year) -- I know this is critical for suggestions of outdoor vs. indoor activities.
4. I don't know how long they plan to stay (May or may not matter for basic suggestions, but if they wanted a detailed plan, it would be critical)
5. I don't know if they mean New York City or New York State
6. I don't know their budget constraints -- definitely important
7. I don't know their transportation situation (car, relying on public transit, etc.) -- But I'm not seeing how that would change suggestions for what to do while they are there.
8. I don't know their interests (museums, parks, shows, etc.) -- This would be good to know.
9. I don't know if they've been to New York before, but if they had visited with children before, they likely wouldn't be asking the question.

### Reasonable Assumptions to Make:
1. Given they didn't specify "state," I can assume they mean New York City
2. Since they're asking about "best places," I can assume they're looking for popular tourist attractions and likely slightly more 'upscale' as opposed to budget-conscious
3. I'll assume they want safe, family-friendly locations
4. Because of the kids, I'll assume they want more daytime recommendations
5. I can assume the children are young. But that would be silly because a 60-year-old might refer to her 35-year-old 'children' so that would be a terrible assumption. (I'm glad I caught myself there)

### Logical Steps & Specific Plan For My Response
1. [list all steps for your plan]

### Potential Pitfalls and Mistakes to Avoid:
1. [list all potential pitfalls and things to avoid]

</thinking>

The user will not see any of your thinking. The user will only see the portion of your response that comes after your closing </thinking> tag`;

export const simpleThinkingTemplate = `Prior to answering the user's request use a a <thinking> section to go through understanding the user's request and planning what you are going to say in response. Use this area for all of your internal thoughts and planning. Then, once you close your </thinking> xml tag, output only the exact result the user wants without any opening or closing information.`;

export const flashcardsTemplate = `# Structure for Flashcards
<flashcards>

---

Front: [Term, question, or concept]
Back: [Definition, answer, or explanation]

---

Front: [Term, question, or concept]
Back: [Definition, answer, or explanation]

---

Front: [Term, question, or concept]
Back: [Definition, answer, or explanation]

---

</flashcards>
`;

export const multipleChoiceQuizTemplate = `Return ONLY valid JSON in this exact format:

\`\`\`json
{
  "multiple_choice": [
    {
      "id": 1,
      "question": "question text here",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "explanation": "brief explanation"
    },
    {
      "id": 2,
      "question": "question text here",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 2,
      "explanation": "brief explanation"
    }
  ]
}
\`\`\`

Rules:
- correctAnswer is the index (0-3) of the correct option
- Include 4 options per question
- Make explanations concise (1-2 sentences)
- Return ONLY the JSON, no other text

Randomize the position of the correct answer so it's always in a different position.`;


export const simpleTimelineTemplate = `<timeline>
### Project Timeline

Brief description of the timeline or project overview.

**Phase 1:**
- Research & Planning (Jan-Feb) [Planning]
- Market Analysis (Feb-Mar) [Research]

**Phase 2:**
- Development Start (Mar) [Development] 
- Core Features (Apr-May) [Development]
- Testing Phase (Jun) [Testing]

**Phase 3:**
- Beta Release (Jul) [Release]
- User Feedback (Aug) [Feedback]
- Final Launch (Sep) [Launch]

</timeline>`;

export const complexTimelineTemplate = `<timeline>
### {Concise Timeline Title}

{Concise overview that define scope, audience, and outcome.}

**Phase {Number or Name}{: Optional Subtitle}**
- {Item Title} ({Time Spec}) [{Tag[, Tag2[, Tag3]]}]{ Optional:  — Milestone| — Deliverable| — Decision| — Checkpoint}
  - {Optional one sub-bullet: concrete action or success criterion.}

**Phase {Number or Name}{: Optional Subtitle}**
- {Item Title} ({Time Spec}) [{Tag[, Tag2[, Tag3]]}]{ Optional:  — Milestone| — Deliverable| — Decision| — Checkpoint}
  - {Optional one sub-bullet: concrete action or success criterion.}

**Phase {Number or Name}{: Optional Subtitle}**
- {Item Title} ({Time Spec}) [{Tag[, Tag2[, Tag3]]}]{ Optional:  — Milestone| — Deliverable| — Decision| — Checkpoint}
  - {Optional one sub-bullet: concrete action or success criterion.}

</timeline>`;

export const timelineTemplate = `To generate a timeline, you can use a simple or more complex template:

Simple Template:
${simpleTimelineTemplate}

Complex Template:
${complexTimelineTemplate}

Choose the template that best fits the user's request.`;


export const progressTrackerTemplate = `<progress_tracker>
### Learning Progress

**React Fundamentals** (80% complete)
- [x] Components & JSX
- [x] Props & State  
- [x] Event Handling
- [ ] Lifecycle Methods
- [ ] Hooks

**Advanced Topics** (20% complete)
- [x] Context API
- [ ] Performance Optimization
- [ ] Testing
- [ ] Custom Hooks

</progress_tracker>`;

export const troubleshootingTemplate = `<troubleshooting>
### API Connection Issues

**Symptom:** Timeout errors when calling API

**Possible Causes:**
1. Network connectivity issues
2. Server overload  
3. Authentication problems
4. Rate limiting

**Solutions:**
1. **Check Network**: Test with curl or Postman
   - Verify internet connection
   - Check DNS resolution
2. **Verify Credentials**: Ensure API key is valid
   - Check expiration date
   - Verify permissions
3. **Implement Retry Logic**: Add exponential backoff
   - Start with 1s delay
   - Double delay each retry
   - Max 5 retries

**Related Issues:**
- Slow response times
- Authentication failures

</troubleshooting>`;

export const resourcesTemplate = `<resources>
### Learning Resources

**Documentation**
- [Official Docs](https://example.com) - Comprehensive documentation [documentation] {beginner} *5*
- [API Reference](https://api.example.com) - Complete API guide [documentation] {intermediate} *4*

**Tools**
- [Development Tool](https://tool.example.com) - Essential development tool [tool] {intermediate}
- [Testing Framework](https://test.example.com) - Testing utilities [tool] {beginner} *4*

**Videos**
- [Tutorial Series](https://youtube.com) - 5-part series covering fundamentals (2 hours) [video] {beginner} *5*
- [Advanced Concepts](https://youtube.com) - Deep dive into advanced topics (3 hours) [video] {advanced} *4*

**Articles**
- [Best Practices](https://blog.example.com) - Industry best practices and patterns [article] {intermediate} *4*
- [Common Patterns](https://patterns.example.com) - Design patterns guide [article] {advanced} *3*

</resources>`;

export const comparisonTableTemplate = `Return ONLY valid JSON in this exact format:

\`\`\`json
{
  "comparison": {
    "title": "Cloud Providers Comparison",
    "items": ["AWS", "Azure", "GCP"],
    "criteria": [
      {"name": "Price", "values": ["$$", "$$$", "$$"], "type": "cost"},
      {"name": "Performance", "values": [9, 8, 9], "type": "rating"},
      {"name": "Features", "values": ["Excellent", "Good", "Very Good"], "type": "text"}
    ]
  }
}
\`\`\`

Rules:
- items: array of things being compared
- criteria: array of comparison criteria
- values: array matching items order
- type: "cost", "rating", "text", or "boolean"
- Return ONLY the JSON, no other text`;

export const decisionTreeTemplate = `Return ONLY valid JSON in this exact format:

\`\`\`json
{
  "decision_tree": {
    "title": "Bug Diagnosis Guide",
    "root": {
      "question": "Is the error reproducible?",
      "yes": {
        "question": "Does it happen in production?",
        "yes": {"action": "Create hotfix immediately"},
        "no": {"action": "Log as development issue"}
      },
      "no": {"action": "Monitor and collect more data"}
    }
  }
}
\`\`\`

Rules:
- Each node has either "question" + "yes"/"no" branches OR "action" (leaf)
- Keep questions clear and binary (yes/no)
- Actions should be specific and actionable
- Return ONLY the JSON, no other text`;

export const diagramTemplate = `Return ONLY valid JSON in this exact format:

\`\`\`json
{
  "diagram": {
    "type": "flowchart",
    "title": "User Authentication Flow",
    "nodes": [
      {"id": "start", "label": "User Request", "type": "start"},
      {"id": "auth", "label": "Authentication", "type": "process"},
      {"id": "db", "label": "Database Query", "type": "process"},
      {"id": "end", "label": "Response", "type": "end"}
    ],
    "edges": [
      {"from": "start", "to": "auth"},
      {"from": "auth", "to": "db"},
      {"from": "db", "to": "end"}
    ]
  }
}
\`\`\`

Rules:
- type: "flowchart", "mindmap", or "orgchart"
- nodes: id, label, type ("start", "end", "process", "decision")
- edges: from/to node ids
- Return ONLY the JSON, no other text`;

export const deepResearchReportTemplate = `<research>
# Research Analysis: [TOPIC] ([TIME_FRAME])

## Overview

This comprehensive research analysis focuses on [TOPIC], with a forward-looking perspective towards [TIME_FRAME] and beyond. The information is drawn from peer-reviewed research publications, academic institutions, industry reports, and expert analyses, emphasizing key insights and future implications.

**Research Scope:** [SCOPE_DESCRIPTION]
**Key Focus Areas:** [FOCUS_AREAS]
**Analysis Period:** [TIME_PERIOD]

---

## Executive Summary

[EXECUTIVE_SUMMARY - Brief overview of key findings, major trends, and critical implications]

---

## I. Introduction: The Current Landscape of [TOPIC]

[INTRODUCTION_PARAGRAPH]
<!-- Briefly introduce the topic, its significance, current state, and anticipated impact. Include forward-looking statements and context for the analysis. -->

### Key Research Questions
1. [RESEARCH_QUESTION_1]
2. [RESEARCH_QUESTION_2] 
3. [RESEARCH_QUESTION_3]

---

## II. Key Research and Discoveries

### **[SUBSECTION_TITLE_1]**
*e.g., "Breakthrough Technologies and Methodologies"*

#### Research Finding 1: **[RESEARCH_ITEM_TITLE]**
- **Primary Source:** [SOURCE_NAME_1]
- **Additional Sources:** [SOURCE_NAME_2]; [SOURCE_NAME_3]
- **URLs:** 
  - [URL_1]
  - [URL_2]
- **Key Details:** [RESEARCH_DETAILS]
  <!-- Summarize the main findings, results, or contributions of the research. -->
- **Significance:** [SIGNIFICANCE_DESCRIPTION]
- **Future Implications:** [FUTURE_IMPLICATIONS]
  <!-- Describe anticipated developments, predictions, or next steps related to this research. -->
- **Confidence Level:** [HIGH/MEDIUM/LOW]

#### Research Finding 2: **[RESEARCH_ITEM_TITLE]**
- **Primary Source:** [SOURCE_NAME_1]
- **Additional Sources:** [SOURCE_NAME_2]; [SOURCE_NAME_3]
- **URLs:** 
  - [URL_1]
  - [URL_2]
- **Key Details:** [RESEARCH_DETAILS]
- **Significance:** [SIGNIFICANCE_DESCRIPTION]
- **Future Implications:** [FUTURE_IMPLICATIONS]
- **Confidence Level:** [HIGH/MEDIUM/LOW]

### **[SUBSECTION_TITLE_2]**
*e.g., "Market Trends and Industry Applications"*

[Continue with additional research findings...]

---

## III. Critical Analysis and Synthesis

### **Convergent Themes**
1. **[THEME_1]:** [DESCRIPTION]
2. **[THEME_2]:** [DESCRIPTION]
3. **[THEME_3]:** [DESCRIPTION]

### **Conflicting Evidence**
- **Area of Disagreement:** [DESCRIPTION]
- **Competing Perspectives:** [PERSPECTIVE_1] vs [PERSPECTIVE_2]
- **Resolution Potential:** [ANALYSIS]

---

## IV. Future Trends and Predictions

### **Short-term Outlook (1-2 years)**
- [PREDICTION_1]
- [PREDICTION_2]
- [PREDICTION_3]

### **Medium-term Outlook (3-5 years)**
- [PREDICTION_1]
- [PREDICTION_2]
- [PREDICTION_3]

### **Long-term Vision (5+ years)**
- [PREDICTION_1]
- [PREDICTION_2]
- [PREDICTION_3]

---

## V. Challenges and Limitations

### **Technical Challenges**
1. **[CHALLENGE_1]**
   - **Description:** [DETAILS]
   - **Current Solutions:** [SOLUTIONS]
   - **Research Gaps:** [GAPS]

### **Ethical Considerations**
1. **[ETHICAL_ISSUE_1]**
   - **Concern:** [DESCRIPTION]
   - **Stakeholder Impact:** [IMPACT]
   - **Mitigation Strategies:** [STRATEGIES]

### **Regulatory and Policy Issues**
- [ISSUE_1]: [DESCRIPTION]
- [ISSUE_2]: [DESCRIPTION]

---

## VI. Recommendations and Action Items

### **For Researchers**
1. [RECOMMENDATION_1]
2. [RECOMMENDATION_2]
3. [RECOMMENDATION_3]

### **For Industry**
1. [RECOMMENDATION_1]
2. [RECOMMENDATION_2]
3. [RECOMMENDATION_3]

### **For Policymakers**
1. [RECOMMENDATION_1]
2. [RECOMMENDATION_2]
3. [RECOMMENDATION_3]

---

## VII. Conclusion

[CONCLUSION_PARAGRAPH]
<!-- Summarize the key findings, highlight major trends, and outline future directions. Address ongoing challenges and the importance of interdisciplinary collaboration, ethical considerations, and continuous development. -->

### **Key Takeaways**
1. [TAKEAWAY_1]
2. [TAKEAWAY_2]
3. [TAKEAWAY_3]

---

## VIII. Methodology and Sources

### **Research Methodology**
- **Search Strategy:** [DESCRIPTION]
- **Source Selection Criteria:** [CRITERIA]
- **Analysis Framework:** [FRAMEWORK]

### **Source Quality Assessment**
- **Peer-reviewed Papers:** [COUNT] sources
- **Industry Reports:** [COUNT] sources  
- **Expert Interviews:** [COUNT] sources
- **Government Publications:** [COUNT] sources

### **Limitations**
- [LIMITATION_1]
- [LIMITATION_2]
- [LIMITATION_3]

---

*Research conducted on [DATE] | Last updated: [UPDATE_DATE]*
*Confidence Rating: [OVERALL_CONFIDENCE] | Bias Assessment: [BIAS_LEVEL]*

</research>`;

export const decisionTreeExample  = `{
  "decision_tree": {
    "title": "Bug Diagnosis Guide",
    "description": "Step-by-step workflow for diagnosing and handling software bugs",
    "root": {
      "question": "Is the error reproducible?",
      "description": "Can you consistently reproduce the error with the same steps?",
      "priority": "high",
      "yes": {
        "question": "Does it happen in production?",
        "description": "Is this error occurring in the live production environment?",
        "priority": "high",
        "yes": {
          "action": "Create hotfix immediately",
          "description": "This is a critical production issue that needs immediate attention",
          "priority": "high",
          "category": "urgent",
          "estimatedTime": "2-4 hours"
        },
        "no": {
          "question": "Is it affecting multiple users?",
          "description": "Are multiple users experiencing this issue in development/staging?",
          "priority": "medium",
          "yes": {
            "action": "Prioritize for next release",
            "description": "Schedule fix for the next planned release cycle",
            "priority": "medium",
            "category": "development",
            "estimatedTime": "1-2 days"
          },
          "no": {
            "action": "Log as development issue",
            "description": "Create a detailed bug report and assign to development team",
            "priority": "medium",
            "category": "development",
            "estimatedTime": "30 minutes"
          }
        }
      },
      "no": {
        "question": "Are there any error logs or patterns?",
        "description": "Check if there are any logged errors or patterns that might help",
        "priority": "medium",
        "yes": {
          "question": "Do the logs indicate a specific component?",
          "description": "Can you identify which system component is causing the issue?",
          "priority": "medium",
          "yes": {
            "action": "Investigate specific component",
            "description": "Focus investigation on the identified component and related systems",
            "priority": "medium",
            "category": "investigation",
            "estimatedTime": "2-3 hours"
          },
          "no": {
            "action": "Analyze logs and monitor patterns",
            "description": "Review error logs and set up monitoring to capture more data",
            "priority": "medium",
            "category": "monitoring",
            "estimatedTime": "1-2 hours"
          }
        },
        "no": {
          "action": "Monitor and collect more data",
          "description": "Set up additional logging and monitoring to gather more information",
          "priority": "low",
          "category": "monitoring",
          "estimatedTime": "1 hour"
        }
      }
    }
  }
}`;

export const diagramTemplateExample = `{
  "diagram": {
    "title": "User Registration Process",
    "description": "Step-by-step flow for user registration and verification",
    "type": "flowchart",
    "nodes": [
      {
        "id": "start",
        "label": "User Visits Page",
        "nodeType": "start",
        "description": "User lands on registration page",
        "position": { "x": 250, "y": 50 }
      },
      {
        "id": "form",
        "label": "Fill Registration Form",
        "nodeType": "process",
        "description": "User enters personal information",
        "position": { "x": 250, "y": 170 }
      },
      {
        "id": "validate",
        "label": "Validate Input",
        "nodeType": "decision",
        "description": "Check if all required fields are filled",
        "position": { "x": 250, "y": 290 }
      },
      {
        "id": "error",
        "label": "Show Error",
        "nodeType": "process",
        "description": "Display validation errors",
        "position": { "x": 100, "y": 410 }
      },
      {
        "id": "save",
        "label": "Save User Data",
        "nodeType": "data",
        "description": "Store user information in database",
        "position": { "x": 400, "y": 410 }
      },
      {
        "id": "email",
        "label": "Send Verification Email",
        "nodeType": "system",
        "description": "Send confirmation email to user",
        "position": { "x": 400, "y": 530 }
      },
      {
        "id": "success",
        "label": "Registration Complete",
        "nodeType": "end",
        "description": "User successfully registered",
        "position": { "x": 400, "y": 650 }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "form",
        "label": "Navigate"
      },
      {
        "id": "e2",
        "source": "form",
        "target": "validate",
        "label": "Submit"
      },
      {
        "id": "e3",
        "source": "validate",
        "target": "error",
        "label": "Invalid",
        "color": "#ef4444"
      },
      {
        "id": "e4",
        "source": "error",
        "target": "form",
        "label": "Retry",
        "dashed": true
      },
      {
        "id": "e5",
        "source": "validate",
        "target": "save",
        "label": "Valid",
        "color": "#10b981"
      },
      {
        "id": "e6",
        "source": "save",
        "target": "email",
        "label": "Success"
      },
      {
        "id": "e7",
        "source": "email",
        "target": "success",
        "label": "Sent"
      }
    ],
    "layout": {
      "direction": "TB",
      "spacing": 120
    }
  }
}`;
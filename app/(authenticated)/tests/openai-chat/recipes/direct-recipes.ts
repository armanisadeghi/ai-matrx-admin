import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const gaston_5c_response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        {
            "role": "system",
            "content": [
                {
                    "text": "Generate a structured response reviewing a Q&A summary with a candidate for a recruitment firm. Focus on identifying specific details and organize the information according to the given template.\n\n- Do not include fluff.\n- Keep sentences very short\n- Focus on key facts, numbers, dollar amounts and things that are direct.\n\n# Template\n\nCandidate Profile: [Candidate Name]\n- Provide a brief introduction paragraph the candidate's experience, key focus areas, and what they are seeking in a new role.\n- 1 sentence focused on exactly why they are looking for another opportunity.\n- 1 sentence that includes their current title and years of relevant experience (if available)\n- No more than 2-3 short sentences.\n\nKey Experience:\n- **[Organization/Company Name]:**\n  - **Achievements and Responsibilities:** \n    - Specific achievements, metrics, and key responsibilities.\n    - Emphasize quantifiable data such as occupancy rates, census growth, revenue impact, etc.\n    - Include absolutely all specific data provided by the candidate (numbers, dollars, percentages)\n\nAdditional Relevant Experience:\n- **Achievements and Responsibilities:** \n  - [Highlight achievements and responsibilities, focusing on key numbers and KPIs.]\n\nLocation:\n- **Current Location and Preferences:**\n  - [Current location and any preferences or flexibility related to relocation.]\n\nCompensation Expectation:\n- **Salary Expectations and Benefits:**\n  - [Salary range or expectations, with any notes about negotiation or specific benefits sought.]\n\nAvailability for Interview:\n- **Interview Scheduling:**\n  - [Details on the candidate's availability for interviews, preferred times, or any notice period required.]\n\n# Output Format\n\nStructure the output according to the provided template, ensuring each section is thoroughly developed and clearly labeled. Use bold headings for each subsection to maintain clarity.\n\n# Examples \n\nExample (Structured Response):\n```\n**Candidate Profile: Dina**\n\nDina is an Executive Director with 8 years of experience in Senior Living. She transitioned from Hospitality to Long Term Care and is seeking a role that allows her to manage and improve community operations. Dina is looking for a new opportunity due to her need for a more flexible schedule to care for a family member. She has been working with a Placement Agency for the past 6 months.\n\n**Key Experience:**  \n**Sunrise Senior Living/Oakmont:**\n*   Managed an **80-unit AL community**.\n*   Increased occupancy from **68% to 92%**.\n*   Managed a budget with **$36M in revenue**.\n*   Exceeded NOI expectations by **65%**.\n*   Led a team of **8 department heads**.\n\n**Belmont Village:**\n*   Managed a luxury community of **140 units** (80 AL, 60 MC).\n*   Increased occupancy from **59% to 83%**.\n*   Managed a budget with **$42.5M in revenue**.\n*   Filled **23 vacant roles** within 6 months.\n*   Reduced agency use from **90% to 13%**.\n*   Led a team of **8 department heads**.\n\n**Brookdale Senior Living:**\n*   Managed a **177-unit community**.\n*   Total revenue of **$45M**.\n*   Increased overall revenue by **3.2%**.\n*   Reduced Over Time by **4.9%**.\n*   Maintained an average census of **96%**.\n*   Increased resident satisfaction survey from **85% to 91%**.\n\n**Location:**\n*   Current location not specified. No specific relocation preferences mentioned.\n\n**Compensation Expectation:**\n*   Salary requirements are **$145k - $150k**.\n\n**Availability for Interview:**\n*   Availability for interviews not specified.\n```\nAdditional Guidance:\n- Abbreviate industry terms commonly known and used by those in the Senior Living: AL (Assisted Living), MC (Memory Care), and IL (Independent Living)\n- Bold all key numbers, facts, percentages and dollars.\n- Include factual salary requirements only. Never include general concepts, such as wanting salaries that reflect living expenses.\n- Key facts, numbers, percentages and dollars from past experiences are the single most important thing because they help to promote the candidate. Always include as much of it as you have available.\n\nDo not include any information regarding the opportunity itself. This is a candidate review done for a specific candidate as part of a large number of candidates for the same exact position so that information does not need to be included. The structure and details of the job opportunity should not be included.\n\nFocus on the qualifications of the candidate to generate a Candidate Submission. Our goal is to land this candidate a job with this opportunity and we need a structured document that will convince the client (hiring manager) to accept this candidate for the position.",
                    "type": "text"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze the following Candidate Summary in detail and provide the highly structured content based on this specific information:\n\n```\n{CANDIDATE_PROFILE_1001}\n```\n\nAbbreviate industry terms commonly known and used by those in the Senior Living: AL (Assisted Living), MC (Memory Care), and IL (Independent Living)\n\nDo not miss any facts, figures or numbers that can be used to convince the client that this is a great candidate. At the same time, clients do not like to see subjective information in this type of document so do not include anything subjective."
                }
            ]
        }
    ],
    response_format: {
        "type": "text"
    },
    temperature: 1,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
});

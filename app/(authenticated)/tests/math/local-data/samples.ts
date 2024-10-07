
export const mathCourse = {
    id: "396c8824-e3da-47eb-981f-9eaf8d7f104b",
    name: "Math",
    topics: [
        {
            id: "1c8deb46-d698-44b5-a3e4-9e0ade2a3310",
            name: "Algebra",
            modules: [
                {
                    id: "4978f9c4-3f34-4b35-bf86-74fd06f4b56e",
                    name: "Solving Simple Equations",
                    description: "A module focused on solving simple algebraic equations using different methods and approaches.",
                    lessons: [
                        {
                            id: "a890edc9-ae10-4413-b612-380d48a069f4",
                            title: "Example 1A: Highly Detailed Solution",
                            description: "Solving for P in a simple algebraic equation with all intermediary steps shown.",
                            contents: [
                                {
                                    type: 'interactiveMathSession',
                                    content: {
                                        id: "bb64dc88-3250-4824-b13b-6337740d6f34",
                                        title: "Example 1A: Highly Detailed",
                                        description: "Solving for P in a simple algebraic equation with all intermediary steps shown.",
                                        introduction: "Let's solve this equation, while showing all highly detailed intermediary steps. Then, we will review the same solution, without the details.",
                                        transitionPhrases: [
                                            "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem...",
                                        ],
                                        conclusion: "Remember, solving equations takes practice. The rules in math always stay the same, but each problem can be a little different, so you might need to change how you solve it. By practicing a lot, you’ll start to see patterns that make solving these problems faster and easier. The more you practice, the more confident you’ll become!",
                                        problemDetails: {
                                            text: "Given the equation:",
                                            equation: "S = \\frac{1}{2}PL + B",
                                            instruction: "Solve for P."
                                        },
                                        solutions: [
                                            {
                                                taskDescription: "We want to isolate P on one side of the equation so that we know its value in terms of S, L, and B.",
                                                steps: [
                                                    {
                                                        title: "Step 1: Write down the original equation.",
                                                        equation: "S = \\frac{1}{2}PL + B",
                                                        explanation: "Our goal is to solve for P. We will follow each algebraic step systematically to isolate P."
                                                    },
                                                    {
                                                        title: "Step 2: Subtract B from both sides of the equation.",
                                                        equation: "S - B = \\frac{1}{2}PL + B - B",
                                                        explanation: "We need to get rid of B on the right side so we can work towards isolating P. To do this, we subtract B from both sides.",
                                                        simplifiedEquation: "S - B = \\frac{1}{2}PL"
                                                    },
                                                    {
                                                        title: "Step 3: Multiply both sides by 2 to eliminate the fraction.",
                                                        equation: "2 \\cdot (S - B) = 2 \\cdot \\frac{1}{2}PL",
                                                        explanation: "Since \\frac{1}{2} is multiplying PL, we need to multiply both sides by 2 to remove it.",
                                                        simplifiedEquation: "2(S - B) = PL"
                                                    },
                                                    {
                                                        title: "Step 4: Divide both sides by L to isolate P.",
                                                        equation: "\\frac{2(S - B)}{L} = \\frac{PL}{L}",
                                                        explanation: "Now that we have P multiplied by L, we divide both sides by L to isolate P.",
                                                        simplifiedEquation: "\\frac{2(S - B)}{L} = P"
                                                    },
                                                    {
                                                        title: "Step 5: Flip the equation for clarity.",
                                                        equation: "P = \\frac{2(S - B)}{L}",
                                                        explanation: "It is common practice to write the variable we are solving for on the left side. So, we flip the equation."
                                                    }
                                                ],
                                                finalAnswer: "P = \\frac{2(S - B)}{L}"
                                            },
                                            {
                                                taskDescription: "We want to isolate P on one side of the equation in terms of S, L, and B. This time, we will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                                                steps: [
                                                    {
                                                        title: "Step 1: Write down the original equation.",
                                                        equation: "S = \\frac{1}{2}PL + B",
                                                        explanation: "Our goal is to solve for P."
                                                    },
                                                    {
                                                        title: "Step 2: Subtract B from both sides.",
                                                        equation: "S - B = \\frac{1}{2}PL"
                                                    },
                                                    {
                                                        title: "Step 3: Multiply both sides by 2 to remove the fraction.",
                                                        equation: "2(S - B) = PL"
                                                    },
                                                    {
                                                        title: "Step 4: Divide both sides by L to solve for P.",
                                                        equation: "P = \\frac{2(S - B)}{L}"
                                                    }
                                                ],
                                                finalAnswer: "P = \\frac{2(S - B)}{L}"
                                            }
                                        ],
                                        hint: "Remember to perform the same operation on both sides of the equation.",
                                        resources: [
                                            "https://youtu.be/wShnYemIr28?si=RI0PWkkP0RaTEyxe",
                                            "https://youtu.be/eZsyV0ISzV8?si=qW_r2ohmY0CRgvrn&t=4"
                                        ],
                                        difficultyLevel: "medium",
                                        relatedContent: ["lesson-2"]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

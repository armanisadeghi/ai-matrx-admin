import {ProblemsData, ProblemStatement, Solution} from "@/app/(authenticated)/tests/math/types/algebraGuideTypes";


export const problemsData: ProblemsData = [
    {
        id: "bb64dc88-3250-4824-b13b-6337740d6f34",
        title: "Solve equation with multiple variables on both sides",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Foundations of Algebra",
        description: "Solving for P in a simple algebraic equation with all intermediary steps shown.",
        introText: "Let's solve this equation, while showing all highly detailed intermediary steps. Then, we will review the same solution, without the details.",
        transitionTexts: [
            "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem...",
        ],
        finalStatement: "Remember, solving equations takes practice. The rules in math always stay the same, but each problem can be a little different, so you might need to change how you solve it. By practicing a lot, you’ll start to see patterns that make solving these problems faster and easier. The more you practice, the more confident you’ll become!",
        problemStatement: {
            text: "Given the equation:",
            equation: "S = \\frac{1}{2}PL + B",
            instruction: "Solve for P."
        },
        solutions: [
            {
                task: "We want to isolate P on one side of the equation so that we know its value in terms of S, L, and B.",
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
                        simplified: "S - B = \\frac{1}{2}PL"
                    },
                    {
                        title: "Step 3: Multiply both sides by 2 to eliminate the fraction.",
                        equation: "2 \\cdot (S - B) = 2 \\cdot \\frac{1}{2}PL",
                        explanation: "Since \\frac{1}{2} is multiplying PL, we need to multiply both sides by 2 to remove it.",
                        simplified: "2(S - B) = PL"
                    },
                    {
                        title: "Step 4: Divide both sides by L to isolate P.",
                        equation: "\\frac{2(S - B)}{L} = \\frac{PL}{L}",
                        explanation: "Now that we have P multiplied by L, we divide both sides by L to isolate P.",
                        simplified: "\\frac{2(S - B)}{L} = P"
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
                task: "We want to isolate P on one side of the equation in terms of S, L, and B. This time, we will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
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
            },
        ]
    },
    {
        id: "",
        title: "",
        courseName: "",
        topicName: "",
        moduleName: "",
        description: "",
        introText: "",
        transitionTexts: [],
        finalStatement: "",
        problemStatement: {
            text: "",
            equation: "",
            instruction: ""
        },
        solutions: [
            {
                task: "",
                steps: [
                    {
                        title: "",
                        equation: "",
                        explanation: ""
                    }
                ],
                finalAnswer: ""
            },
        ]
    }
];

const mathCourseOverview = {
    "courseName": "Mathematics",
    "topicName": "Algebra",
    "modules": [
        {
            "moduleName": "Foundations of Algebra",
            "moduleDescription": "Introduction to the fundamentals of algebra, focusing on understanding variables, simple equations, and basic operations with integers and rational numbers.",
            "lessons": [
                {
                    "lessonName": "Understanding Variables",
                    "lessonObjectives": "Introduce students to the concept of variables as placeholders for numbers.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Algebraic Expressions",
                    "lessonObjectives": "Teach students how to create and interpret algebraic expressions.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Translating Words into Algebra",
                    "lessonObjectives": "Enable students to convert verbal statements into algebraic equations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Operations with Integers",
                    "lessonObjectives": "Review addition, subtraction, multiplication, and division of integers.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Introduction to Rational Numbers",
                    "lessonObjectives": "Introduce rational numbers and explain their properties.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Adding, Subtracting, Multiplying, and Dividing Fractions and Decimals",
                    "lessonObjectives": "Practice arithmetic operations with fractions and decimals.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Combining Like Terms",
                    "lessonObjectives": "Teach students to simplify algebraic expressions by combining like terms.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "The Distributive Property",
                    "lessonObjectives": "Introduce and apply the distributive property in simplifying expressions.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Simplifying Expressions Involving Fractions",
                    "lessonObjectives": "Apply fraction operations in algebraic expressions.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving One-Step Equations (Addition/Subtraction)",
                    "lessonObjectives": "Teach students how to solve one-step equations involving addition or subtraction.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving One-Step Equations (Multiplication/Division)",
                    "lessonObjectives": "Teach students how to solve one-step equations involving multiplication or division.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Equations with Decimals and Fractions",
                    "lessonObjectives": "Solve equations that include decimals and fractions.",
                    "lessonContent": {}
                }
            ]
        },
        {
            "moduleName": "Building on Algebraic Foundations",
            "moduleDescription": "Introduces complex concepts such as inequalities, coordinate systems, and basic geometry integration with algebra.",
            "lessons": [
                {
                    "lessonName": "Solving One-Step Inequalities",
                    "lessonObjectives": "Teach students how to solve and graph inequalities.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Graphing Inequalities on a Number Line",
                    "lessonObjectives": "Demonstrate how to graph inequalities on a number line.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving and Graphing Two-Step Inequalities",
                    "lessonObjectives": "Solve and graph two-step inequalities.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Introduction to the Coordinate Plane",
                    "lessonObjectives": "Introduce the coordinate plane and basic graphing techniques.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Plotting Points and Graphing Linear Equations",
                    "lessonObjectives": "Practice plotting points and graphing simple linear equations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Finding Patterns in Tables and Graphs",
                    "lessonObjectives": "Identify and analyze patterns in tables and graphs.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Understanding Ratios and Proportions",
                    "lessonObjectives": "Introduce ratios and proportions and their applications.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Proportions",
                    "lessonObjectives": "Solve proportion equations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Converting Between Fractions, Decimals, and Percentages",
                    "lessonObjectives": "Teach conversions between fractions, decimals, and percentages.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Perimeter and Area of Algebraic Shapes",
                    "lessonObjectives": "Use algebra to find the perimeter and area of shapes.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Using Algebra to Solve Geometry Problems",
                    "lessonObjectives": "Apply algebraic skills to solve geometric problems.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Introduction to Surface Area and Volume",
                    "lessonObjectives": "Introduce concepts of surface area and volume using algebra.",
                    "lessonContent": {}
                }
            ]
        },
        {
            "moduleName": "Intermediate Algebra Concepts",
            "moduleDescription": "Explore deeper algebraic concepts such as multi-step equations, functions, and systems of equations.",
            "lessons": [
                {
                    "lessonName": "Solving Two-Step Equations",
                    "lessonObjectives": "Teach students to solve two-step equations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Equations with Variables on Both Sides",
                    "lessonObjectives": "Solve equations with variables on both sides.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Equations with Distributive Property",
                    "lessonObjectives": "Apply the distributive property in equations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Understanding Functions and Relations",
                    "lessonObjectives": "Introduce functions and relations.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Function Notation",
                    "lessonObjectives": "Teach students how to read and use function notation.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Evaluating and Graphing Linear Functions",
                    "lessonObjectives": "Evaluate and graph linear functions.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Systems by Graphing",
                    "lessonObjectives": "Solve systems of equations by graphing.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Systems by Substitution",
                    "lessonObjectives": "Solve systems using the substitution method.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Systems by Elimination",
                    "lessonObjectives": "Solve systems using the elimination method.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Laws of Exponents",
                    "lessonObjectives": "Introduce the laws of exponents.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Simplifying Expressions with Exponents",
                    "lessonObjectives": "Simplify algebraic expressions using exponent rules.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Introduction to Polynomials",
                    "lessonObjectives": "Introduce basic polynomial operations.",
                    "lessonContent": {}
                }
            ]
        },
        {
            "moduleName": "Advanced Algebra Concepts",
            "moduleDescription": "Focus on advanced algebra concepts, including quadratics, inequalities in two variables, and radicals.",
            "lessons": [
                {
                    "lessonName": "Understanding Quadratic Equations",
                    "lessonObjectives": "Introduce quadratic equations and their properties.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Quadratics by Factoring",
                    "lessonObjectives": "Solve quadratic equations using factoring.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Graphing Quadratic Functions",
                    "lessonObjectives": "Graph quadratic functions and understand their properties.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving and Graphing Linear Inequalities in Two Variables",
                    "lessonObjectives": "Solve and graph linear inequalities in two variables.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Systems of Inequalities",
                    "lessonObjectives": "Solve and graph systems of inequalities.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Applications of Inequalities",
                    "lessonObjectives": "Apply inequalities to real-world scenarios.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Simplifying Square Roots",
                    "lessonObjectives": "Simplify and evaluate square roots.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Operations with Radicals",
                    "lessonObjectives": "Perform operations with radical expressions.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Solving Equations with Square Roots",
                    "lessonObjectives": "Solve equations involving square roots.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Cumulative Review of Algebra Concepts",
                    "lessonObjectives": "Review all learned algebra concepts cumulatively.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Algebra in Real-Life Scenarios",
                    "lessonObjectives": "Apply algebraic knowledge to solve real-world problems.",
                    "lessonContent": {}
                },
                {
                    "lessonName": "Advanced Practice Problems",
                    "lessonObjectives": "Prepare students for further advanced algebra with challenging problems.",
                    "lessonContent": {}
                }
            ]
        }
    ]
}






const problemsDataTemplate: ProblemsData = [
    {
        id: "unique-uuid-1",
        title: "Solving an Equation for a Variable",
        courseName: "math",
        topicName: "Math Topic (e.g., Algebra, Geometry)",
        moduleName: "Module Name",
        description: "A brief description of what the problem aims to teach.",
        introText: "Introduction text explaining the purpose of the example and the details shown.",
        transitionTexts: [
            "Transition text moving to another solution or section, if applicable.",
        ],
        finalStatement: "Concluding statement about the problem and the learning objective.",
        problemStatement: {
            text: "Given the equation or problem statement:",
            equation: "Equation goes here",
            instruction: "Instruction on what needs to be solved."
        },
        solutions: [
            {
                task: "Task description explaining what needs to be achieved.",
                steps: [
                    {
                        title: "Step 1: Title of the step.",
                        equation: "Equation goes here",
                        explanation: "Explanation of the step and why it's done.",
                        simplified: "Simplified equation, if applicable."
                    }
                ],
                finalAnswer: "Final answer for the solution."
            },
            {
                task: "A different approach or simplified version of solving the problem.",
                steps: [
                    {
                        title: "Step 1: Title of the step.",
                        equation: "Equation goes here",
                        explanation: "Explanation of the step and why it's done."
                    }
                ],
                finalAnswer: "Final answer for this approach."
            },
        ]
    },
    {
        id: "",
        title: "",
        courseName: "",
        topicName: "",
        moduleName: "",
        description: "",
        introText: "",
        transitionTexts: [],
        finalStatement: "",
        problemStatement: {
            text: "",
            equation: "",
            instruction: ""
        },
        solutions: [
            {
                task: "",
                steps: [
                    {
                        title: "",
                        equation: "",
                        explanation: ""
                    }
                ],
                finalAnswer: ""
            },
        ]
    }
];

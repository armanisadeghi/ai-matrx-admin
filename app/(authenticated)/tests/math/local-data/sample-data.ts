import {ProblemsData, ProblemStatement, Solution} from "@/features/math/types/algebraGuideTypes";


export const problemsData: ProblemsData = [
    {
        id: "bb64dc88-3250-4824-b13b-6337740d6f34",
        title: "Solve equation with multiple variables on both sides",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Foundations of Algebra",
        description: "Solving for P in a simple algebraic equation with all intermediary steps shown.",
        introText: "Let's solve this equation, while showing all highly detailed intermediary steps. Then, we will review the same solution, without the details.",
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
                        explanation: "Since 1/2 is multiplying PL, we need to multiply both sides by 2 to remove it.",
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
                solutionAnswer: "P = \\frac{2(S - B)}{L}",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem...",
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
                solutionAnswer: "P = \\frac{2(S - B)}{L}",
                transitionText: null,
            },
        ],
        finalStatement: "Remember, solving equations takes practice. The rules in math always stay the same, but each problem can be a little different, so you might need to change how you solve it. By practicing a lot, you’ll start to see patterns that make solving these problems faster and easier. The more you practice, the more confident you’ll become!",
    },
    {
        id: "b9b2347c-cdc4-4606-8746-a8d34aa0961c",
        title: "Introduction to Two-Step Equations",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Define two-step equations and provide basic examples.",
        introText: "Let's learn how to solve two-step equations by breaking them down into simple, manageable steps. We'll start with a basic example and show each step in detail.",
        problemStatement: {
            text: "Consider the equation:",
            equation: "3x + 4 = 19",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by isolating it on one side of the equation using two steps: subtraction and division.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 4 = 19",
                        explanation: "Our goal is to solve for x. We will perform operations to isolate x on one side of the equation."
                    },
                    {
                        title: "Step 2: Subtract 4 from both sides of the equation.",
                        equation: "3x + 4 - 4 = 19 - 4",
                        explanation: "To begin isolating x, we need to eliminate the constant term on the left side by subtracting 4 from both sides."
                    },
                    {
                        title: "Step 3: Simplify both sides.",
                        equation: "3x = 15",
                        explanation: "After subtracting, we simplify the equation to show that 3x is equal to 15."
                    },
                    {
                        title: "Step 4: Divide both sides by 3 to solve for x.",
                        equation: "\\frac{3x}{3} = \\frac{15}{3}",
                        explanation: "To isolate x, we divide both sides of the equation by 3."
                    },
                    {
                        title: "Step 5: Simplify the division.",
                        equation: "x = 5",
                        explanation: "After dividing, we find that x equals 5."
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 4 = 19",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 4 from both sides.",
                        equation: "3x = 15"
                    },
                    {
                        title: "Step 3: Divide both sides by 3 to solve for x.",
                        equation: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: null
            }
        ],
        finalStatement: "Remember, solving two-step equations involves performing two operations to isolate the variable. Practice these steps to become more comfortable with solving similar problems. The more you practice, the easier it will become!"
    },
    {
        id: "602a969a-1594-469d-8a04-f1d4c40a0a37",
        title: "Simplifying Equations with Addition/Subtraction",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Focus on equations that only require one addition/subtraction step.",
        introText: "In this lesson, we will learn how to solve two-step equations that involve addition or subtraction. We will break down each step to understand the process clearly.",
        finalStatement: "Solving two-step equations is an essential skill in algebra. By practicing these steps, you'll become more comfortable with solving equations and be ready for more complex problems.",
        problemStatement: {
            text: "Given the equation:",
            equation: "3x + 5 = 20",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to isolate x on one side of the equation to find its value.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 5 = 20",
                        explanation: "Our goal is to solve for x. We will follow each algebraic step systematically to isolate x."
                    },
                    {
                        title: "Step 2: Subtract 5 from both sides of the equation.",
                        equation: "3x + 5 - 5 = 20 - 5",
                        explanation: "To isolate the term with x, we need to eliminate the constant on the left side by subtracting 5 from both sides.",
                        simplified: "3x = 15"
                    },
                    {
                        title: "Step 3: Divide both sides by 3 to solve for x.",
                        equation: "\\frac{3x}{3} = \\frac{15}{3}",
                        explanation: "Now that we have 3x, we divide both sides by 3 to isolate x.",
                        simplified: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 5 = 20",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 5 from both sides.",
                        equation: "3x = 15"
                    },
                    {
                        title: "Step 3: Divide both sides by 3 to solve for x.",
                        equation: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: null
            }
        ]
    },
    {
        id: "b9588bdd-6301-4f6b-9d83-acdbfa546b31",
        title: "Simplifying Equations with Multiplication/Division",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Transition to equations that require one multiplication/division step.",
        introText: "In this lesson, we will learn how to solve two-step equations that involve multiplication or division. We will break down each step to understand the process clearly.",
        problemStatement: {
            text: "Given the equation:",
            equation: "3x + 4 = 19",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by isolating it on one side of the equation using multiplication and division.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 4 = 19",
                        explanation: "Our goal is to solve for x. We will follow each algebraic step systematically to isolate x."
                    },
                    {
                        title: "Step 2: Subtract 4 from both sides of the equation.",
                        equation: "3x + 4 - 4 = 19 - 4",
                        explanation: "To isolate the term with x, we need to eliminate the constant on the left side by subtracting 4 from both sides.",
                        simplified: "3x = 15"
                    },
                    {
                        title: "Step 3: Divide both sides by 3 to solve for x.",
                        equation: "\\frac{3x}{3} = \\frac{15}{3}",
                        explanation: "Now that we have 3x, we divide both sides by 3 to isolate x.",
                        simplified: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "3x + 4 = 19",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 4 from both sides.",
                        equation: "3x = 15"
                    },
                    {
                        title: "Step 3: Divide both sides by 3 to solve for x.",
                        equation: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: null
            }
        ],
        finalStatement: "Remember, solving two-step equations requires practice. By breaking down each step and understanding the process, you will become more confident in solving these types of problems. Keep practicing, and soon solving equations will become second nature!"
    },
    {
        id: "23d26f61-070e-48e7-9108-4a8f7c61eaa1",
        title: "Combining Both Steps",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Demonstrate solving equations with both steps sequentially.",
        introText: "In this lesson, we will learn how to solve two-step equations that require both addition/subtraction and multiplication/division. We will break down each step to understand the process clearly.",
        problemStatement: {
            text: "Given the equation:",
            equation: "2x - 3 = 7",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by isolating it on one side of the equation using both addition/subtraction and multiplication/division.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "2x - 3 = 7",
                        explanation: "Our goal is to solve for x. We will follow each algebraic step systematically to isolate x."
                    },
                    {
                        title: "Step 2: Add 3 to both sides of the equation.",
                        equation: "2x - 3 + 3 = 7 + 3",
                        explanation: "To isolate the term with x, we need to eliminate the constant on the left side by adding 3 to both sides.",
                        simplified: "2x = 10"
                    },
                    {
                        title: "Step 3: Divide both sides by 2 to solve for x.",
                        equation: "\\frac{2x}{2} = \\frac{10}{2}",
                        explanation: "Now that we have 2x, we divide both sides by 2 to isolate x.",
                        simplified: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "2x - 3 = 7",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Add 3 to both sides.",
                        equation: "2x = 10"
                    },
                    {
                        title: "Step 3: Divide both sides by 2 to solve for x.",
                        equation: "x = 5"
                    }
                ],
                solutionAnswer: "x = 5",
                transitionText: null
            }
        ],
        finalStatement: "Solving two-step equations by combining both addition/subtraction and multiplication/division is a fundamental skill in algebra. Practice these steps to become more proficient and confident in solving similar problems. Keep practicing, and you'll master these concepts in no time!"
    },
    {
        id: "c97608d6-daec-4dbe-85f1-2772e9475602",
        title: "Solving with Fractions",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Introduce equations involving fractions and demonstrate simplification.",
        introText: "In this lesson, we will learn how to solve two-step equations that involve fractions. We will break down each step to understand how to handle fractions in equations.",
        problemStatement: {
            text: "Given the equation:",
            equation: "\\frac{1}{2}x + 3 = 7",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by isolating it on one side of the equation using operations that involve fractions.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "\\frac{1}{2}x + 3 = 7",
                        explanation: "Our goal is to solve for x. We will follow each algebraic step systematically to isolate x."
                    },
                    {
                        title: "Step 2: Subtract 3 from both sides of the equation.",
                        equation: "\\frac{1}{2}x + 3 - 3 = 7 - 3",
                        explanation: "To isolate the term with x, we need to eliminate the constant on the left side by subtracting 3 from both sides.",
                        simplified: "\\frac{1}{2}x = 4"
                    },
                    {
                        title: "Step 3: Multiply both sides by 2 to solve for x.",
                        equation: "2 \\cdot \\frac{1}{2}x = 4 \\cdot 2",
                        explanation: "Since x is multiplied by \\frac{1}{2}, we multiply both sides by 2 to cancel out the fraction.",
                        simplified: "x = 8"
                    }
                ],
                solutionAnswer: "x = 8",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "\\frac{1}{2}x + 3 = 7",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 3 from both sides.",
                        equation: "\\frac{1}{2}x = 4"
                    },
                    {
                        title: "Step 3: Multiply both sides by 2 to solve for x.",
                        equation: "x = 8"
                    }
                ],
                solutionAnswer: "x = 8",
                transitionText: null
            }
        ],
        finalStatement: "Solving equations with fractions can seem challenging at first, but by breaking down each step and practicing, you'll become more comfortable with these types of problems. Remember to always perform the same operation on both sides of the equation to maintain balance. Keep practicing, and you'll master solving equations with fractions in no time!"
    }, {
        id: "7465fc6b-3235-420a-9591-71a159e0e592",
        title: "Solving with Decimals",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Work through examples with decimal coefficients and solutions.",
        introText: "In this lesson, we will learn how to solve two-step equations that involve decimals. We will break down each step to understand how to handle decimals in equations.",
        problemStatement: {
            text: "Given the equation:",
            equation: "0.5x + 2.5 = 6.5",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by isolating it on one side of the equation using operations that involve decimals.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "0.5x + 2.5 = 6.5",
                        explanation: "Our goal is to solve for x. We will follow each algebraic step systematically to isolate x."
                    },
                    {
                        title: "Step 2: Subtract 2.5 from both sides of the equation.",
                        equation: "0.5x + 2.5 - 2.5 = 6.5 - 2.5",
                        explanation: "To isolate the term with x, we need to eliminate the constant on the left side by subtracting 2.5 from both sides.",
                        simplified: "0.5x = 4.0"
                    },
                    {
                        title: "Step 3: Divide both sides by 0.5 to solve for x.",
                        equation: "\\frac{0.5x}{0.5} = \\frac{4.0}{0.5}",
                        explanation: "Since x is multiplied by 0.5, we divide both sides by 0.5 to isolate x.",
                        simplified: "x = 8"
                    }
                ],
                solutionAnswer: "x = 8",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "0.5x + 2.5 = 6.5",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 2.5 from both sides.",
                        equation: "0.5x = 4.0"
                    },
                    {
                        title: "Step 3: Divide both sides by 0.5 to solve for x.",
                        equation: "x = 8"
                    }
                ],
                solutionAnswer: "x = 8",
                transitionText: null
            }
        ],
        finalStatement: "Solving equations with decimals requires careful attention to detail, but by breaking down each step and practicing, you'll become more comfortable with these types of problems. Remember to always perform the same operation on both sides of the equation to maintain balance. Keep practicing, and you'll master solving equations with decimals in no time!"
    }, {
        id: "83399622-2a3f-4dfd-98e4-6a2eed1ce433",
        title: "Word Problems",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Apply two-step equations to solve real-world problems.",
        introText: "In this lesson, we will learn how to translate real-world scenarios into two-step equations and solve them. Understanding how to set up equations from word problems is a valuable skill.",
        problemStatement: {
            text: "A word problem scenario:",
            equation: "A movie theater charges $8 per ticket and a one-time service fee of $10. If the total cost is $42, how many tickets were purchased?",
            instruction: "Set up and solve the equation to find the number of tickets."
        },
        solutions: [
            {
                task: "We need to determine the number of tickets purchased by setting up a two-step equation based on the given scenario.",
                steps: [
                    {
                        title: "Step 1: Define the variable.",
                        equation: "Let x represent the number of tickets purchased.",
                        explanation: "We need to find the number of tickets, so we define x as the number of tickets."
                    },
                    {
                        title: "Step 2: Set up the equation based on the problem.",
                        equation: "8x + 10 = 42",
                        explanation: "The cost per ticket is $8, and the total cost includes a $10 service fee. The equation represents the total cost."
                    },
                    {
                        title: "Step 3: Subtract 10 from both sides to isolate the term with x.",
                        equation: "8x + 10 - 10 = 42 - 10",
                        explanation: "To isolate the term with x, we subtract the service fee from both sides.",
                        simplified: "8x = 32"
                    },
                    {
                        title: "Step 4: Divide both sides by 8 to solve for x.",
                        equation: "\\frac{8x}{8} = \\frac{32}{8}",
                        explanation: "Now that we have 8x, we divide both sides by 8 to find the value of x.",
                        simplified: "x = 4"
                    }
                ],
                solutionAnswer: "x = 4",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the word problem using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Set up the equation.",
                        equation: "8x + 10 = 42",
                        explanation: "The cost per ticket is $8, and the total cost includes a $10 service fee."
                    },
                    {
                        title: "Step 2: Subtract 10 from both sides.",
                        equation: "8x = 32"
                    },
                    {
                        title: "Step 3: Divide both sides by 8 to solve for x.",
                        equation: "x = 4"
                    }
                ],
                solutionAnswer: "x = 4",
                transitionText: null
            }
        ],
        finalStatement: "Word problems can seem challenging at first, but by breaking them down into smaller parts and setting up equations, you can solve them step by step. Practice translating real-world scenarios into mathematical equations, and you'll find that solving word problems becomes easier over time!"
    }, {
        id: "ad3cc639-3b53-4d8e-96f8-3a958494c07b",
        title: "Error Analysis",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Have students identify and correct mistakes in sample problems.",
        introText: "In this lesson, we will focus on identifying and correcting common mistakes in solving two-step equations. Understanding where errors occur will help you avoid them in the future.",
        problemStatement: {
            text: "Consider the following incorrect solution to a two-step equation:",
            equation: "5x + 3 = 23",
            instruction: "Identify and correct the mistake in the solution provided below."
        },
        solutions: [
            {
                task: "Analyze the incorrect solution and identify the mistake.",
                steps: [
                    {
                        title: "Step 1: Review the incorrect solution.",
                        equation: "5x + 3 = 23",
                        explanation: "The student attempted to solve the equation as follows: 5x = 23 - 3, then x = \\frac{23}{5}."
                    },
                    {
                        title: "Step 2: Identify the mistake.",
                        equation: "5x = 23 - 3",
                        explanation: "The mistake is in the subtraction step. The student correctly subtracted 3 from 23, but they did not perform the subtraction correctly."
                    },
                    {
                        title: "Step 3: Correct the subtraction.",
                        equation: "5x = 20",
                        explanation: "Subtracting 3 from 23 should result in 20, not 23."
                    },
                    {
                        title: "Step 4: Solve for x by dividing both sides by 5.",
                        equation: "\\frac{5x}{5} = \\frac{20}{5}",
                        explanation: "Now that we have the correct equation, divide both sides by 5 to solve for x.",
                        simplified: "x = 4"
                    }
                ],
                solutionAnswer: "x = 4",
                transitionText: "Now that we have identified and corrected the mistake, let's see the correct solution without the intermediary error analysis..."
            },
            {
                task: "Solve the equation correctly without the mistake.",
                steps: [
                    {
                        title: "Step 1: Write down the original equation.",
                        equation: "5x + 3 = 23",
                        explanation: "Our goal is to solve for x."
                    },
                    {
                        title: "Step 2: Subtract 3 from both sides.",
                        equation: "5x = 20"
                    },
                    {
                        title: "Step 3: Divide both sides by 5 to solve for x.",
                        equation: "x = 4"
                    }
                ],
                solutionAnswer: "x = 4",
                transitionText: null
            }
        ],
        finalStatement: "Error analysis is a powerful tool for learning. By identifying and correcting mistakes, you deepen your understanding of the concepts and improve your problem-solving skills. Remember, making mistakes is a part of learning, and correcting them is how you grow!"
    }, {
        id: "b27373b2-b7ce-45f2-9987-cebcf94bcecd",
        title: "Practice with Increasing Complexity",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Mixed problems that integrate both simple and challenging equations.",
        introText: "In this lesson, we will tackle a more complex equation that involves multiple steps, including distribution, combining like terms, and solving for the variable.",
        problemStatement: {
            text: "Given the equation:",
            equation: "3(2x - 4) + 5 = 2(x + 6) + x",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by simplifying the equation and isolating x on one side.",
                steps: [
                    {
                        title: "Step 1: Distribute the 3 on the left side of the equation.",
                        equation: "3(2x - 4) + 5 = 2(x + 6) + x",
                        explanation: "Start by distributing the 3 to both terms inside the parentheses.",
                        simplified: "6x - 12 + 5 = 2(x + 6) + x"
                    },
                    {
                        title: "Step 2: Simplify the left side by combining like terms.",
                        equation: "6x - 12 + 5 = 2(x + 6) + x",
                        explanation: "Combine the constants on the left side.",
                        simplified: "6x - 7 = 2(x + 6) + x"
                    },
                    {
                        title: "Step 3: Distribute the 2 on the right side of the equation.",
                        equation: "6x - 7 = 2(x + 6) + x",
                        explanation: "Distribute the 2 to both terms inside the parentheses on the right side.",
                        simplified: "6x - 7 = 2x + 12 + x"
                    },
                    {
                        title: "Step 4: Combine like terms on the right side.",
                        equation: "6x - 7 = 2x + 12 + x",
                        explanation: "Combine the x terms on the right side.",
                        simplified: "6x - 7 = 3x + 12"
                    },
                    {
                        title: "Step 5: Subtract 3x from both sides to begin isolating x.",
                        equation: "6x - 3x - 7 = 3x - 3x + 12",
                        explanation: "Subtract 3x from both sides to get all x terms on one side.",
                        simplified: "3x - 7 = 12"
                    },
                    {
                        title: "Step 6: Add 7 to both sides to isolate the term with x.",
                        equation: "3x - 7 + 7 = 12 + 7",
                        explanation: "Add 7 to both sides to eliminate the constant on the left side.",
                        simplified: "3x = 19"
                    },
                    {
                        title: "Step 7: Divide both sides by 3 to solve for x.",
                        equation: "\\frac{3x}{3} = \\frac{19}{3}",
                        explanation: "Divide both sides by 3 to isolate x.",
                        simplified: "x = \\frac{19}{3}"
                    }
                ],
                solutionAnswer: "x = \\frac{19}{3}",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Distribute and simplify both sides.",
                        equation: "6x - 7 = 3x + 12",
                        explanation: "Distribute and combine like terms."
                    },
                    {
                        title: "Step 2: Subtract 3x from both sides.",
                        equation: "3x - 7 = 12"
                    },
                    {
                        title: "Step 3: Add 7 to both sides.",
                        equation: "3x = 19"
                    },
                    {
                        title: "Step 4: Divide both sides by 3.",
                        equation: "x = \\frac{19}{3}"
                    }
                ],
                solutionAnswer: "x = \\frac{19}{3}",
                transitionText: null
            }
        ],
        finalStatement: "As you work through more complex equations, remember to take each step carefully and verify your work. With practice, you'll develop the skills needed to solve even the most challenging algebraic problems. Keep practicing and stay confident!"
    },
    {
        id: "8e8316ed-2338-40a0-bfae-7de7605e4c94",
        title: "Practice with Increasing Complexity",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Mixed problems that integrate both simple and challenging equations.",
        introText: "In this lesson, we will practice solving equations that vary in complexity. We will start with a problem that requires multiple steps and involves both addition/subtraction and multiplication/division.",
        problemStatement: {
            text: "Given the equation:",
            equation: "2(x + 3) = 4x - 6",
            instruction: "Solve for x."
        },
        solutions: [
            {
                task: "We want to solve for x by simplifying and isolating it on one side of the equation.",
                steps: [
                    {
                        title: "Step 1: Distribute the 2 on the left side of the equation.",
                        equation: "2(x + 3) = 4x - 6",
                        explanation: "We start by distributing the 2 to both terms inside the parentheses.",
                        simplified: "2x + 6 = 4x - 6"
                    },
                    {
                        title: "Step 2: Subtract 2x from both sides to begin isolating x.",
                        equation: "2x + 6 - 2x = 4x - 6 - 2x",
                        explanation: "To get all x terms on one side, subtract 2x from both sides.",
                        simplified: "6 = 2x - 6"
                    },
                    {
                        title: "Step 3: Add 6 to both sides to isolate the term with x.",
                        equation: "6 + 6 = 2x - 6 + 6",
                        explanation: "Add 6 to both sides to eliminate the constant on the right side.",
                        simplified: "12 = 2x"
                    },
                    {
                        title: "Step 4: Divide both sides by 2 to solve for x.",
                        equation: "\\frac{12}{2} = \\frac{2x}{2}",
                        explanation: "Divide both sides by 2 to isolate x.",
                        simplified: "x = 6"
                    }
                ],
                solutionAnswer: "x = 6",
                transitionText: "Now that we have seen all of the detail, let's look at what you would realistically write when solving the same problem..."
            },
            {
                task: "We will solve the equation using a simplified approach, only showing the main steps without all the intermediary details.",
                steps: [
                    {
                        title: "Step 1: Distribute the 2 on the left side.",
                        equation: "2x + 6 = 4x - 6",
                        explanation: "Distribute the 2 to both terms inside the parentheses."
                    },
                    {
                        title: "Step 2: Subtract 2x from both sides.",
                        equation: "6 = 2x - 6"
                    },
                    {
                        title: "Step 3: Add 6 to both sides.",
                        equation: "12 = 2x"
                    },
                    {
                        title: "Step 4: Divide both sides by 2.",
                        equation: "x = 6"
                    }
                ],
                solutionAnswer: "x = 6",
                transitionText: null
            }
        ],
        finalStatement: "As you practice solving equations of increasing complexity, remember to take each step carefully and check your work. With practice, you'll become more adept at handling even the most challenging problems. Keep up the great work!"
    },
    {
        id: "eae4656a-abcd-4f66-9958-95c5d9d95097",
        title: "Rearranging Formulas",
        courseName: "Mathematics",
        topicName: "Algebra",
        moduleName: "Intermediate Algebra Concepts",
        description: "Rearranging formulas to solve for a specific variable.",
        introText: "In this lesson, we will learn how to rearrange a formula to solve for a different variable. We will use the formula for price, P = c + m, and solve for the cost, c.",
        problemStatement: {
            text: "Given the formula:",
            equation: "P = c + m",
            instruction: "Rearrange the formula to solve for c, given that the markup m is 25 cents."
        },
        solutions: [
            {
                task: "We want to solve for c by isolating it on one side of the equation.",
                steps: [
                    {
                        title: "Step 1: Write down the original formula.",
                        equation: "P = c + m",
                        explanation: "Our goal is to solve for c. We will rearrange the formula to isolate c."
                    },
                    {
                        title: "Step 2: Subtract m from both sides of the equation.",
                        equation: "P - m = c + m - m",
                        explanation: "To isolate c, we need to eliminate m from the right side by subtracting m from both sides.",
                        simplified: "P - m = c"
                    },
                    {
                        title: "Step 3: Flip the equation for clarity.",
                        equation: "c = P - m",
                        explanation: "It is common practice to write the variable we are solving for on the left side. So, we flip the equation."
                    }
                ],
                solutionAnswer: "c = P - m",
                transitionText: "Now that we have seen all of the detail, let's look at the equivalent version of the formula solved for c with the given markup..."
            },
            {
                task: "We will substitute the given markup value into the rearranged formula.",
                steps: [
                    {
                        title: "Step 1: Substitute m = 25 into the formula.",
                        equation: "c = P - 25",
                        explanation: "Replace m with 25 in the formula c = P - m."
                    }
                ],
                solutionAnswer: "c = P - 25",
                transitionText: null
            }
        ],
        finalStatement: "Rearranging formulas is a valuable skill that allows you to solve for different variables depending on the information you have. By practicing these steps, you'll become more adept at manipulating equations to find the solution you need."
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
                    "lessonContent": []
                },
                {
                    "lessonName": "Algebraic Expressions",
                    "lessonObjectives": "Teach students how to create and interpret algebraic expressions.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Translating Words into Algebra",
                    "lessonObjectives": "Enable students to convert verbal statements into algebraic equations.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Operations with Integers",
                    "lessonObjectives": "Review addition, subtraction, multiplication, and division of integers.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Introduction to Rational Numbers",
                    "lessonObjectives": "Introduce rational numbers and explain their properties.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Adding, Subtracting, Multiplying, and Dividing Fractions and Decimals",
                    "lessonObjectives": "Practice arithmetic operations with fractions and decimals.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Combining Like Terms",
                    "lessonObjectives": "Teach students to simplify algebraic expressions by combining like terms.",
                    "lessonContent": []
                },
                {
                    "lessonName": "The Distributive Property",
                    "lessonObjectives": "Introduce and apply the distributive property in simplifying expressions.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Simplifying Expressions Involving Fractions",
                    "lessonObjectives": "Apply fraction operations in algebraic expressions.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving One-Step Equations (Addition/Subtraction)",
                    "lessonObjectives": "Teach students how to solve one-step equations involving addition or subtraction.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving One-Step Equations (Multiplication/Division)",
                    "lessonObjectives": "Teach students how to solve one-step equations involving multiplication or division.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving Equations with Decimals and Fractions",
                    "lessonObjectives": "Solve equations that include decimals and fractions.",
                    "lessonContent": []
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
                    "lessonContent": []
                },
                {
                    "lessonName": "Graphing Inequalities on a Number Line",
                    "lessonObjectives": "Demonstrate how to graph inequalities on a number line.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving and Graphing Two-Step Inequalities",
                    "lessonObjectives": "Solve and graph two-step inequalities.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Introduction to the Coordinate Plane",
                    "lessonObjectives": "Introduce the coordinate plane and basic graphing techniques.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Plotting Points and Graphing Linear Equations",
                    "lessonObjectives": "Practice plotting points and graphing simple linear equations.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Finding Patterns in Tables and Graphs",
                    "lessonObjectives": "Identify and analyze patterns in tables and graphs.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Understanding Ratios and Proportions",
                    "lessonObjectives": "Introduce ratios and proportions and their applications.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving Proportions",
                    "lessonObjectives": "Solve proportion equations.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Converting Between Fractions, Decimals, and Percentages",
                    "lessonObjectives": "Teach conversions between fractions, decimals, and percentages.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Perimeter and Area of Algebraic Shapes",
                    "lessonObjectives": "Use algebra to find the perimeter and area of shapes.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Using Algebra to Solve Geometry Problems",
                    "lessonObjectives": "Apply algebraic skills to solve geometric problems.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Introduction to Surface Area and Volume",
                    "lessonObjectives": "Introduce concepts of surface area and volume using algebra.",
                    "lessonContent": []
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
                    "lessonContent": [
                        {
                            "title": "Introduction to Two-Step Equations",
                            "description": "Define two-step equations and provide basic examples."
                        },
                        {
                            "title": "Simplifying Equations with Addition/Subtraction",
                            "description": "Focus on equations that only require one addition/subtraction step."
                        },
                        {
                            "title": "Simplifying Equations with Multiplication/Division",
                            "description": "Transition to equations that require one multiplication/division step."
                        },
                        {
                            "title": "Combining Both Steps",
                            "description": "Demonstrate solving equations with both steps sequentially."
                        },
                        {
                            "title": "Solving with Fractions",
                            "description": "Introduce equations involving fractions and demonstrate simplification."
                        },
                        {
                            "title": "Solving with Decimals",
                            "description": "Work through examples with decimal coefficients and solutions."
                        },
                        {
                            "title": "Word Problems",
                            "description": "Apply two-step equations to solve real-world problems."
                        },
                        {
                            "title": "Error Analysis",
                            "description": "Have students identify and correct mistakes in sample problems."
                        },
                        {
                            "title": "Practice with Increasing Complexity",
                            "description": "Mixed problems that integrate both simple and challenging equations."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Test understanding and provide feedback."
                        }
                    ]
                },
                {
                    "lessonName": "Equations with Variables on Both Sides",
                    "lessonObjectives": "Solve equations with variables on both sides.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Variables on Both Sides",
                            "description": "Explain the concept and provide basic examples."
                        },
                        {
                            "title": "Simplifying Equations",
                            "description": "Demonstrate how to simplify by combining like terms on each side."
                        },
                        {
                            "title": "Isolating the Variable",
                            "description": "Practice moving variables to one side and constants to the other."
                        },
                        {
                            "title": "Using Inverse Operations",
                            "description": "Reinforce using inverse operations to solve equations."
                        },
                        {
                            "title": "Solving with Fractions",
                            "description": "Introduce equations with variables on both sides involving fractions."
                        },
                        {
                            "title": "Solving with Decimals",
                            "description": "Transition to equations with decimal values."
                        },
                        {
                            "title": "Application in Word Problems",
                            "description": "Apply equations with variables on both sides to solve real-world scenarios."
                        },
                        {
                            "title": "Error Analysis",
                            "description": "Have students identify mistakes and explain how to correct them."
                        },
                        {
                            "title": "Complex Equations",
                            "description": "Introduce more challenging equations with additional terms."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Evaluate student progress and understanding."
                        }
                    ]
                },
                {
                    "lessonName": "Equations with Distributive Property",
                    "lessonObjectives": "Apply the distributive property in equations.",
                    "lessonContent": [
                        {
                            "title": "Introduction to the Distributive Property",
                            "description": "Explain the property and show simple examples."
                        },
                        {
                            "title": "Applying the Distributive Property",
                            "description": "Solve equations using the distributive property with whole numbers."
                        },
                        {
                            "title": "Distributive Property with Fractions",
                            "description": "Expand into equations involving fractions."
                        },
                        {
                            "title": "Distributive Property with Variables",
                            "description": "Include equations where the property is applied to variables."
                        },
                        {
                            "title": "Combining Like Terms",
                            "description": "Combine the distributive property with the simplification of like terms."
                        },
                        {
                            "title": "Multiple Applications in One Equation",
                            "description": "Solve equations that require multiple uses of the distributive property."
                        },
                        {
                            "title": "Distributive Property in Word Problems",
                            "description": "Translate real-world problems into equations requiring the distributive property."
                        },
                        {
                            "title": "Error Analysis",
                            "description": "Identify and correct errors related to misapplication of the property."
                        },
                        {
                            "title": "Advanced Equations",
                            "description": "Introduce equations with multiple terms and levels of difficulty."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Test understanding and consolidate knowledge."
                        }
                    ]
                },
                {
                    "lessonName": "Understanding Functions and Relations",
                    "lessonObjectives": "Introduce functions and relations.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Functions and Relations",
                            "description": "Define and differentiate between functions and relations."
                        },
                        {
                            "title": "Mapping and Domain/Range",
                            "description": "Teach students how to map relations and identify domain and range."
                        },
                        {
                            "title": "Identifying Functions",
                            "description": "Demonstrate how to determine if a relation is a function using the vertical line test."
                        },
                        {
                            "title": "Function Notation Basics",
                            "description": "Introduce function notation and its meaning."
                        },
                        {
                            "title": "Evaluating Functions",
                            "description": "Practice evaluating functions for specific inputs."
                        },
                        {
                            "title": "Graphing Simple Functions",
                            "description": "Start graphing basic linear functions."
                        },
                        {
                            "title": "Interpreting Graphs",
                            "description": "Analyze function graphs to understand relationships."
                        },
                        {
                            "title": "Word Problems with Functions",
                            "description": "Apply functions in context through word problems."
                        },
                        {
                            "title": "Advanced Function Concepts",
                            "description": "Explore more complex examples, such as piecewise functions."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Review the concepts and check for understanding."
                        }
                    ]
                },
                {
                    "lessonName": "Function Notation",
                    "lessonObjectives": "Teach students how to read and use function notation.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Function Notation",
                            "description": "Define and explain function notation."
                        },
                        {
                            "title": "Reading Function Notation",
                            "description": "Practice interpreting and reading functions given in notation form."
                        },
                        {
                            "title": "Evaluating Functions from Notation",
                            "description": "Work on substituting values into function notation."
                        },
                        {
                            "title": "Writing Functions Using Notation",
                            "description": "Transition to writing simple equations using function notation."
                        },
                        {
                            "title": "Function Notation and Graphing",
                            "description": "Connect notation with graphing linear functions."
                        },
                        {
                            "title": "Real-World Applications",
                            "description": "Use function notation in context-based problems."
                        },
                        {
                            "title": "Function Operations",
                            "description": "Introduce operations on functions, like addition and multiplication."
                        },
                        {
                            "title": "Inverse Functions",
                            "description": "Explore inverse functions and how to write them in notation form."
                        },
                        {
                            "title": "Advanced Evaluations",
                            "description": "Evaluate complex functions involving fractions or multiple terms."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Check understanding with quizzes and activities."
                        }
                    ]
                },
                {
                    "lessonName": "Evaluating and Graphing Linear Functions",
                    "lessonObjectives": "Evaluate and graph linear functions.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Linear Functions",
                            "description": "Define linear functions and introduce the standard form \( y = mx + b \)."
                        },
                        {
                            "title": "Slope and Y-Intercept",
                            "description": "Explain the concepts of slope and y-intercept, and how they relate to the linear equation."
                        },
                        {
                            "title": "Evaluating Linear Functions",
                            "description": "Practice evaluating linear functions by substituting specific values for \( x \)."
                        },
                        {
                            "title": "Graphing Linear Functions from a Table",
                            "description": "Teach students to create a table of values and use it to plot points and graph a linear function."
                        },
                        {
                            "title": "Graphing Using Slope and Y-Intercept",
                            "description": "Introduce the method of graphing linear equations directly using the slope and y-intercept."
                        },
                        {
                            "title": "Interpreting Graphs of Linear Functions",
                            "description": "Analyze graphs to interpret the meaning of slope and y-intercept in real-world contexts."
                        },
                        {
                            "title": "Graphing Horizontal and Vertical Lines",
                            "description": "Show how to graph equations where \( y \) or \( x \) is constant (horizontal and vertical lines)."
                        },
                        {
                            "title": "Writing Equations from Graphs",
                            "description": "Practice writing equations of linear functions given a graph."
                        },
                        {
                            "title": "Graphing Linear Inequalities",
                            "description": "Introduce linear inequalities and how to graph them with shading the solution area."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Review graphing methods and evaluating functions through quizzes and practice problems."
                        }
                    ]
                },
                {
                    "lessonName": "Solving Systems by Graphing",
                    "lessonObjectives": "Solve systems of equations by graphing.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Systems of Equations",
                            "description": "Define systems of equations and what it means to find a solution."
                        },
                        {
                            "title": "Graphing Two Linear Equations",
                            "description": "Practice graphing two linear equations on the same coordinate plane."
                        },
                        {
                            "title": "Identifying Points of Intersection",
                            "description": "Teach students how to identify the point of intersection as the solution to the system."
                        },
                        {
                            "title": "Consistent and Inconsistent Systems",
                            "description": "Differentiate between systems with one solution, no solution (parallel lines), or infinitely many solutions (coincident lines)."
                        },
                        {
                            "title": "Systems in Word Problems",
                            "description": "Set up and solve systems of equations from word problems, interpreting the solution."
                        },
                        {
                            "title": "Graphing Systems with Fractions and Decimals",
                            "description": "Graph more complex systems involving fractional or decimal coefficients."
                        },
                        {
                            "title": "Checking Solutions Algebraically",
                            "description": "Verify the solution found from graphing by substituting values into both equations."
                        },
                        {
                            "title": "Graphing and Interpreting Systems of Inequalities",
                            "description": "Extend to graphing systems of inequalities and finding solution regions."
                        },
                        {
                            "title": "Real-World Applications of Systems",
                            "description": "Solve real-world problems using systems of equations involving rates, costs, etc."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Summative review of graphing systems with practice exercises and quizzes."
                        }
                    ]
                },
                {
                    "lessonName": "Solving Systems by Substitution",
                    "lessonObjectives": "Solve systems using the substitution method.",
                    "lessonContent": [
                        {
                            "title": "Introduction to the Substitution Method",
                            "description": "Explain the substitution method and when it is most effective."
                        },
                        {
                            "title": "Setting Up Equations for Substitution",
                            "description": "Teach students to isolate one variable in an equation to prepare for substitution."
                        },
                        {
                            "title": "Substituting into the Second Equation",
                            "description": "Practice substituting the expression from the first equation into the second equation."
                        },
                        {
                            "title": "Solving for the Remaining Variable",
                            "description": "Solve the resulting single-variable equation."
                        },
                        {
                            "title": "Back Substitution",
                            "description": "Substitute the solution back into the original equation to find the second variable’s value."
                        },
                        {
                            "title": "Checking Solutions",
                            "description": "Practice verifying solutions by substituting values back into both original equations."
                        },
                        {
                            "title": "Solving Systems with Fractions",
                            "description": "Work on systems involving fractional coefficients and constants."
                        },
                        {
                            "title": "Word Problems with Substitution",
                            "description": "Apply the substitution method to solve word problems that model real-world scenarios."
                        },
                        {
                            "title": "Special Cases: No Solution or Infinite Solutions",
                            "description": "Explore what happens when equations have no solution (parallel lines) or infinite solutions (same line)."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Review and assess students’ proficiency in solving systems using substitution through a quiz and problem set."
                        }
                    ]
                },
                {
                    "lessonName": "Solving Systems by Elimination",
                    "lessonObjectives": "Solve systems using the elimination method.",
                    "lessonContent": [
                        {
                            "title": "Introduction to the Elimination Method",
                            "description": "Define the elimination method and how it differs from substitution."
                        },
                        {
                            "title": "Aligning Equations for Elimination",
                            "description": "Teach students how to align equations and look for terms that can be added or subtracted to eliminate a variable."
                        },
                        {
                            "title": "Adding and Subtracting Equations",
                            "description": "Practice eliminating a variable by adding or subtracting equations directly."
                        },
                        {
                            "title": "Multiplying to Create Opposite Coefficients",
                            "description": "Show how to multiply equations by constants to create opposite coefficients for one of the variables."
                        },
                        {
                            "title": "Solving the Resulting Equation",
                            "description": "Solve the resulting single-variable equation after elimination."
                        },
                        {
                            "title": "Back Substitution in Elimination",
                            "description": "Substitute the found value back into one of the original equations to solve for the remaining variable."
                        },
                        {
                            "title": "Elimination with Fractions and Decimals",
                            "description": "Work through examples where equations involve fractions or decimal coefficients."
                        },
                        {
                            "title": "Word Problems Using Elimination",
                            "description": "Solve systems of equations derived from word problems using the elimination method."
                        },
                        {
                            "title": "Special Cases: No Solution or Infinite Solutions",
                            "description": "Identify and understand systems with no solution (parallel lines) or infinite solutions (identical equations)."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Conduct a quiz and practice exercises to review and assess understanding of the elimination method."
                        }
                    ]
                },
                {
                    "lessonName": "Laws of Exponents",
                    "lessonObjectives": "Introduce the laws of exponents.",
                    "lessonContent": [
                        {
                            "title": "Introduction to Exponents",
                            "description": "Review what exponents are and discuss the concept of repeated multiplication."
                        },
                        {
                            "title": "Product of Powers Rule",
                            "description": "Teach the rule for multiplying powers with the same base (e.g., \(a^m \cdot a^n = a^{m+n}\))."
                        },
                        {
                            "title": "Quotient of Powers Rule",
                            "description": "Explain the rule for dividing powers with the same base (e.g., \(a^m / a^n = a^{m-n}\))."
                        },
                        {
                            "title": "Power of a Power Rule",
                            "description": "Practice raising a power to another power (e.g., \((a^m)^n = a^{mn}\))."
                        },
                        {
                            "title": "Power of a Product Rule",
                            "description": "Apply the power of a product rule (e.g., \((ab)^n = a^n \cdot b^n\))."
                        },
                        {
                            "title": "Power of a Quotient Rule",
                            "description": "Work with the power of a quotient rule (e.g., \((a/b)^n = a^n / b^n\))."
                        },
                        {
                            "title": "Zero Exponent Rule",
                            "description": "Introduce the concept that any base raised to the power of zero equals one (e.g., \(a^0 = 1\))."
                        },
                        {
                            "title": "Negative Exponents",
                            "description": "Explain negative exponents and how they relate to reciprocals (e.g., \(a^{-n} = 1/a^n\))."
                        },
                        {
                            "title": "Combining Multiple Rules",
                            "description": "Practice problems that combine several exponent rules in one expression to simplify."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Review through a quiz and problem set focusing on applying exponent laws to simplify expressions."
                        }
                    ]
                },
                {
                    "lessonName": "Simplifying Expressions with Exponents",
                    "lessonObjectives": "Simplify algebraic expressions using exponent rules.",
                    "lessonContent": [
                        {
                            "title": "Review of Exponent Rules",
                            "description": "Briefly revisit the laws of exponents learned in Lesson 10."
                        },
                        {
                            "title": "Simplifying Basic Expressions",
                            "description": "Practice simplifying simple expressions using a single exponent rule."
                        },
                        {
                            "title": "Simplifying Expressions with Multiple Terms",
                            "description": "Introduce expressions involving several terms and apply multiple exponent rules."
                        },
                        {
                            "title": "Distributive Property with Exponents",
                            "description": "Use the distributive property with exponents when simplifying expressions like \(a(bc)^n\)."
                        },
                        {
                            "title": "Combining Like Terms with Exponents",
                            "description": "Identify and combine like terms in expressions involving exponents."
                        },
                        {
                            "title": "Exponents in Fractions",
                            "description": "Practice simplifying expressions with exponents in the numerator and denominator."
                        },
                        {
                            "title": "Working with Negative Exponents in Expressions",
                            "description": "Apply rules for negative exponents within more complex algebraic expressions."
                        },
                        {
                            "title": "Simplifying Expressions with Variables and Exponents",
                            "description": "Solve problems that combine variables with exponents, such as \(x^m \cdot y^n\)."
                        },
                        {
                            "title": "Applying Exponent Rules to Real-World Problems",
                            "description": "Simplify expressions based on real-world contexts, like physics formulas or growth models."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Conduct a quiz and problem set focusing on simplifying increasingly complex expressions using exponent rules."
                        }
                    ]
                },
                {
                    "lessonName": "Introduction to Polynomials",
                    "lessonObjectives": "Introduce basic polynomial operations.",
                    "lessonContent": [
                        {
                            "title": "What are Polynomials?",
                            "description": "Define polynomials and introduce terminology such as terms, coefficients, degree, and constants."
                        },
                        {
                            "title": "Identifying Degrees and Terms",
                            "description": "Teach how to identify the degree of a polynomial and the number of terms (e.g., monomials, binomials, trinomials)."
                        },
                        {
                            "title": "Adding Polynomials",
                            "description": "Practice adding polynomials by combining like terms."
                        },
                        {
                            "title": "Subtracting Polynomials",
                            "description": "Demonstrate subtracting polynomials, focusing on distributing negative signs and combining like terms."
                        },
                        {
                            "title": "Multiplying Polynomials (Monomial by Polynomial)",
                            "description": "Show how to multiply a monomial by a polynomial using the distributive property."
                        },
                        {
                            "title": "Multiplying Polynomials (Binomial by Binomial)",
                            "description": "Practice binomial multiplication (e.g., using the FOIL method)."
                        },
                        {
                            "title": "Special Products of Polynomials",
                            "description": "Explore patterns like the square of a binomial and the product of a sum and difference (e.g., \((a+b)^2\) and \((a+b)(a-b)\))."
                        },
                        {
                            "title": "Identifying the Degree of a Product",
                            "description": "Teach students how to determine the degree of a product when polynomials are multiplied."
                        },
                        {
                            "title": "Simplifying Polynomials",
                            "description": "Practice simplifying polynomial expressions by combining like terms and using multiplication rules."
                        },
                        {
                            "title": "Assessment & Review",
                            "description": "Conduct a quiz and practice exercises to review and assess understanding of basic polynomial operations."
                        }
                    ]
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
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving Quadratics by Factoring",
                    "lessonObjectives": "Solve quadratic equations using factoring.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Graphing Quadratic Functions",
                    "lessonObjectives": "Graph quadratic functions and understand their properties.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving and Graphing Linear Inequalities in Two Variables",
                    "lessonObjectives": "Solve and graph linear inequalities in two variables.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Systems of Inequalities",
                    "lessonObjectives": "Solve and graph systems of inequalities.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Applications of Inequalities",
                    "lessonObjectives": "Apply inequalities to real-world scenarios.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Simplifying Square Roots",
                    "lessonObjectives": "Simplify and evaluate square roots.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Operations with Radicals",
                    "lessonObjectives": "Perform operations with radical expressions.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Solving Equations with Square Roots",
                    "lessonObjectives": "Solve equations involving square roots.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Cumulative Review of Algebra Concepts",
                    "lessonObjectives": "Review all learned algebra concepts cumulatively.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Algebra in Real-Life Scenarios",
                    "lessonObjectives": "Apply algebraic knowledge to solve real-world problems.",
                    "lessonContent": []
                },
                {
                    "lessonName": "Advanced Practice Problems",
                    "lessonObjectives": "Prepare students for further advanced algebra with challenging problems.",
                    "lessonContent": []
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
                solutionAnswer: "Final answer for the solution.",
                transitionText: "Transition text moving to another solution or section, if applicable.",
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
                solutionAnswer: "Final answer for this approach.",
                transitionText: null,
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
                solutionAnswer: "",
                transitionText: "",
            },
            {
                task: "",
                steps: [
                    {
                        title: "",
                        equation: "",
                        explanation: ""
                    }
                ],
                solutionAnswer: "",
                transitionText: "",
            },
            {
                task: "",
                steps: [
                    {
                        title: "",
                        equation: "",
                        explanation: ""
                    }
                ],
                solutionAnswer: "",
                transitionText: null,
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
                solutionAnswer: "",
                transitionText: null,
            },
        ]
    }
];

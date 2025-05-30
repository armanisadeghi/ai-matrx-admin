// app/(authenticated)/tests/workflows/first/constants.ts
// This file contains initial data for the workflow editor showcasing our new core workflow nodes

export const initialNodes = [
    // User Input Nodes - Start of the workflow
    {
        id: "user-input-profession",
        type: "userInput",
        position: { x: 50, y: 100 },
        data: {
            label: "User Profession",
            stepName: "user_profession_input",
            stepType: "userInput",
            inputType: "text",
            isRequired: true,
            status: "completed",
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {
                profession: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c"
            },
            outputBrokerId: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c",
            description: "Enter your profession to generate relevant app ideas",
            currentValue: "I own an Electronics Recycling and IT Asset Disposition Company",
            defaultValue: "Enter your profession..."
        },
    },
    {
        id: "user-input-extraction-config",
        type: "userInput",
        position: { x: 50, y: 300 },
        data: {
            label: "Extraction Config",
            stepName: "extraction_config_input",
            stepType: "userInput",
            inputType: "json",
            isRequired: true,
            status: "completed",
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {
                config: "EXTRACTION_1_CONFIG"
            },
            outputBrokerId: "EXTRACTION_1_CONFIG",
            description: "Configuration for extracting app descriptions",
            currentValue: { 
                extract: [{ 
                    path: "applications", 
                    fields: ["description"], 
                    flatten: true, 
                    select_all: true 
                }] 
            }
        },
    },

    // Recipe Nodes - AI-powered processing
    {
        id: "recipe-app-ideas",
        type: "recipe",
        position: { x: 400, y: 100 },
        data: {
            label: "App Ideas Generator",
            stepName: "recipe_1_app_ideas",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.recipe_runner",
            status: "pending",
            recipeId: "f652c807-c4c2-4f64-86f6-d7233e057bb8",
            recipeName: "AI App Ideas Generator",
            description: "Generate innovative app ideas based on user profession",
            argMapping: {
                user_profession_broker_id: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c"
            },
            argOverrides: [
                {
                    name: "recipe_id",
                    value: "f652c807-c4c2-4f64-86f6-d7233e057bb8",
                    ready: true
                }
            ],
            brokerInputs: {
                profession: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c"
            },
            brokerOutputs: {
                app_ideas: "RESULT_1_BROKER_ID"
            }
        },
    },
    {
        id: "recipe-app-planner",
        type: "recipe",
        position: { x: 1400, y: 600 },
        data: {
            label: "App Planner",
            stepName: "app_plan_recipe",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.recipe_runner",
            status: "pending",
            recipeId: "26b74786-b453-4f6d-b979-ea1451c484d9",
            recipeName: "Complete App Development Planner",
            description: "Create comprehensive app development plan with SQL tables",
            recipeDependencies: ["bed0f380-3f1a-4833-9f8e-492da264f12d"],
            argMapping: {},
            argOverrides: [
                {
                    name: "model_override",
                    value: "10168527-4d6b-456f-ab07-a889223ba3a9",
                    ready: true
                },
                {
                    name: "recipe_id",
                    value: "26b74786-b453-4f6d-b979-ea1451c484d9",
                    ready: true
                }
            ],
            brokerInputs: {
                app_concept: "bed0f380-3f1a-4833-9f8e-492da264f12d"
            },
            brokerOutputs: {
                app_plan: "FULL_APP_CONCEPT_AND_SQL_TABLES"
            }
        },
    },

    // Extractor Node - Data extraction
    {
        id: "extractor-descriptions",
        type: "recipe", // Using recipe type since we don't have extractor node yet
        position: { x: 750, y: 100 },
        data: {
            label: "Description Extractor",
            stepName: "extract_app_descriptions",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.extractor",
            status: "pending",
            description: "Extract structured app descriptions from generated ideas",
            argMapping: {
                input_broker_id: "RESULT_1_BROKER_ID",
                config_broker_id: "EXTRACTION_1_CONFIG"
            },
            argOverrides: [],
            brokerInputs: {
                app_ideas: "RESULT_1_BROKER_ID",
                config: "EXTRACTION_1_CONFIG"
            },
            brokerOutputs: {
                extracted_descriptions: "5d8c5ed2-5a84-476a-9258-6123a45f996a"
            }
        },
    },

    // Iterative Recipe Nodes - Complex processing
    {
        id: "iterative-preparer",
        type: "recipe", // Using recipe type since we don't have iterative nodes yet
        position: { x: 400, y: 350 },
        data: {
            label: "Iteration Preparer",
            stepName: "prepare_recipe_2_iterations",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.iterative_recipe_preparer",
            status: "pending",
            recipeId: "e2049ce6-c340-4ff7-987e-deb24a977853",
            description: "Prepare batch configurations for iterative recipe processing",
            argMapping: {
                extracted_data_broker_id: "5d8c5ed2-5a84-476a-9258-6123a45f996a"
            },
            argOverrides: [
                {
                    name: "recipe_id",
                    value: "e2049ce6-c340-4ff7-987e-deb24a977853",
                    ready: true
                },
                {
                    name: "version",
                    value: "latest",
                    ready: true
                },
                {
                    name: "max_count",
                    value: 2,
                    ready: true
                },
                {
                    name: "model_override",
                    value: "10168527-4d6b-456f-ab07-a889223ba3a9",
                    ready: true
                }
            ],
            brokerInputs: {
                extracted_data: "5d8c5ed2-5a84-476a-9258-6123a45f996a"
            },
            brokerOutputs: {
                batch_configs: "e2049ce6-c340-4ff7-987e-deb24a977853_ITERATION_BATCH_CONFIGS"
            }
        },
    },
    {
        id: "iterative-runner",
        type: "recipe", // Using recipe type since we don't have iterative nodes yet
        position: { x: 750, y: 350 },
        data: {
            label: "Iterative Runner",
            stepName: "run_recipe_2_iteratively",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.iterative_recipe_runner",
            status: "pending",
            description: "Execute recipes iteratively based on batch configurations",
            argMapping: {
                batch_configs_broker_id: "e2049ce6-c340-4ff7-987e-deb24a977853_ITERATION_BATCH_CONFIGS"
            },
            argOverrides: [],
            brokerInputs: {
                batch_configs: "e2049ce6-c340-4ff7-987e-deb24a977853_ITERATION_BATCH_CONFIGS"
            },
            brokerOutputs: {
                iteration_results: "RESULT_2_BROKER_ID"
            }
        },
    },

    // Results Processor Node
    {
        id: "results-processor",
        type: "recipe", // Using recipe type since we don't have results processor node yet
        position: { x: 1100, y: 350 },
        data: {
            label: "Results Processor",
            stepName: "process_final_results",
            stepType: "recipe",
            functionType: "workflow_recipe_executor.results_processor",
            status: "pending",
            description: "Process and classify final workflow results",
            argMapping: {
                input_broker_id: "RESULT_2_BROKER_ID"
            },
            argOverrides: [],
            brokerInputs: {
                iteration_results: "RESULT_2_BROKER_ID"
            },
            brokerOutputs: {
                final_results: "FINAL_WORKFLOW_RESULTS",
                classified_results: "FINAL_WORKFLOW_RESULTS_CLASSIFIED"
            }
        },
    },

    // Generic Function Node - Text processing
    {
        id: "function-text-processor",
        type: "genericFunction",
        position: { x: 1100, y: 100 },
        data: {
            label: "Content Processor",
            stepName: "Process Content 1 to get app idea",
            stepType: "function",
            functionId: "b42d270b-0627-453c-a4bb-920eb1da6c51",
            functionName: "orchestrate_text_operations",
            status: "pending",
            category: "Text Processing",
            description: "Extract and process app content using text operations",
            functionArgs: [
                {
                    id: "instructions-arg",
                    name: "instructions",
                    required: true,
                    data_type: "list",
                    ready: true,
                    description: "Text processing instructions"
                },
                {
                    id: "content-arg",
                    name: "content",
                    required: true,
                    data_type: "str",
                    ready: false,
                    description: "Content to process"
                }
            ],
            argMapping: {
                content: "RESULT_2_BROKER_ID_1_CONTENT"
            },
            argOverrides: [
                {
                    name: "instructions",
                    value: [
                        {
                            operation: "marker_extract_recursive",
                            params: {
                                marker_pairs: [
                                    ["## 2. Suggestion\n", "## 3. Suggestion"],
                                    ["- **App Name:**\n  ", "- **Image Description:**"]
                                ]
                            }
                        },
                        {
                            operation: "literal_replace",
                            params: {
                                search_text: "- **App Description:**",
                                replacement: "About the app:\n"
                            }
                        }
                    ],
                    ready: true
                }
            ],
            brokerInputs: {
                content: "RESULT_2_BROKER_ID_1_CONTENT"
            },
            brokerOutputs: {
                processed_content: "2ca25554-0db3-47e6-81c1-80b3d792b1c6"
            }
        },
    }
];

export const initialEdges = [
    // User Input to Recipe
    {
        id: "e1",
        source: "user-input-profession",
        target: "recipe-app-ideas",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // User Input Config to Extractor
    {
        id: "e2",
        source: "user-input-extraction-config",
        target: "extractor-descriptions",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Recipe to Extractor
    {
        id: "e3",
        source: "recipe-app-ideas",
        target: "extractor-descriptions",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Extractor to Iterative Preparer
    {
        id: "e4",
        source: "extractor-descriptions",
        target: "iterative-preparer",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Iterative Preparer to Runner
    {
        id: "e5",
        source: "iterative-preparer",
        target: "iterative-runner",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Iterative Runner to Results Processor
    {
        id: "e6",
        source: "iterative-runner",
        target: "results-processor",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Iterative Runner to Function Processor
    {
        id: "e7",
        source: "iterative-runner",
        target: "function-text-processor",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    // Function Processor to App Planner (represents the relay)
    {
        id: "e8",
        source: "function-text-processor",
        target: "recipe-app-planner",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    }
];

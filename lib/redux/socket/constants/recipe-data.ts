export const RECIPE_DATABASE = {
    "6615f9a50134cf41e405087b": {
        "name": "Extract Job Code From AMA Medical Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087b-0",
                "official_name": "JOB_CODE_LIST",
                "name": "JOB_CODE_LIST",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087b-1",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e405087e": {
        "name": "Extract Search Terms from Medical Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087e-0",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e405087a": {
        "name": "AMA Guides Expert Final Analysis",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087a-0",
                "official_name": "COMPLETE_ANSWERS",
                "name": "COMPLETE_ANSWERS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e4050879": {
        "name": "Get Complete Answers from Full Medical Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e4050879-0",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e4050879-1",
                "official_name": "SPECIFIC_QUESTIONS",
                "name": "SPECIFIC_QUESTIONS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e405087c": {
        "name": "Create Final Combined Report from Medical Report Data",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087c-0",
                "official_name": "COMPLETE_ANSWERS",
                "name": "COMPLETE_ANSWERS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087c-1",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087c-2",
                "official_name": "AME_SPECIALIST_FINAL_ANALYSIS",
                "name": "AME_SPECIALIST_FINAL_ANALYSIS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087c-3",
                "official_name": "JOB_CODE_DATA",
                "name": "JOB_CODE_DATA",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087c-4",
                "official_name": "IMPAIRMENT_CODE_TABLE",
                "name": "IMPAIRMENT_CODE_TABLE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087c-5",
                "official_name": "SPECIFIC_QUESTIONS",
                "name": "SPECIFIC_QUESTIONS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e4050876": {
        "name": "Extract Medical Facts from AMA Guides Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e4050876-0",
                "official_name": "RAW_MEDICAL_REPORT_TEXT",
                "name": "RAW_MEDICAL_REPORT_TEXT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e405087d": {
        "name": "Extract Impairment Codes from Medical Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087d-0",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087d-1",
                "official_name": "POTENTIAL_MATCHING_IMPAIRMENT_DATA",
                "name": "POTENTIAL_MATCHING_IMPAIRMENT_DATA",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e4050877": {
        "name": "AMA Guides Expert Review",
        "brokers": [
            {
                "id": "6615f9a50134cf41e4050877-0",
                "official_name": "STRUCTURED_MEDICAL_REPORT",
                "name": "STRUCTURED_MEDICAL_REPORT",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e4050880": {
        "name": "Create grading rubric for Blog Topic Ideas (hard-coded version)",
        "brokers": [
            {
                "id": "6615f9a50134cf41e4050880-0",
                "official_name": "TASK_INSTRUCTIONS",
                "name": "TASK_INSTRUCTIONS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e405087f": {
        "name": "Compare Two Medical Reports and Generate Structured Comparison Report",
        "brokers": [
            {
                "id": "6615f9a50134cf41e405087f-0",
                "official_name": "STRUCTURED_MEDICAL_REPORT_1",
                "name": "STRUCTURED_MEDICAL_REPORT_1",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6615f9a50134cf41e405087f-1",
                "official_name": "STRUCTURED_MEDICAL_REPORT_2",
                "name": "STRUCTURED_MEDICAL_REPORT_2",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6615f9a50134cf41e4050878": {
        "name": "AMA Guides Expert Get Specific Questions",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4a": {
        "name": "EllieCrossX Missing Questions",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4a-0",
                "official_name": "PREVIOUS_INPUTS_1001",
                "name": "PREVIOUS_INPUTS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af4a-1",
                "official_name": "PREVIOUS_RESPONSE_1001",
                "name": "PREVIOUS_RESPONSE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af41": {
        "name": "Service Page Content Writing",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af41-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af41-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af57": {
        "name": "LSI Variations GPT-4",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af57-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af3f": {
        "name": "Ali Liton Bot",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af3f-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af3b": {
        "name": "Marketing Statement for Service Banners",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af3b-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af45": {
        "name": "Persian Dad (Speaks Farsi)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af45-0",
                "official_name": "RELATIONSHIP_1001",
                "name": "RELATIONSHIP_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af45-1",
                "official_name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af3e": {
        "name": "EllieCrossX",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af3e-0",
                "official_name": "QUESTION_GOAL_1001",
                "name": "QUESTION_GOAL_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af3e-1",
                "official_name": "WEIGHT_1001",
                "name": "WEIGHT_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af3e-2",
                "official_name": "GENDER_1001",
                "name": "GENDER_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af3e-3",
                "official_name": "PRIOR_INJURIES_SAME_BODY_PART_1001",
                "name": "PRIOR_INJURIES_SAME_BODY_PART_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af3e-4",
                "official_name": "AGE_1001",
                "name": "AGE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af3e-5",
                "official_name": "DOCTOR_TYPE_1001",
                "name": "DOCTOR_TYPE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af48": {
        "name": "SEO FAQ inspiration",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af48-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5a": {
        "name": "LSI Variation With Specifics",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5a-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af5a-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af5a-2",
                "official_name": "KEYWORD_TYPE_OPTIONS_1001",
                "name": "KEYWORD_TYPE_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af5a-3",
                "official_name": "INDUSTRY_NAME_1002",
                "name": "INDUSTRY_NAME_1002",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4b": {
        "name": "AME Django Backend Step 1 (App Development Project Overview)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4b-0",
                "official_name": "FORCE_QUESTIONS_PRIOR_TO_TASK_1001",
                "name": "FORCE_QUESTIONS_PRIOR_TO_TASK_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af4b-1",
                "official_name": "ADDITIONAL_POINTS_PRIOR_TO_FINAL_INSTRUCTIONS_1001",
                "name": "ADDITIONAL_POINTS_PRIOR_TO_FINAL_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af4b-2",
                "official_name": "SPECIFIC_REQUIREMENTS_LIST_1001",
                "name": "SPECIFIC_REQUIREMENTS_LIST_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af4b-3",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af4b-4",
                "official_name": "PROJECT_OVERVIEW_1001",
                "name": "PROJECT_OVERVIEW_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af3d": {
        "name": "Sample Recipe 4 Messages",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af3d-0",
                "official_name": "MY_VARIABLE_1001",
                "name": "MY_VARIABLE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af40": {
        "name": "Google Helpful Content Analysis (JSON FORMAT)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af40-0",
                "official_name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af3c": {
        "name": "Name that capital",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af3c-0",
                "official_name": "COUNTRY_1001",
                "name": "COUNTRY_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af59": {
        "name": "Questionnaire JSON from Question Analysis",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af59-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4c": {
        "name": "Google Helpful Content Analysis JSON V1",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4c-0",
                "official_name": "SOME_DATA_HERE_1001",
                "name": "SOME_DATA_HERE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4d": {
        "name": "Emotional AI",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4d-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af51": {
        "name": "Armani AI",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af51-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af47": {
        "name": "Medical Keyword Research Categorization",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af47-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af58": {
        "name": "LSI Variation With Specifics (short)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af58-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af58-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af58-2",
                "official_name": "KEYWORD_TYPE_OPTIONS_1001",
                "name": "KEYWORD_TYPE_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af58-3",
                "official_name": "INDUSTRY_NAME_1002",
                "name": "INDUSTRY_NAME_1002",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af46": {
        "name": "Old School Iran Lover",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af46-0",
                "official_name": "RELATIONSHIP_1001",
                "name": "RELATIONSHIP_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af46-1",
                "official_name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "name": "SPECIFIC_QUESTION_OR_TASK_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5d": {
        "name": "Business Requirements From Technical Documents (conversation version)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5d-0",
                "official_name": "TECHNICAL_REQUIREMENTS_1001",
                "name": "TECHNICAL_REQUIREMENTS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af61": {
        "name": "Get Image Alt Text",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af61-0",
                "official_name": "COMPANY_NAME_1002",
                "name": "COMPANY_NAME_1002",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-1",
                "official_name": "SERVICE_NAME_1001",
                "name": "SERVICE_NAME_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-2",
                "official_name": "KEYWORD_TYPE_OPTIONS_1001",
                "name": "KEYWORD_TYPE_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-3",
                "official_name": "COMPANY_OFFERINGS_1001",
                "name": "COMPANY_OFFERINGS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-4",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-5",
                "official_name": "PAGE_SECTION_1001",
                "name": "PAGE_SECTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af61-6",
                "official_name": "INDUSTRY_NAME_1002",
                "name": "INDUSTRY_NAME_1002",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af55": {
        "name": "Questionnaire System Test",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5e": {
        "name": "Get Detailed Image Descriptions",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5e-0",
                "official_name": "LEVEL_OF_DETAIL_1001",
                "name": "LEVEL_OF_DETAIL_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5f": {
        "name": "Analyze a Webpage's Content",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5f-0",
                "official_name": "ENTIRE_PAGE_CONTENT_1001",
                "name": "ENTIRE_PAGE_CONTENT_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af52": {
        "name": "Meta Descriptions For a Service Page",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af52-0",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af42": {
        "name": "Internal Linking Optimization",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af43": {
        "name": "SwiftieBot AI",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af43-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af53": {
        "name": "Meta Descriptions For a List of Keywords (3 Options Each)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af53-0",
                "official_name": "KEYWORD_LIST_1001",
                "name": "KEYWORD_LIST_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5b": {
        "name": "Create Technical Documents From Complex Scripts",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5b-0",
                "official_name": "CODE_BLOCK_ONE_1001",
                "name": "CODE_BLOCK_ONE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af54": {
        "name": "Python Robust Error Handling Code",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af54-0",
                "official_name": "TEST_3_FIELD_1001",
                "name": "TEST_3_FIELD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af54-1",
                "official_name": "TEST_2_FIELD_1001",
                "name": "TEST_2_FIELD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af54-2",
                "official_name": "TEST_1_FIELD_1001",
                "name": "TEST_1_FIELD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af56": {
        "name": "LSI Variation With Specifics (Fine Tuned)",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af56-0",
                "official_name": "KEYWORD_TYPE_OPTIONS_1001",
                "name": "KEYWORD_TYPE_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af56-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af56-2",
                "official_name": "IDEAL_CLIENT_1001",
                "name": "IDEAL_CLIENT_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af56-3",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af56-4",
                "official_name": "INDUSTRY_NAME_1002",
                "name": "INDUSTRY_NAME_1002",
                "data_type": "both",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af60": {
        "name": "School paper outline",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af60-0",
                "official_name": "WRITING_PERSPECTIVE_1001",
                "name": "WRITING_PERSPECTIVE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-1",
                "official_name": "CLASS_1001",
                "name": "CLASS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-2",
                "official_name": "ADDITIONAL_KEY_POINTS_1001",
                "name": "ADDITIONAL_KEY_POINTS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-3",
                "official_name": "LENGTH_IN_PAGES_1001",
                "name": "LENGTH_IN_PAGES_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-4",
                "official_name": "STRUCTURE_GUIDELINES_1001",
                "name": "STRUCTURE_GUIDELINES_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-5",
                "official_name": "TOPIC_1001",
                "name": "TOPIC_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af60-6",
                "official_name": "PAPER_TYPE_1001",
                "name": "PAPER_TYPE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af44": {
        "name": "AIProg Automated Django Debugger",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af44-0",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af44-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af44-2",
                "official_name": "TELL_ME_A_STORY_1001",
                "name": "TELL_ME_A_STORY_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af44-3",
                "official_name": "MY_VARIABLE_1001",
                "name": "MY_VARIABLE_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af44-4",
                "official_name": "LENGTH_IN_PAGES_1001",
                "name": "LENGTH_IN_PAGES_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af44-5",
                "official_name": "TOPIC_1001",
                "name": "TOPIC_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af49": {
        "name": "No Call Test",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af49-0",
                "official_name": "SYSTEM_TEST_OPTIONS_1001",
                "name": "SYSTEM_TEST_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4e": {
        "name": "Keyword Categorization Master App",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4e-0",
                "official_name": "KEYWORD_LIST_1001",
                "name": "KEYWORD_LIST_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af4f": {
        "name": "50 Near-Decision Keywords From Primary Keyword",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af4f-0",
                "official_name": "PRIMARY_KEYWORD_OR_KEYWORD_LIST_1001",
                "name": "PRIMARY_KEYWORD_OR_KEYWORD_LIST_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af50": {
        "name": "Question Recipe Match Assessment",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af50-0",
                "official_name": "RECIPE_VARIABLES_1001",
                "name": "RECIPE_VARIABLES_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6618283c8b434eb62211af50-1",
                "official_name": "ANY_QUESTION_1001",
                "name": "ANY_QUESTION_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6618283c8b434eb62211af5c": {
        "name": "Business Requirements From Technical Documents",
        "brokers": [
            {
                "id": "6618283c8b434eb62211af5c-0",
                "official_name": "TECHNICAL_REQUIREMENTS_1001",
                "name": "TECHNICAL_REQUIREMENTS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6619743e9f1c9b7a90c7fce5": {
        "name": "LSI Variations Mongo",
        "brokers": [
            {
                "id": "6619743e9f1c9b7a90c7fce5-0",
                "official_name": "KEYWORD_TYPE_OPTIONS_1001",
                "name": "KEYWORD_TYPE_OPTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6619743e9f1c9b7a90c7fce5-1",
                "official_name": "CUSTOM_INSTRUCTIONS_1001",
                "name": "CUSTOM_INSTRUCTIONS_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6619743e9f1c9b7a90c7fce5-2",
                "official_name": "IDEAL_CLIENT_1001",
                "name": "IDEAL_CLIENT_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6619743e9f1c9b7a90c7fce5-3",
                "official_name": "PRIMARY_KEYWORD_1001",
                "name": "PRIMARY_KEYWORD_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "6619743e9f1c9b7a90c7fce5-4",
                "official_name": "INDUSTRY_NAME_1002",
                "name": "INDUSTRY_NAME_1002",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661cab592ee88fc436f84d3a": {
        "name": "Get Hiring Details for Tech Position (Generic)",
        "brokers": [
            {
                "id": "661cab592ee88fc436f84d3a-0",
                "official_name": "TECH_POSITION_NAME_1001",
                "name": "TECH_POSITION_NAME_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "661cab592ee88fc436f84d3a-1",
                "official_name": "POSITION_DETAILS_1001",
                "name": "POSITION_DETAILS_1001",
                "data_type": "both",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661d6400c565c9662e212542": {
        "name": "Get Hiring Details for Tech Position (Generic)",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661dbee706e4c98b3f46fdd7": {
        "name": "Get recipe Name, Description and Tag Suggestions",
        "brokers": [
            {
                "id": "661dbee706e4c98b3f46fdd7-0",
                "official_name": "MESSAGES_1001",
                "name": "MESSAGES_1001",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661dbf87cc4792b91faf3653": {
        "name": "Get questions and detailed multiple-choice options for a tech job posting.",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661fb50502931a24595a33e6": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "661fb50502931a24595a33e6-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "661feba2106c7b1ad5054f29": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "661feba2106c7b1ad5054f29-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620313bd28beeff8234664a": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620313bd28beeff8234664a-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620487f1c18f50e80f679d4": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620487f1c18f50e80f679d4-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662048a3092315eb7f8a6b21": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "662048a3092315eb7f8a6b21-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662048cd2c48fadd3859637b": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "662048cd2c48fadd3859637b-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620793063b3f07a5c2fc5b7": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620793063b3f07a5c2fc5b7-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66207ffedc06c4f712ddd7d8": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66207ffedc06c4f712ddd7d8-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208051ef5649571f41587c": {
        "name": "Get questions and detailed multiple-choice options for a tech job posting.",
        "brokers": [
            {
                "id": "66208051ef5649571f41587c-0",
                "official_name": "React Developer",
                "name": "React Developer",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208189e30557cd01c6e939": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208189e30557cd01c6e939-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620857817e394f1b77c8f80": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620857817e394f1b77c8f80-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620859bc3ac2c7e3dee22a6": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620859bc3ac2c7e3dee22a6-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208708e4e41f578e648810": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208708e4e41f578e648810-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620886f61c127c14bcdd770": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620886f61c127c14bcdd770-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208b520dd417461d592a76": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208b520dd417461d592a76-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208c06be770bb8cb1fd044": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208c06be770bb8cb1fd044-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208dba3dfb8375280ab43c": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208dba3dfb8375280ab43c-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208e0c6ed2204fd189a2a4": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208e0c6ed2204fd189a2a4-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208e3c5a533965380b4a34": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "66208e3c5a533965380b4a34-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66208ffa9971fd47be8bb237": {
        "name": "Get a list of questions about a freelancer posting with just a title",
        "brokers": [
            {
                "id": "66208ffa9971fd47be8bb237-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662094f83d03f2ebaa2c74d0": {
        "name": "test",
        "brokers": [
            {
                "id": "662094f83d03f2ebaa2c74d0-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620972a659da114be033413": {
        "name": "test2",
        "brokers": [
            {
                "id": "6620972a659da114be033413-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6620972a659da114be033414": {
        "name": "Get a list of things to include in a freelancer marketplace posting.",
        "brokers": [
            {
                "id": "6620972a659da114be033414-0",
                "official_name": "PROJECT_TYPE",
                "name": "PROJECT_TYPE",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662182a34678ac6f11f81753": {
        "name": "Get a list of the highest authority sites for any topic.",
        "brokers": [
            {
                "id": "662182a34678ac6f11f81753-0",
                "official_name": "TOPIC_NAME",
                "name": "TOPIC_NAME",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66218461494125e7080233e9": {
        "name": "Router AI 4.",
        "brokers": [
            {
                "id": "66218461494125e7080233e9-0",
                "official_name": "TASK_FROM_USER",
                "name": "TASK_FROM_USER",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662185caf91cdcfe009650ab": {
        "name": "Router 4B",
        "brokers": [
            {
                "id": "662185caf91cdcfe009650ab-0",
                "official_name": "TASK_FROM_USER",
                "name": "TASK_FROM_USER",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "662185caf91cdcfe009650ac": {
        "name": "Router AI 4.",
        "brokers": [
            {
                "id": "662185caf91cdcfe009650ac-0",
                "official_name": "TASK_FROM_USER",
                "name": "TASK_FROM_USER",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "66218671bfcd77bf3f6f3938": {
        "name": "AI Grader.",
        "brokers": [
            {
                "id": "66218671bfcd77bf3f6f3938-0",
                "official_name": "RESULT_1",
                "name": "RESULT_1",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "66218671bfcd77bf3f6f3938-1",
                "official_name": "TASK_DETAILS",
                "name": "TASK_DETAILS",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            },
            {
                "id": "66218671bfcd77bf3f6f3938-2",
                "official_name": "RESULT_2",
                "name": "RESULT_2",
                "data_type": "placeholder",
                "required": true,
                "default_value": null,
                "ready": "True"
            }
        ],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6621c795debd18634e6e7e84": {
        "name": "AI Grader With Grading Rubric",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    },
    "6621cccabd5cf9754ba8acb6": {
        "name": "Get questions and detailed multiple-choice options for a tech job posting.",
        "brokers": [],
        "default_overrides": {
            "model_override": "",
            "processor_overrides": "{}",
            "other_overrides": "{}"
        }
    }
};

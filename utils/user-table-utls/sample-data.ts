export const sampleData = {
    "p_table_name": "Flashcards",
    "p_description": "Educational flashcards with questions, answers, and supporting content",
    "p_is_public": false,
    "p_authenticated_read": true,
    "p_initial_fields": [
      {
        "field_name": "order",
        "display_name": "Order",
        "data_type": "number",
        "field_order": 1,
        "is_required": true,
        "default_value": 0
      },
      {
        "field_name": "topic",
        "display_name": "Topic",
        "data_type": "string",
        "field_order": 2,
        "is_required": false
      },
      {
        "field_name": "lesson",
        "display_name": "Lesson",
        "data_type": "string",
        "field_order": 3,
        "is_required": false
      },
      {
        "field_name": "gradeLevel",
        "display_name": "Grade Level",
        "data_type": "number",
        "field_order": 4,
        "is_required": false
      },
      {
        "field_name": "front",
        "display_name": "Question (Front)",
        "data_type": "string",
        "field_order": 5,
        "is_required": true
      },
      {
        "field_name": "back",
        "display_name": "Answer (Back)",
        "data_type": "string",
        "field_order": 6,
        "is_required": true
      },
      {
        "field_name": "example",
        "display_name": "Example",
        "data_type": "string",
        "field_order": 7,
        "is_required": false
      },
      {
        "field_name": "detailedExplanation",
        "display_name": "Detailed Explanation",
        "data_type": "string",
        "field_order": 8,
        "is_required": false
      },
      {
        "field_name": "audioExplanation",
        "display_name": "Audio Explanation",
        "data_type": "string",
        "field_order": 9,
        "is_required": false
      },
      {
        "field_name": "relatedImages",
        "display_name": "Related Images",
        "data_type": "array",
        "field_order": 10,
        "is_required": false,
        "default_value": []
      },
      {
        "field_name": "personalNotes",
        "display_name": "Personal Notes",
        "data_type": "string",
        "field_order": 11,
        "is_required": false
      },
      {
        "field_name": "isDeleted",
        "display_name": "Is Deleted",
        "data_type": "boolean",
        "field_order": 12,
        "is_required": false,
        "default_value": false
      },
      {
        "field_name": "dynamicContent",
        "display_name": "Dynamic Content",
        "data_type": "json",
        "field_order": 13,
        "is_required": false,
        "default_value": []
      },
      {
        "field_name": "tags",
        "display_name": "Tags",
        "data_type": "array",
        "field_order": 14,
        "is_required": false,
        "default_value": []
      }
    ]
  }
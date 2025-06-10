// registeredFunctions added on 2025-06-04 09:53:37
export const registeredFunctions = [
    {
      id: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
      name: "Process Markdown",
      return_broker: "8c221702-cc7a-4d5a-a940-305454f3d6df",
      args: [
        {
          name: "markdown_content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "clean_markdown",
          required: false,
          data_type: "str",
          ready: true,
          default_value: true,
          description: null,
          examples: null
        },
        {
          name: "extract_jsons",
          required: false,
          data_type: "str",
          ready: false,
          default_value: true,
          description: null,
          examples: null
        },
        {
          name: "ignore_line_breaks",
          required: false,
          data_type: "str",
          ready: false,
          default_value: true,
          description: null,
          examples: null
        }
      ],
      description: "Takes markdown content and does a basic classification to return content separated by sections and each line separated by the type of line.",
      category: "Processors",
      node_description: "Process Markdown Content (old)",
      tags: null,
      icon: null
    },
    {
      id: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
      name: "Run One Recipe Twice",
      return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
      args: [
        {
          name: "recipe_id",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "version",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "brokers_with_values_1",
          required: false,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "brokers_with_values_2",
          required: false,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Runs a recipe twice with different broker values and returns both results.\n\n    Args:\n        recipe_id (str): Unique recipe identifier.\n        version (str): Recipe version.\n        brokers_with_values_1 (dict, optional): Broker values for the first run.\n        brokers_with_values_2 (dict, optional): Broker values for the second run.\n\n    Returns:\n        dict: Dictionary with 'recipe_result_1' and 'recipe_result_2' keys containing each recipe execution result.\n\n    Tags:\n        'recipe execution', 'multi-run', 'workflow orchestration'\n        'AI workflow', 'result comparison', 'batch processing', 'data pipeline'\n    ",
      category: "Recipes",
      node_description: "Run the same recipe back to back",
      tags: [
        "recipe execution",
        "multi-run",
        "workflow orchestration' 'AI workflow",
        "result comparison",
        "batch processing",
        "data pipeline"
      ],
      icon: "RotateCcw"
    },
    {
      id: "b870cda8-8789-4189-8ce1-95db7ce09290",
      name: "Process Markdown Make Flat",
      return_broker: "30f69de4-13c9-40f2-9806-ddf4a63776bc",
      args: [
        {
          name: "markdown_content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "method",
          required: false,
          data_type: "str",
          ready: true,
          default_value: "dict_structured",
          description: null,
          examples: null
        }
      ],
      description: "Process markdown and then make the internal structure flat.\n\nReturns:\n{\n        \"source\": \"process_markdown_make_flat\",\n        \"markdown_content\": markdown_content,\n        \"classified_sections\": classified_sections,\n        \"flattened_sections\": flattened_sections,\n    }",
      category: "Processors",
      node_description: "Process Markdown into a flat structure with just text for all values.",
      tags: null,
      icon: null
    },
    {
      id: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
      name: "Process Markdown Extract One With Config",
      return_broker: "37c0abef-4788-4dee-9709-929a193d36d0",
      args: [
        {
          name: "config",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "markdown_content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "method",
          required: false,
          data_type: "str",
          ready: true,
          default_value: "dict_structured",
          description: null,
          examples: null
        }
      ],
      description: "Processes markdown and extracts one item with a config object.\n\nExample Config:\n        {\n            \"section\": \"dict_wrapped_in_list\",\n            \"path\": [2, \"name\"],\n            \"output_type\": \"single\",\n            \"section_index\": 0,  # Explicitly target the first dict_wrapped_in_list\n        }\n\nReturns:\n{\n        \"source\": \"process_markdown_extract_with_config\",\n        \"markdown_content\": markdown_content,\n        \"classified_sections\": flattener_results[\"classified_sections\"],\n        \"flattened_sections\": flattener_results[\"flattened_sections\"],\n        \"status\": data[\"status\"],\n        \"output\": data[\"output\"],\n        \"error\": data[\"error\"],\n    }",
      category: "Extractors",
      node_description: "Process markdown and extract a single item using configurations.",
      tags: null,
      icon: null
    },
    {
      id: "88324112-a108-4a27-94bd-671fef2c184d",
      name: "Process Markdown Extract Multiple Items with Configs",
      return_broker: "2ca25554-0db3-47e6-81c1-80b3d792b1c6",
      args: [
        {
          name: "configs",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "markdown_content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "method",
          required: false,
          data_type: "str",
          ready: true,
          default_value: "dict_structured",
          description: null,
          examples: null
        }
      ],
      description: "Process markdown and extract multiple items with an array of configs.\n\nExample configs array:\n    configs = [\n        {\n            \"section\": \"dict_wrapped_in_list\",\n            \"path\": [2, \"name\"],\n            \"output_type\": \"single\",\n            \"section_index\": 0,  # Explicitly target the first dict_wrapped_in_list\n        },\n        {\n            \"section\": \"dict_wrapped_in_list\",\n            \"path\": [],\n            \"output_type\": \"list\",\n            \"fields\": [\"name\"],\n            \"section_index\": 1,  # Target the second dict_wrapped_in_list\n        },\n        {\"section\": \"checklist\", \"path\": [], \"output_type\": \"list\"},\n        {\"section\": \"header_with_list\", \"path\": [3], \"output_type\": \"single\", \"filter\": {\"App Name\": \"LaundryGenie\"}},\n    ]\n\nReturns:\n{\n        \"source\": \"process_markdown_extract_with_multiple_configs\",\n        \"markdown_content\": markdown_content,\n        \"classified_sections\": flattener_results[\"classified_sections\"],\n        \"flattened_sections\": flattener_results[\"flattened_sections\"],\n        \"all_extracted_data\": data,\n    }\n\n\"data\" has status, output, and error keys.",
      category: "Extractors",
      node_description: "Process Markdown and directly extract multiple items",
      tags: null,
      icon: null
    },
    {
      id: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
      name: "Process Markdown With Dynamic Extraction",
      return_broker: "9fb9b7e5-c0bd-4e85-b606-21d05550842c",
      args: [
        {
          name: "extraction_function_str",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "markdown_content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "method",
          required: false,
          data_type: "str",
          ready: true,
          default_value: "dict_structured",
          description: null,
          examples: null
        }
      ],
      description: "Processes markdown and flattens it, then executes a dynamic extraction function which is provided as a string.\n\nSample Extraction Function:\n\"\"\"\ndef extract(data):\n    for section in data:\n        if section['section'] == 'dict_wrapped_in_list':\n            return section['content'][2]['name']\n    return None\n\"\"\"\n\n\nReturns:\n{\n        \"source\": \"process_markdown_extract_with_dynamic_extraction\",\n        \"markdown_content\": markdown_content,\n        \"classified_sections\": classified_sections,\n        \"flattened_sections\": flattened_sections,\n        \"final_result\": final_result,\n    }",
      category: "Extractors",
      node_description: "Process Markdown and use a dynamic function to extract anything, anywhere!",
      tags: null,
      icon: null
    },
    {
      id: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
      name: "Run Recipe",
      return_broker: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
      args: [
        {
          name: "recipe_id",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "version",
          required: false,
          data_type: "int",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "model_override",
          required: false,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "tools_override",
          required: false,
          data_type: "list",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "latest_version",
          required: false,
          data_type: "bool",
          ready: true,
          default_value: true,
          description: null,
          examples: null
        },
        {
          name: "recipe_brokers",
          required: true,
          data_type: "list",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "Runs a recipe and returns the results which is either a results object which includes the content and metadata, including the classified flat structure.\n\nReturns:\n{\n     \"status\": \"success\",\n     \"response\": response.content,\n     \"metadata\": response.metadata,\n }",
      category: "Recipes",
      node_description: "Execute a single recipe",
      tags: null,
      icon: "Brain"
    },
    {
      id: "e2cee96c-85a6-42a6-975d-43a9bb4645a1",
      name: "Enhanced Bookmark Extraction",
      return_broker: "3aefc1fd-3334-4574-9a88-7e5da2486358",
      args: [
        {
          name: "results_object",
          required: true,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "enhanced_bookmarks",
          required: true,
          data_type: "list",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Extracts values from a data dictionary using user-defined bookmark paths.\n\n    Args:\n        results_object (dict): Source dictionary with data to extract.\n        enhanced_bookmarks (list): List of dicts, each with 'name' (str) and 'path' (list of keys/indices).\n\n    Returns:\n        dict: Maps bookmark names to extracted values for each bookmark in enhanced_bookmarks.\n              Raises ValueError with details if extraction for any bookmark fails.\n\n    Tags:\n        'value extraction', 'data lookup', 'custom bookmarks', 'path traversal', 'dictionary navigation', \n        'results mapping', 'content extraction', 'automation', 'bookmark utilities'\n    ",
      category: "Extractors",
      node_description: "Use an auto-generated 'bookmark' to get the exact data you need from an object.",
      tags: [
        "value extraction",
        "data lookup",
        "custom bookmarks",
        "path traversal",
        "dictionary navigation",
        "results mapping",
        "content extraction",
        "automation",
        "bookmark utilities"
      ],
      icon: null
    },
    {
      id: "75e7f006-ed37-4e0f-a7b4-92e14f9340cb",
      name: "Orchestrate Text Operations From Dict",
      return_broker: "a7ad595c-9697-4a58-b9ab-eeeab28dd1bf",
      args: [
        {
          name: "dict_content",
          required: true,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "from_dict_key",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "instructions",
          required: true,
          data_type: "list",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Runs a series of text operations on a dictionary value, as specified by instructions, and returns the final processed string.\n\n    Args:\n        dict_content (dict): Dictionary containing text entries to process.\n        from_dict_key (str): Key identifying which dictionary value to process.\n        instructions (list): Ordered list of instruction dicts, each with an 'operation' name and optional 'params'.\n\n    Returns:\n        str: The final string after all operations are sequentially applied to the selected dictionary value.\n\n    Tags:\n        'text processing', 'sequential operations', 'string manipulation', 'batch processing', \n        'workflow orchestration', 'pipeline', 'dictionary utilities', 'content transforms', \n        'instruction execution', 'error handling'\n    ",
      category: "Extractors",
      node_description: "Use a variety of text manipulation utilities in series to get the exact text you want from a string inside of an object using a root-level key.",
      tags: [
        "text processing",
        "sequential operations",
        "string manipulation",
        "batch processing",
        "workflow orchestration",
        "pipeline",
        "dictionary utilities",
        "content transforms",
        "instruction execution",
        "error handling"
      ],
      icon: "ArrowLeftRight"
    },
    {
      id: "06d788e1-906e-4601-b112-bda6d2152f26",
      name: "Run One Recipe Twice Concurrently",
      return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
      args: [
        {
          name: "recipe_id",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "version",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "model_override",
          required: true,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "brokers_with_values_1",
          required: false,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "brokers_with_values_2",
          required: false,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Runs a recipe twice in parallel with two sets of broker values and returns both results.\n\n    Args:\n        recipe_id (str): ID of the recipe to run.\n        version (str): Version of the recipe.\n        model_override (dict): Model override parameters.\n        brokers_with_values_1 (dict, optional): Broker values for the first run.\n        brokers_with_values_2 (dict, optional): Broker values for the second run.\n\n    Returns:\n        dict: A dictionary with keys 'recipe_result_1' and 'recipe_result_2', \n              each containing the output from running the recipe with the respective broker values.\n\n    Tags:\n        'concurrent execution', 'recipe processing', 'parallel tasks', 'workflow automation', \n        'data processing', 'result comparison', 'automation', 'task orchestration'\n    ",
      category: "Recipes",
      node_description: "Execute the same recipe twice with different settings",
      tags: [
        "concurrent execution",
        "recipe processing",
        "parallel tasks",
        "workflow automation",
        "data processing",
        "result comparison",
        "automation",
        "task orchestration"
      ],
      icon: "GitBranch"
    },
    {
      id: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
      name: "Full Markdown Classifier",
      return_broker: "490abd8a-bb15-4ce3-b709-623906bc08de",
      args: [
        {
          name: "text_data",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "remove_line_breaks",
          required: false,
          data_type: "bool",
          ready: false,
          default_value: true,
          description: null,
          examples: null
        },
        {
          name: "remove_thematic_breaks",
          required: false,
          data_type: "bool",
          ready: false,
          default_value: true,
          description: null,
          examples: null
        },
        {
          name: "rules_override",
          required: false,
          data_type: "dict",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "core_broker_id",
          required: false,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "session_manager",
          required: false,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Classifies sections in markdown text and returns structured information about them.\n\n    Args:\n        text_data (str): The markdown text to analyze.\n        remove_line_breaks (bool, optional): Whether to remove line breaks. Defaults to True.\n        remove_thematic_breaks (bool, optional): Whether to remove thematic breaks. Defaults to True.\n        rules_override (dict, optional): Custom rules for sectioning. Defaults to None.\n        core_broker_id (str, optional): Reference ID for session storage. Defaults to None.\n        session_manager (optional): Manager for storing results in session. Defaults to None.\n\n    Returns:\n        dict: Dictionary with keys:\n              - 'markdown_text': the input markdown.\n              - 'lines': list of classified lines/sections.\n              - 'sections': processed section data.\n              - 'section_texts': extracted text for each section.\n\n    Tags:\n        'markdown analysis', 'section classifier', 'text processing', 'document structuring', 'content extraction', \n        'markdown parsing', 'section handling', 'session storage', 'document analysis', 'content organization'\n    ",
      category: "Processors",
      node_description: "Processes and classifies markdown content into many  different structures",
      tags: [
        "markdown analysis",
        "section classifier",
        "text processing",
        "document structuring",
        "content extraction",
        "markdown parsing",
        "section handling",
        "session storage",
        "document analysis",
        "content organization"
      ],
      icon: "FileText"
    },
    {
      id: "b42d270b-0627-453c-a4bb-920eb1da6c51",
      name: "Orchestrate Text Operations",
      return_broker: "2c5e85c9-a81a-472c-a7bc-d060766244ec",
      args: [
        {
          name: "content",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "instructions",
          required: true,
          data_type: "list",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Applies a sequence of text operations on content as specified by instructions.\n\n    Args:\n        content (str): The input text to be modified.\n        instructions (list): A list of dicts each specifying an 'operation' and 'params' for text processing.\n\n    Returns:\n        str: The modified text after applying all specified operations in order. \n             Raises error if operation is unsupported, fails, or returns an empty result.\n\n    Tags:\n        'text processing', 'batch operations', 'string manipulation', 'workflow automation', 'content transformation', 'marker operations', 'instruction pipeline', 'orchestration'\n    ",
      category: "Extractors",
      node_description: "Use a variety of text manipulation utilities in series to get the exact text you want from string content.",
      tags: [
        "text processing",
        "batch operations",
        "string manipulation",
        "workflow automation",
        "content transformation",
        "marker operations",
        "instruction pipeline",
        "orchestration"
      ],
      icon: "ArrowRightLeft"
    },
    {
      id: "eeba4355-ccd2-4a53-95cf-fc5a2d3ca079",
      name: "Generate Flux Images",
      return_broker: "00adb856-38c7-4573-b88d-349f4dcc43f3",
      args: [
        {
          name: "prompt",
          required: true,
          data_type: "str",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        },
        {
          name: "model",
          required: false,
          data_type: "str",
          ready: false,
          default_value: "black-forest-labs/FLUX.1-kontext-pro",
          description: null,
          examples: null
        },
        {
          name: "width",
          required: false,
          data_type: "int",
          ready: false,
          default_value: 768,
          description: null,
          examples: null
        },
        {
          name: "height",
          required: false,
          data_type: "int",
          ready: false,
          default_value: 768,
          description: null,
          examples: null
        },
        {
          name: "steps",
          required: false,
          data_type: "int",
          ready: false,
          default_value: 20,
          description: null,
          examples: null
        },
        {
          name: "count",
          required: false,
          data_type: "int",
          ready: false,
          default_value: 1,
          description: null,
          examples: null
        },
        {
          name: "seed",
          required: false,
          data_type: "int",
          ready: false,
          default_value: null,
          description: null,
          examples: null
        }
      ],
      description: "\n    Generates one or more images from a prompt using a specified model and image parameters.\n\n    Args:\n        prompt (str): The text prompt for image generation.\n        model (str): Name of the image generation model. Defaults to the recommended model.\n        width (int): Image width in pixels (adjusted to multiple of 32).\n        height (int): Image height in pixels (adjusted to multiple of 32).\n        steps (int): Number of generation steps. (1-40)\n        count (int): Number of images to generate. (1-4)\n        seed (int, optional): Random seed for reproducibility.\n\n    Returns:\n        dict: Contains 'success' (bool), 'full_response' (original API response object), and 'image_urls' (list of URLs to generated images).\n\n    Tags:\n        'image generation', 'AI art', 'prompt-to-image', 'text-to-image', 'image synthesis', 'multi-image generation', 'image API', 'model selection', 'creative tools', 'visual content'\n\nAVAILABLE_MODELS = [\n    \"black-forest-labs/FLUX.1-kontext-pro\",\n    \"black-forest-labs/FLUX.1-kontext-max\",\n    \"black-forest-labs/FLUX.1-dev\",\n    \"black-forest-labs/FLUX.1-schnell\",\n]\n",
      category: "Media",
      node_description: "Generate beautiful images with Flux Image Generation",
      tags: [
        "image generation",
        "AI art",
        "prompt-to-image",
        "text-to-image",
        "image synthesis",
        "multi-image generation",
        "image API",
        "model selection",
        "creative tools",
        "visual content"
      ],
      icon: "Wand2"
    }
  ];
  
// redux/features/broker/data.ts

// Just a very small sample set. Most brokers are MUCH MORE complex than these. They include details of size, color, font, and a lot more.
export const brokerData = [
    {
        'id': '0f330db6-6ce8-4865-bc33-188fad2a8dbd',
        'createdAt': '2024-07-20 02:30:24.677997+00',
        'displayName': 'Any Question Input',
        'dataType': 'str',
        'description': 'Enter Any Question...',
        'officialName': 'ANY_QUESTION_1001',
        'componentType': 'Textarea',
        'validationRules': {
            'pattern': ''
        },
        'tooltip': 'Write Any Question or Task (Works better for questions, but works for tasks as well)',
        'sampleEntries': null,
        'userId': null,
        'additionalParams': {
            'order': 1,
            'source': 'user_input',
            'select_options': [],
            'source_params_id': 'ANY_QUESTION_1001',
            'source_params_default': null
        },
        'defaultValue': '',
        'uid': null,
        'ready': true,
        'matrixId': null
    },
    {
        'id': '94a6c711-aa3f-4ec0-a73b-a2833929ed8a',
        'createdAt': '2024-07-20 02:30:26.189098+00',
        'displayName': 'Keyword List Input',
        'dataType': 'str',
        'description': '',
        'officialName': 'KEYWORD_LIST_1001',
        'componentType': 'Textarea',
        'validationRules': {
            'pattern': '',
            'maxLength': 255,
            'minLength': 0
        },
        'tooltip': 'Enter or paste a list of keywords...',
        'sampleEntries': null,
        'userId': null,
        'additionalParams': {
            'order': 1,
            'source': 'database',
            'select_options': [],
            'source_params_id': 'KEYWORD_LIST_1001',
            'source_params_default': null
        },
        'defaultValue': null,
        'uid': null,
        'ready': true,
        'matrixId': null
    },
    {
        'id': 'cd884e2a-62c6-46f4-98c0-243dabc6def0',
        'createdAt': '2024-07-20 02:30:26.372162+00',
        'displayName': 'Department or Division',
        'dataType': 'str',
        'description': 'Please enter your department or division...',
        'officialName': 'DEPARTMENT_DIVISION_1283',
        'componentType': 'SELECT',
        'validationRules': {},
        'tooltip': 'If you are not sure what to select, just type the first few letters of your department or division and select from the list.',
        'sampleEntries': null,
        'userId': 'public',
        'additionalParams': {
            'order': 0,
            'source': 'user_input',
            'select_options': ['Human Resources', 'Finance', 'Information Technology', 'Marketing', 'Sales', 'Operations', 'Customer Service', 'Research and Development', 'Legal', 'Other: Enter Below'],
            'source_params_id': '',
            'source_params_default': null
        },
        'defaultValue': '',
        'ready': true,
        'uid': '867da3d1-d73a-42f9-b3f0-719f4c27654d',
        'matrixId': 'a1b908df-2270-42f6-b5f4-5d0fe0cf49b0'
    },
    {
        'id': '7c496083-a696-4b9c-b528-e8880c324703',
        'createdAt': '2024-07-20 02:30:24.677997+00',
        'displayName': 'Ask me anything',
        'dataType': 'str',
        'description': 'Enter Any Question...',
        'officialName': 'SPECIFIC_QUESTION_OR_TASK_1001',
        'componentType': 'Textarea',
        'validationRules': {
            'pattern': ''
        },
        'tooltip': 'Write Any Question or Task (Works better for questions, but works for tasks as well)',
        'sampleEntries': null,
        'userId': null,
        'additionalParams': {
            'order': 3,
            'source': 'user_input',
            'select_options': [],
            'source_params_id': 'SPECIFIC_QUESTION_OR_TASK_1001',
            'source_params_default': null
        },
        'defaultValue': '',
        'ready': true,
        'uid': null,
        'matrixId': null
    },
    {
        'id': 'f640852d-fe1f-493f-94cb-417690d8f66b',
        'createdAt': '2024-07-20 02:30:26.372162+00',
        'displayName': 'What is your relationship to me?',
        'dataType': 'str',
        'description': 'Your personal relationship, such as daughter, son, nephew, niece, etc.',
        'officialName': 'RELATIONSHIP_1001',
        'componentType': 'SELECT',
        'validationRules': {},
        'tooltip': 'Please tell me what our relationship is. I am getting old and I tend to forget things these days...',
        'sampleEntries': null,
        'userId': 'public',
        'additionalParams': {
            'order': 0,
            'source': 'user_input',
            'select_options': ['Daughter', 'Son', 'Nephew', 'Niece', 'Granddaughter', 'Grandson', 'Cousin', 'Friend', 'Other: Enter Below'],
            'defaultValue': 'Daughter',
            'source_params_id': '',
            'source_params_default': 'Grandson'
        },
        'defaultValue': 'Son',
        'ready': true,
        'uid': '867da3d1-d73a-42f9-b3f0-719f4c27654d',
        'matrixId': 'a1b908df-2270-42f6-b5f4-5d0fe0cf49b0'
    },
    {
        'id': 'f9c30c75-441c-4085-8e3a-6b1d96af7022',
        //'createdAt': '2024-07-20 02:30:26.372162+00',
        'displayName': 'Country',
        'dataType': 'str',
        //'description': 'Enter any country',
        'officialName': 'COUNTRY_1001',
        'componentType': 'TextInput',
        'validationRules': {},
        //'tooltip': 'Please tell me what our relationship is. I am getting old and I tend to forget things these days...',
        //'sampleEntries': null,
        //'userId': 'public',
        //'additionalParams': {},
        //'defaultValue': '',
        'ready': true,
        //'uid': '867da3d1-d73a-42f9-b3f0-719f4c27654d',
        'matrixId': 'a1b908df-2270-42f6-b5f4-5d0fe0cf49b0'
    },
    {
        'id': 'CODE_BLOCK_ONE_1001',
        'displayName': 'Code Block',
        'dataType': 'str',
        'officialName': 'CODE_BLOCK_ONE_1001',
        'componentType': 'TextInput',
        'ready': true,
        'matrixId': 'a1b908df-2270-42f6-b5f4-5d0fe0cf49b0'
    }

]


export const plainPromptData = {
    "name": "Plain Prompt Example",
    "description": "",
    "messages": [
      {
        "role": "system",
        "content": "You're a very helpful assistant"
      },
      {
        "role": "user",
        "content": "A placeholder message where the user asks for something, with {{some_option}}.\n\nThen, has some {{specific_item}} that is also included.\n\nRegardless of what we do here, we'll have the user's custom instructions after this at runtime."
      }
    ],
    "variableDefaults": [
      {
        "name": "some_option",
        "defaultValue": "",
        "customComponent": {
          "type": "radio",
          "options": [
            "option 1",
            "option 2"
          ],
          "allowOther": true
        }
      },
      {
        "name": "specific_item",
        "defaultValue": ""
      }
    ],
    "settings": {
      "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
      "store": true,
      "tools": [],
      "top_p": 1,
      "stream": true,
      "temperature": 0.5,
      "max_tokens": 4096
    }
  };


  export function getPlainPrompt() {
    return plainPromptData;
  }
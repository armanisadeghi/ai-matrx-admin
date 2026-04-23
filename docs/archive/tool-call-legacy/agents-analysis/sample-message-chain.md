

 mercyMessage Chain with a section that will become a content block


```json
[
  {
    "id": "a5078a71-32cf-49ab-bcbc-9b1c214c87f5",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "user",
    "position": 0,
    "status": "active",
    "content": [
      {
        "text": "Hello!\n Can you give me some recommendations for today? Restaurants and events in the area?",
        "type": "text"
      }
    ],
    "created_at": "2026-04-12 07:34:53.424202+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  },
  {
    "id": "62016724-705d-4550-8a45-c618480cb9d4",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "assistant",
    "position": 1,
    "status": "active",
    "content": [
      {
        "id": "gemini_-3181775646507272154",
        "name": "travel_get_location",
        "type": "tool_call",
        "arguments": {}
      }
    ],
    "created_at": "2026-04-12 07:34:53.527373+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  },
  {
    "message_id": "b66329ef-e58c-460c-8762-84671d25ed72",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "created_at": "2026-04-12 07:35:01.167472+00",
    "position": 2,
    "role": "tool",
    "status": "active",
    "payload": [],
    "tool_calls": [
      {
        "output": "{\"city\": \"Miami\"}",
        "status": "completed",
        "call_id": "gemini_-3181775646507272154",
        "is_error": false,
        "metadata": {},
        "arguments": {},
        "tool_name": "travel_get_location",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:54.876642+00:00",
        "error_type": null,
        "message_id": "b66329ef-e58c-460c-8762-84671d25ed72",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "2febafbe-600f-4bfe-bc48-718bda62e1be",
        "error_message": null
      }
    ]
  },

  {
    "id": "400f3dac-0ea3-4377-b687-90177ac8f11b",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "assistant",
    "position": 3,
    "status": "active",
    "content": [
      {
        "id": "gemini_-3241256628588979583",
        "name": "travel_get_weather",
        "type": "tool_call",
        "arguments": {
          "city": "Miami"
        }
      },
      {
        "id": "gemini_-2694891353389532255",
        "name": "travel_get_restaurants",
        "type": "tool_call",
        "arguments": {
          "city": "Miami"
        }
      }
    ],
    "created_at": "2026-04-12 07:35:01.439453+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  },
  {
    "message_id": "db98fcab-b084-4510-8c57-82a5b15f93bd",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "created_at": "2026-04-12 07:35:01.525396+00",
    "position": 4,
    "role": "tool",
    "status": "active",
    "payload": [],
    "tool_calls": [
      {
        "output": "{\"city\": \"Miami\", \"condition\": \"windy\", \"temperature\": 47, \"unit\": \"fahrenheit\"}",
        "status": "completed",
        "call_id": "gemini_-3241256628588979583",
        "is_error": false,
        "metadata": {},
        "arguments": {
          "city": "Miami"
        },
        "tool_name": "travel_get_weather",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:55.891452+00:00",
        "error_type": null,
        "message_id": "db98fcab-b084-4510-8c57-82a5b15f93bd",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "e2a4941d-f658-4917-bc3f-c647ab59756c",
        "error_message": null
      },
      {
        "output": "{\"city\": \"Miami\", \"restaurants\": [\"Casa Mexican Grill\", \"The Mexican Kitchen\", \"Casa American Bistro\"]}",
        "status": "completed",
        "call_id": "gemini_-2694891353389532255",
        "is_error": false,
        "metadata": {},
        "arguments": {
          "city": "Miami"
        },
        "tool_name": "travel_get_restaurants",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:55.891766+00:00",
        "error_type": null,
        "message_id": "db98fcab-b084-4510-8c57-82a5b15f93bd",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "0bd404f3-95d4-42ae-bde6-3f3a6a183979",
        "error_message": null
      }
    ]
  },
  {
    "id": "edc36c7d-4312-47a7-b7bf-8b9b815fcfd2",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "assistant",
    "position": 5,
    "status": "active",
    "content": [
      {
        "id": "gemini_7670597549569683896",
        "name": "travel_get_events",
        "type": "tool_call",
        "arguments": {
          "city": "Miami",
          "weather": "windy"
        }
      },
      {
        "id": "gemini_7848369307822765491",
        "name": "travel_get_activities",
        "type": "tool_call",
        "arguments": {
          "city": "Miami",
          "weather": "windy"
        }
      }
    ],
    "created_at": "2026-04-12 07:35:01.949392+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  },
  {
    "message_id": "d568f093-6fe3-4175-adec-b9aaa9ef23b1",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "created_at": "2026-04-12 07:35:02.04448+00",
    "position": 6,
    "role": "tool",
    "status": "active",
    "payload": [],
    "tool_calls": [
      {
        "output": "{\"city\": \"Miami\", \"weather\": \"windy\", \"events\": [\"Farmers market\", \"Outdoor concert\"]}",
        "status": "completed",
        "call_id": "gemini_7670597549569683896",
        "is_error": false,
        "metadata": {},
        "arguments": {
          "city": "Miami",
          "weather": "windy"
        },
        "tool_name": "travel_get_events",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:57.43563+00:00",
        "error_type": null,
        "message_id": "d568f093-6fe3-4175-adec-b9aaa9ef23b1",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "0c0a3a12-9b6a-4b8e-98ad-d3d8a928ba12",
        "error_message": null
      },
      {
        "output": "{\"city\": \"Miami\", \"weather\": \"windy\", \"activities\": [\"Beach walk\", \"Bike ride\", \"Hiking trail\"]}",
        "status": "completed",
        "call_id": "gemini_7848369307822765491",
        "is_error": false,
        "metadata": {},
        "arguments": {
          "city": "Miami",
          "weather": "windy"
        },
        "tool_name": "travel_get_activities",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:57.435943+00:00",
        "error_type": null,
        "message_id": "d568f093-6fe3-4175-adec-b9aaa9ef23b1",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "70e972da-9b51-4917-bb31-58e606a1ef74",
        "error_message": null
      }
    ]
  },
  {
    "id": "07ebfde0-85d0-4d60-86f9-9e25d35dd2a7",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "assistant",
    "position": 7,
    "status": "active",
    "content": [
      {
        "id": "gemini_1301046591519901670",
        "name": "travel_create_summary",
        "type": "tool_call",
        "arguments": {
          "events": [
            "Farmers market",
            "Outdoor concert"
          ],
          "location": "Miami",
          "activities": [
            "Beach walk",
            "Bike ride",
            "Hiking trail"
          ],
          "restaurants": [
            "Casa Mexican Grill",
            "The Mexican Kitchen",
            "Casa American Bistro"
          ],
          "weather_info": {
            "unit": "fahrenheit",
            "condition": "windy",
            "temperature": 47
          }
        }
      }
    ],
    "created_at": "2026-04-12 07:35:02.502089+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  },
  {
    "message_id": "23172c1b-2ec7-4eca-ba51-8c2712077b54",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "created_at": "2026-04-12 07:35:02.587733+00",
    "position": 8,
    "role": "tool",
    "status": "active",
    "payload": [],
    "tool_calls": [
      {
        "output": "{\"summary\": \"LOCATION: Miami\\nWEATHER: windy at 47\\u00b0F\\n\\nRESTAURANT RECOMMENDATIONS:\\n  - Casa Mexican Grill\\n  - The Mexican Kitchen\\n  - Casa American Bistro\\n\\nACTIVITIES:\\n  - Beach walk\\n  - Bike ride\\n  - Hiking trail\\n\\nLOCAL EVENTS:\\n  - Farmers market\\n  - Outdoor concert\"}",
        "status": "completed",
        "call_id": "gemini_1301046591519901670",
        "is_error": false,
        "metadata": {},
        "arguments": {
          "events": [
            "Farmers market",
            "Outdoor concert"
          ],
          "location": "Miami",
          "activities": [
            "Beach walk",
            "Bike ride",
            "Hiking trail"
          ],
          "restaurants": [
            "Casa Mexican Grill",
            "The Mexican Kitchen",
            "Casa American Bistro"
          ],
          "weather_info": {
            "unit": "fahrenheit",
            "condition": "windy",
            "temperature": 47
          }
        },
        "tool_name": "travel_create_summary",
        "tool_type": "local",
        "created_at": "2026-04-12T07:34:58.967722+00:00",
        "error_type": null,
        "message_id": "23172c1b-2ec7-4eca-ba51-8c2712077b54",
        "duration_ms": 0,
        "source_table": "cx_tool_call",
        "tool_call_id": "8ca847eb-dd99-4729-9ebc-d645b5724f82",
        "error_message": null
      }
    ]
  },
  {
    "id": "46540568-b9ab-4e48-81f9-649f40a801c8",
    "conversation_id": "30cd37bc-c912-461b-943e-06a147f0403c",
    "role": "assistant",
    "position": 9,
    "status": "active",
    "content": [
      {
        "text": "",
        "type": "thinking",
        "metadata": {},
        "provider": "google",
        "signature": "EjQKMgG+Pvb7FKjlVZziZfgeMy7DpZ6kfQPKx6DGf2jFLm8SSN3ivj19cNtAvIRy+OwuNsSz",
        "signature_encoding": "base64"
      },
      {
        "text": "Hi there! I've put together some recommendations for you in Miami today. Since it's a bit windy and 47°F, you might want to bring a jacket if you head out for any of the outdoor activities.\n\n### **Weather Update**\n*   **Condition:** Windy\n*   **Temperature:** 47°F\n\n### **Dining Options**\n*   **Casa Mexican Grill**\n*   **The Mexican Kitchen**\n*   **Casa American Bistro**\n\n### **Events & Things to Do**\n*   **Events:** Check out the local **Farmers Market** or catch an **Outdoor Concert**.\n*   **Activities:** If you're feeling active despite the wind, consider a **Beach Walk**, a **Bike Ride**, or exploring a **Hiking Trail**.\n\nI know you also said you want to memorize some facts before you arrive so let me come up with some good ones.",
        "type": "text"
      },
      {
        "text": "**Assessing the Prompt**\n\nI've started by meticulously dissecting the request. My focus is now on the prompt's core elements: the topic of Miami travel tips for first-timers, the task of generating ten flashcards, and the conditional requirement to preface this with advice about memorization. This phase is crucial for ensuring a precise and effective response.",
        "type": "thinking",
        "metadata": {},
        "provider": "google"
      },
      {
        "text": "\n\n\n**Generating the Flashcards**\n\nI'm now generating the flashcards, paying close attention to the requested format. I've compiled the initial list of ten key Miami tips, focusing on language, transportation, weather, tipping, and geography, including the fact that Miami Beach is separate from mainland Miami. Traffic is also a factor. I'll make sure each card is concise and helpful.",
        "type": "thinking",
        "metadata": {},
        "provider": "google"
      },
      {
        "text": "",
        "type": "thinking",
        "metadata": {},
        "provider": "google",
        "signature": "EqEVCp4VAb4+9v--REMOVED FOR BREVITY--+Ma43bcDYPNg56a1",
        "signature_encoding": "base64"
      },
      {
        "text": "\n\n\nNow that you have the recommendations set for today, maybe it's a good idea to memorize a few key facts before visiting Miami! While you don't need to memorize a textbook, committing some basic logistical and cultural details to memory—such as how tipping works there, the geography of the city, and transportation norms—will save you money, keep you safe, and prevent a lot of frustration during your trip. \n\nHere are 10 flashcards covering the most important things to know for your first visit:\n\n<flashcards>\n\n---\n\nFront: What language is widely spoken in Miami and heavily influences the local culture?\nBack: Spanish. In many neighborhoods (like Little Havana or Hialeah), it is the primary language, though English is understood in all tourist areas.\n\n---\n\nFront: How does tipping work at many Miami restaurants?\nBack: Many restaurants automatically add an 18% to 20% gratuity (service charge) to the bill. Always check your receipt so you don't accidentally tip twice!\n\n---\n\nFront: What is the geographical difference between \"Miami\" and \"Miami Beach\"?\nBack: Miami is the mainland city (downtown, Wynwood, Brickell). Miami Beach (which includes South Beach) is a separate barrier island connected to the mainland by bridges (causeways).\n\n---\n\nFront: What is the best way to get around Miami?\nBack: \n- Renting a car (though parking is expensive)\n- Ride-share apps (Uber/Lyft)\n- *Note: Public transportation (like the Metrorail/Metromover) is mostly limited to the downtown/Brickell area.*\n\n---\n\nFront: When is hurricane season in Miami?\nBack: June 1st through November 30th. (Summers are also characterized by intense heat, high humidity, and brief daily afternoon thunderstorms).\n\n---\n\nFront: What is the typical dress code in Miami?\nBack: \n- Day: \"Miami Casual\" (swimwear, shorts, flip-flops)\n- Night: Many nightclubs and upscale restaurants have strict dress codes (no shorts, no athletic wear, collared shirts for men).\n\n---\n\nFront: What are the beach warning flags, and why are they important?\nBack: Colored flags on the lifeguard stands indicate water conditions. \n- Green: Calm\n- Yellow: Moderate surf/currents\n- Red: High hazard (strong rip currents)\n- Purple: Dangerous marine life (like jellyfish)\n\n---\n\nFront: What are three distinct must-visit neighborhoods in Miami, each with a different vibe?\nBack: \n- South Beach: Art Deco architecture, beaches, and nightlife\n- Wynwood: Street art, murals, and trendy breweries\n- Little Havana: Cuban culture, food, and cigars\n\n---\n\nFront: What should you expect regarding Miami traffic?\nBack: Traffic is notoriously heavy and aggressive. Expect significant delays during rush hour (7-9 AM and 4-7 PM), especially on the causeways connecting the mainland to Miami Beach.\n\n---\n\nFront: What is the #1 safety precaution regarding Miami's climate?\nBack: Sun protection and hydration. The UV index is extremely high year-round. Apply reef-safe sunscreen frequently and drink plenty of water, even on cloudy days.\n\n---\n\n</flashcards>",
        "type": "text"
      }
    ],
    "created_at": "2026-04-12 07:35:02.863368+00",
    "deleted_at": null,
    "metadata": {},
    "content_history": null,
    "source": "user",
    "agent_id": null,
    "is_visible_to_user": true,
    "is_visible_to_model": true,
    "user_content": null
  }
]
```

# Final Text After Parser v2
components/mardown-display/markdown-classification/processors/utils/content-splitter-v2.ts

```
[
  {
    type: "text",
    content: "Now that you have the recommendations set for today, maybe it's a good idea to memorize a few key facts before visiting Miami! While you don't need to memorize a textbook, committing some basic logistical and cultural details to memory—such as how tipping works there, the geography of the city, and transportation norms—will save you money, keep you safe, and prevent a lot of frustration during your trip.\n\nHere are 10 flashcards covering the most important things to know for your first visit:"
  },
  {
    type: "flashcards",
    content: "Front: What language is widely spoken in Miami and heavily influences the local culture?\nBack: Spanish. In many neighborhoods (like Little Havana or Hialeah), it is the primary language, though English is understood in all tourist areas.\n\n---\n\nFront: How does tipping work at many Miami restaurants?\nBack: Many restaurants automatically add an 18% to 20% gratuity (service charge) to the bill. Always check your receipt so you don't accidentally tip twice!\n\n---\n\nFront: What is the geographical difference between \"Miami\" and \"Miami Beach\"?\nBack: Miami is the mainland city (downtown, Wynwood, Brickell). Miami Beach (which includes South Beach) is a separate barrier island connected to the mainland by bridges (causeways).\n\n--REMOVED FOR BREVITY--\n\nFront: What should you expect regarding Miami traffic?\nBack: Traffic is notoriously heavy and aggressive. Expect significant delays during rush hour (7-9 AM and 4-7 PM), especially on the causeways connecting the mainland to Miami Beach.\n\n---\n\nFront: What is the #1 safety precaution regarding Miami's climate?\nBack: Sun protection and hydration. The UV index is extremely high year-round. Apply reef-safe sunscreen frequently and drink plenty of water, even on cloudy days.",
   "metadata": {
      isComplete: true,
      completeCardCount: 5,
      totalCards: 5,
      hasPartialContent: false
    }
  }
]
```

## After FC Parser
/Users/armanisadeghi/code/matrx-admin/components/mardown-display/blocks/flashcards/flashcard-parser.ts

```
{
  flashcards: [
    {
      front: "What language is widely spoken in Miami and heavily influences the local culture?",
      back: "Spanish. In many neighborhoods (like Little Havana or Hialeah), it is the primary language, though English is understood in all tourist areas."
    },
    {
      front: "How does tipping work at many Miami restaurants?",
      back: "Many restaurants automatically add an 18% to 20% gratuity (service charge) to the bill. Always check your receipt so you don't accidentally tip twice!"
    },
    {
      front: "What is the geographical difference between \"Miami\" and \"Miami Beach\"?",
      back: "Miami is the mainland city (downtown, Wynwood, Brickell). Miami Beach (which includes South Beach) is a separate barrier island connected to the mainland by bridges (causeways)."
    },
    {
      front: "What should you expect regarding Miami traffic?",
      back: "Traffic is notoriously heavy and aggressive. Expect significant delays during rush hour (7-9 AM and 4-7 PM), especially on the causeways connecting the mainland to Miami Beach."
    },
    {
      front: "What is the #1 safety precaution regarding Miami's climate?",
      back: "Sun protection and hydration. The UV index is extremely high year-round. Apply reef-safe sunscreen frequently and drink plenty of water, even on cloudy days."
    }
  ],
  isComplete: true,
  partialCard: null
}
```

For tool calls, we can look at the streaming events and use a 'more interesting' tool call for better context:

```json
[
  {
    "event": "phase",
    "data": {
      "phase": "connected"
    }
  },
  {
    "event": "data",
    "data": {
      "type": "conversation_id",
      "conversation_id": "a4e630cb-ed1a-4fb7-a088-9613209f8bc2"
    }
  },
  {
    "event": "record_reserved",
    "data": {
      "db_project": "matrx",
      "table": "cx_conversation",
      "record_id": "a4e630cb-ed1a-4fb7-a088-9613209f8bc2",
      "status": "pending",
      "parent_refs": {},
      "metadata": {}
    }
  },
  {
    "event": "record_reserved",
    "data": {
      "db_project": "matrx",
      "table": "cx_user_request",
      "record_id": "aa81dab4-8b9f-49ca-8a31-170cfee3c531",
      "status": "pending",
      "parent_refs": {
        "conversation_id": "a4e630cb-ed1a-4fb7-a088-9613209f8bc2"
      },
      "metadata": {}
    }
  },
  {
    "event": "phase",
    "data": {
      "phase": "executing"
    }
  },
  {
    "event": "info",
    "data": {
      "code": "tool_executing",
      "system_message": "Executing tool: news_get_headlines",
      "user_message": "Running news_get_headlines...",
      "metadata": {}
    }
  },
  {
    "event": "tool_event",
    "data": {
      "event": "tool_started",
      "call_id": "test_45a17556f3fc",
      "tool_name": "news_get_headlines",
      "timestamp": 1776017176.3182905,
      "message": "Executing News Get Headlines",
      "show_spinner": true,
      "data": {
        "arguments": {
          "country": "us",
          "language": "en"
        }
      }
    }
  },
  {
    "event": "tool_event",
    "data": {
      "event": "tool_completed",
      "call_id": "test_45a17556f3fc",
      "tool_name": "news_get_headlines",
      "timestamp": 1776017176.4679039,
      "message": "Done",
      "show_spinner": false,
      "data": {
        "result": {
          "intro": "Today is Sunday, April 12, 2026. Here are the current top news headlines for US on Sunday, April 12, 2026:",
          "date": "Sunday, April 12, 2026",
          "total_results": 35,
          "articles": [
            {
              "title": "U.S. Forces Start Mine Clearance Mission in Strait of Hormuz - centcom.mil",
              "source": {
                "id": null,
                "name": "Centcom.mil"
              },
              "author": null,
              "description": "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions for clearing mines in the Strait of Hormuz, April 11, as two U.S. Navy guided-missile destroyers conducted operations.",
              "url": "https://www.centcom.mil/MEDIA/PRESS-RELEASES/Press-Release-View/Article/4457220/us-forces-start-mine-clearance-mission-in-strait-of-hormuz/",
              "url_to_image": "https://media.defense.gov/2023/Oct/27/2003329476/1920/1080/0/231028-M-LM779-002.JPG",
              "published_at": "2026-04-11T17:12:32Z",
              "content": "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions for clearing mines in the Strait of Hormuz, April 11, as two U.S. Navy guided-missile destroyers conducted operations. \r\nU… [+725 chars]"
            },
            {
              "title": "Pope Leo XIV blasts ‘delusion of omnipotence’ fueling the US-Israeli war in Iran - AP News",
              "source": {
                "id": "associated-press",
                "name": "Associated Press"
              },
              "author": "Nicole Winfield",
              "description": "Pope Leo XIV has denounced the “delusion of omnipotence” that is fueling the U.S.-Israel war in Iran and demanded political leaders stop and negotiate peace. Saturday's remarks were his strongest condemnation yet. Leo presided over an evening prayer service i…",
              "url": "https://apnews.com/article/pope-leo-usisraeli-war-iran-7309c5df6c7312b942e0510ea65502cb",
              "url_to_image": "https://dims.apnews.com/dims4/default/a3dd4cd/2147483647/strip/true/crop/3183x2121+1+0/resize/980x653!/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Ffc%2F7a%2F34734a8b12ece001c9f6a3fe1a9f%2F256b10eaa30545e7bc224d835279d787",
              "published_at": "2026-04-11T17:07:00Z",
              "content": "ROME (AP) In his strongest words yet, Pope Leo XIV on Saturday denounced the delusion of omnipotence that is fueling the U.S.-Israel war in Iran and demanded political leaders stop and negotiate peac… [+2884 chars]"
            },
            "...[17 more items removed]"
          ]
        }
      }
    }
  },
  {
    "event": "completion",
    "data": {
      "operation": "tool_execution",
      "operation_id": "test_45a17556f3fc",
      "status": "success",
      "result": {
        "model_facing_result": {
          "tool_use_id": "test_45a17556f3fc",
          "call_id": "test_45a17556f3fc",
          "name": "news_get_headlines",
          "content": "{\"intro\": \"Toda...[TRUNCATED]...2660 chars]\"}]}",
          "is_error": false
        },
        "full_result": {
          "success": true,
          "output": {
            "intro": "Today is Sunday, April 12, 2026. Here are the current top news headlines for US on Sunday, April 12, 2026:",
            "date": "Sunday, April 12, 2026",
            "total_results": 35,
            "articles": [
              {
                "title": "U.S. Forces Start Mine Clearance Mission in Strait of Hormuz - centcom.mil",
                "source": {
                  "id": null,
                  "name": "Centcom.mil"
                },
                "author": null,
                "description": "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions for clearing mines in the Strait of Hormuz, April 11, as two U.S. Navy guided-missile destroyers conducted operations.",
                "url": "https://www.centcom.mil/MEDIA/PRESS-RELEASES/Press-Release-View/Article/4457220/us-forces-start-mine-clearance-mission-in-strait-of-hormuz/",
                "url_to_image": "https://media.defense.gov/2023/Oct/27/2003329476/1920/1080/0/231028-M-LM779-002.JPG",
                "published_at": "2026-04-11T17:12:32Z",
                "content": "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions for clearing mines in the Strait of Hormuz, April 11, as two U.S. Navy guided-missile destroyers conducted operations. \r\nU… [+725 chars]"
              },
              "...[18 more items removed]"
            ]
          },
          "error": null,
          "duration_ms": 144,
          "usage": null,
          "child_usages": []
        },
        "conversation_id": "a4e630cb-ed1a-4fb7-a088-9613209f8bc2",
        "cost_estimate": {
          "char_count": 17651,
          "estimated_tokens": 4412,
          "chars_per_token": 4,
          "models": [
            {
              "model": "gemini-3-flash-preview",
              "api": "google",
              "input_price_per_million": 0.5,
              "estimated_cost_usd": 0.002206
            },
            {
              "model": "gpt-5.2",
              "api": "openai",
              "input_price_per_million": 1.75,
              "estimated_cost_usd": 0.007721
            },
            "...[1 more item removed]"
          ]
        },
        "output_schema": {
          "type": "object",
          "properties": {
            "date": {
              "type": "string",
              "description": "Current date formatted (e.g. Monday, February 16, 2026)"
            },
            "intro": {
              "type": "string",
              "description": "Contextual intro message with today's date and country"
            },
            "articles": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "Direct URL to the full article"
                  },
                  "title": {
                    "type": "string",
                    "description": "Article headline"
                  },
                  "author": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "description": "Article author"
                  },
                  "source": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "description": "Source identifier (e.g. bbc-news)"
                      },
                      "name": {
                        "type": "string",
                        "description": "Source display name"
                      }
                    },
                    "description": "Publishing source"
                  },
                  "content": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "description": "Truncated article body text"
                  },
                  "description": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "description": "Brief summary of the article"
                  },
                  "published_at": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "description": "ISO 8601 publication timestamp"
                  },
                  "url_to_image": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "description": "URL to the article thumbnail image"
                  }
                }
              },
              "description": "List of headline articles"
            },
            "total_results": {
              "type": "integer",
              "description": "Total number of results available from the API"
            }
          }
        }
      }
    }
  },
  {
    "event": "end",
    "data": {
      "reason": "complete"
    }
  }
]
```

---

## Tool Call Visualization Pipeline

The streaming events above are consumed by the Redux execution system, which distills them into `ToolCallObject[]` — the data structure that `ToolCallVisualization` and the tool renderer registry operate on.

The key adapter step converts raw streaming events into three canonical object types:
- `mcp_input` — captured when a tool starts executing; carries `name`, `arguments`, and the authoritative `phase` field
- `user_visible_message` — progress messages shown during execution
- `mcp_output` — the final result, either as a structured object or JSON string

---

### Example 1 — Simple Travel Tools (location + events)

This example uses the `travel_get_events` tool from the conversation above. After the Redux adapter processes the streaming events, `ToolCallVisualization` receives this array:

#### Input to `ToolCallVisualization`

```typescript
// toolUpdates: ToolCallObject[]
[
  {
    id: "gemini_7670597549569683896",
    type: "mcp_input",
    phase: "complete",
    mcp_input: {
      name: "travel_get_events",
      arguments: {
        city: "Miami",
        weather: "windy"
      }
    }
  },
  {
    id: "gemini_7670597549569683896",
    type: "user_visible_message",
    user_visible_message: "Fetching events for Miami..."
  },
  {
    id: "gemini_7670597549569683896",
    type: "mcp_output",
    mcp_output: {
      result: {
        city: "Miami",
        weather: "windy",
        events: ["Farmers market", "Outdoor concert"]
      }
    }
  }
]
```

`travel_get_events` is not in the static `toolRendererRegistry`, so `getInlineRenderer("travel_get_events")` falls through to `DynamicInlineRenderer`, which attempts a database fetch — and ultimately falls back to `GenericRenderer` if nothing is found.

`getToolDisplayName("travel_get_events")` auto-formats to `"Travel Get Events"` since there is no registry entry.

#### What `ToolCallVisualization` renders

The component sees `currentPhase = "complete"` (read from `mcp_input.phase`), `toolDisplayName = "Travel Get Events"`, and no `query` to show as subtitle (neither `args.query`, `args.q`, nor `args.search` is set — `args.city` is not auto-detected).

`GenericRenderer` receives the full array and displays the raw output:

```
┌──────────────────────────────────────────────────────────────┐
│ ✓  Travel Get Events                     Complete   ⊠  ⌄    │
├──────────────────────────────────────────────────────────────┤
│  ● Fetching events for Miami...                              │
│                                                              │
│  Output                                                      │
│  city: Miami                                                 │
│  weather: windy                                              │
│  events:                                                     │
│    • Farmers market                                          │
│    • Outdoor concert                                         │
└──────────────────────────────────────────────────────────────┘
```

The parallel `travel_get_activities` call produces a second identical-structure `ToolCallObject[]` group. Because both share the same message position, `ToolCallVisualization` receives them as two separate groups in `toolGroups`, rendering them stacked with a label row:

```
┌──────────────────────────────────────────────────────────────┐
│ ✓  2 Tools                               Complete   ⊠  ⌄    │
├──────────────────────────────────────────────────────────────┤
│  [ Travel Get Events ]                                       │
│    ● Fetching events for Miami...                            │
│    city: Miami · weather: windy                              │
│    events: Farmers market, Outdoor concert                   │
│                                                              │
│  [ Travel Get Activities ]                                   │
│    ● Fetching activities for Miami...                        │
│    city: Miami · weather: windy                              │
│    activities: Beach walk, Bike ride, Hiking trail           │
└──────────────────────────────────────────────────────────────┘
```

---

### Example 2 — News API (`news_get_headlines`)

This tool **is** registered in `toolRendererRegistry`. After the Redux adapter processes the streaming events from the `news_get_headlines` execution above:

#### Input to `ToolCallVisualization`

```typescript
// toolUpdates: ToolCallObject[]
[
  {
    id: "test_45a17556f3fc",
    type: "mcp_input",
    phase: "complete",
    mcp_input: {
      name: "news_get_headlines",
      arguments: {
        country: "us",
        language: "en"
      }
    }
  },
  {
    id: "test_45a17556f3fc",
    type: "user_visible_message",
    user_visible_message: "Running news_get_headlines..."
  },
  {
    id: "test_45a17556f3fc",
    type: "mcp_output",
    mcp_output: {
      result: {
        intro: "Today is Sunday, April 12, 2026. Here are the current top news headlines for US on Sunday, April 12, 2026:",
        date: "Sunday, April 12, 2026",
        total_results: 35,
        articles: [
          {
            title: "U.S. Forces Start Mine Clearance Mission in Strait of Hormuz - centcom.mil",
            source: { id: null, name: "Centcom.mil" },
            author: null,
            description: "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions for clearing mines in the Strait of Hormuz, April 11, as two U.S. Navy guided-missile destroyers conducted operations.",
            url: "https://www.centcom.mil/MEDIA/PRESS-RELEASES/...",
            url_to_image: "https://media.defense.gov/.../231028-M-LM779-002.JPG",
            published_at: "2026-04-11T17:12:32Z",
            content: "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions... [+725 chars]"
          },
          {
            title: "Pope Leo XIV blasts 'delusion of omnipotence' fueling the US-Israeli war in Iran - AP News",
            source: { id: "associated-press", name: "Associated Press" },
            author: "Nicole Winfield",
            description: "Pope Leo XIV has denounced the "delusion of omnipotence" that is fueling the U.S.-Israel war in Iran and demanded political leaders stop and negotiate peace.",
            url: "https://apnews.com/article/pope-leo-usisraeli-war-iran-7309c5df6c7312b942e0510ea65502cb",
            url_to_image: "https://dims.apnews.com/dims4/default/.../256b10eaa30545e7bc224d835279d787",
            published_at: "2026-04-11T17:07:00Z",
            content: "ROME (AP) In his strongest words yet, Pope Leo XIV on Saturday denounced... [+2884 chars]"
          }
          // ... 33 more articles
        ]
      }
    }
  }
]
```

#### Registry lookup

`getInlineRenderer("news_get_headlines")` → `NewsInline` (static registry match)
`getToolDisplayName("news_get_headlines")` → `"News Headlines"` (from `displayName` in registry)
`shouldKeepExpandedOnStream("news_get_headlines")` → `true` (does not auto-collapse when text streams)

The registry's `getHeaderExtras` runs on the output and returns `"35 articles found"`.

#### What `parseNewsData` extracts from the `ToolCallObject[]`

```typescript
{
  articles: [
    {
      source: { id: null, name: "Centcom.mil" },
      author: null,
      title: "U.S. Forces Start Mine Clearance Mission in Strait of Hormuz - centcom.mil",
      description: "TAMPA, Fla. – U.S. Central Command (CENTCOM) forces began setting conditions...",
      url: "https://www.centcom.mil/...",
      url_to_image: "https://media.defense.gov/.../231028-M-LM779-002.JPG",
      published_at: "2026-04-11T17:12:32Z",
      content: "TAMPA, Fla. – U.S. Central Command... [+725 chars]"
    },
    {
      source: { id: "associated-press", name: "Associated Press" },
      author: "Nicole Winfield",
      title: "Pope Leo XIV blasts 'delusion of omnipotence' fueling the US-Israeli war in Iran - AP News",
      description: "Pope Leo XIV has denounced the \"delusion of omnipotence\"...",
      url: "https://apnews.com/article/pope-leo-usisraeli-war-iran-...",
      url_to_image: "https://dims.apnews.com/...",
      published_at: "2026-04-11T17:07:00Z",
      content: "ROME (AP) In his strongest words yet... [+2884 chars]"
    }
    // ... 33 more
  ],
  totalResults: 35,
  query: null,         // args.query not set — args.country="us" is not auto-detected
  isLoading: false,
  isComplete: true,
  isError: false
}
```

#### What `ToolCallVisualization` renders

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✓  News Headlines                    Complete   ⊠  ⌄                        │
│    35 articles found                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ [image]          │  │ [image]          │  │ [image]          │           │
│  │                  │  │                  │  │                  │           │
│  │ Centcom.mil      │  │ Associated Press │  │ Reuters          │           │
│  │ U.S. Forces      │  │ Pope Leo XIV     │  │ Trade War...     │           │
│  │ Start Mine       │  │ blasts           │  │                  │           │
│  │ Clearance...     │  │ 'delusion of     │  │                  │           │
│  │                  │  │ omnipotence'...  │  │                  │           │
│  │ Apr 11, 2026     │  │ Apr 11, 2026     │  │ Apr 11, 2026     │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ [image]          │  │ [image]          │  │ [image]          │           │
│  │ ...              │  │ ...              │  │ ...              │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  📰  View all 35 articles                                      │         │
│  └────────────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Clicking the header's `⊠` (Maximize2) icon opens `ToolUpdatesOverlay` with the full 35 articles in a tabbed modal — the `NewsOverlay` component renders from the same `ToolCallObject[]` input but with expanded layout and pagination.

Because `keepExpandedOnStream: true`, this card stays visible and does **not** auto-collapse when the assistant's text response begins streaming after the tool completes.

---

## Full Content Processing Pipeline

Every piece of content — whether loaded from the database or arriving over a live stream — passes through at least two transformation stages before it reaches a renderer. The pipeline is the same for all content types; only the processors at each stage differ by type.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DATA SOURCES                                                                   │
│                                                                                 │
│  ┌─────────────────────────┐        ┌────────────────────────────────────────┐ │
│  │  Database               │        │  Live Stream (NDJSON)                  │ │
│  │                         │        │                                        │ │
│  │  cx_conversation        │        │  chunk · reasoning_chunk · phase       │ │
│  │  cx_message             │        │  tool_event · completion · error       │ │
│  │  cx_tool_call           │        │  init · info · warning · broker        │ │
│  │  tool_calls[] in        │        │  heartbeat · end · content_block       │ │
│  │  message.content[]      │        │  record_reserved · record_update       │ │
│  └────────────┬────────────┘        └─────────────────┬──────────────────────┘ │
└───────────────┼─────────────────────────────────────────────┼───────────────────┘
                │                                             │
                │  already-typed DB records                   │  lib/api/stream-parser.ts
                │  (content[], tool_calls[])                  │  parseNdjsonStream()
                │                                             │  consumeStream()
                └───────────────────┬─────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — EVENT TYPE RECOGNITION  (unified StreamEvent[])                      │
│                                                                                 │
│  All events, regardless of source, are classified into a small set of top-      │
│  level types. This is the only place the two sources merge.                     │
│                                                                                 │
│  Stream wire types (auto-generated from Python Pydantic models):                │
│    chunk               → text fragment                                          │
│    reasoning_chunk     → thinking fragment                                      │
│    tool_event          → tool lifecycle event (has sub-type: ToolEventType)     │
│    completion          → final payload (full_result + cost_estimate)            │
│    content_block       → pre-formed block from backend                          │
│    error               → stream-level error                                     │
│    phase / init / info / warning / broker / heartbeat / end  → metadata only   │
│                                                                                 │
│  DB content block types (from message.content[].type):                          │
│    text · thinking · tool_call · tool_result                                    │
│                                                                                 │
│  Source: types/python-generated/stream-events.ts                                │
│          lib/api/stream-parser.ts  (isChunkEvent, isToolEventEvent, …)          │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2 — INITIAL PROCESSING  (per top-level type → CanonicalBlock[])          │
│                                                                                 │
│  lib/chat-protocol/from-stream.ts  buildCanonicalBlocks()                       │
│                                                                                 │
│  Each top-level type is folded into a typed CanonicalBlock:                     │
│                                                                                 │
│  chunk              ──► TextBlock        { type:'text', content: string }       │
│  reasoning_chunk    ──► ThinkingBlock    { type:'thinking', content: string }   │
│  tool_event         ──► ToolCallBlock    { type:'tool_call', callId, toolName,  │
│                                            input, output, progress[], phase }   │
│  error              ──► ErrorBlock       { type:'error', errorType, message }   │
│                                                                                 │
│  Tool sub-events are folded into the same ToolCallBlock:                        │
│    tool_started        → creates block, phase:'running'                         │
│    tool_progress/step  → appends to progress[]                                  │
│    tool_result_preview → appends to progress[]                                  │
│    tool_completed      → sets output{}, phase:'complete'                        │
│    tool_error          → sets error{}, phase:'error'                            │
│    tool_delegated      → (future use)                                           │
│                                                                                 │
│  Output stored as: CanonicalBlock[]  /  StreamingState (live view)              │
│  Used by: Redux instance-conversation-history slice                             │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                          ┌────────┴─────────┐
                          │                  │
                          ▼                  ▼
     ┌──────────────────────────┐   ┌─────────────────────────────────────────┐
     │  TEXT / THINKING PATH    │   │  TOOL PATH                              │
     └──────────────┬───────────┘   └───────────────────┬─────────────────────┘
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────┐  ┌────────────────────────────────────────────┐
│  STAGE 3 — BLOCK SPLITTING    │  │  STAGE 3 — TOOL CALL OBJECT MAPPING        │
│                               │  │                                            │
│  content-splitter-v2.ts       │  │  build-tool-call-objects.ts                │
│  splitContentV2()             │  │  buildToolCallObjectsForPreview()          │
│                               │  │                                            │
│  Splits raw text into typed   │  │  ToolCallBlock → ToolCallObject[]          │
│  segments by detecting        │  │  (the format ToolCallVisualization needs)  │
│  custom delimiters:           │  │                                            │
│                               │  │  { id, type:'mcp_input',  mcp_input:{} }  │
│  ┌──────┐  ┌──────────────┐  │  │  { id, type:'user_message', user_message }│
│  │ text │  │  flashcards  │  │  │  { id, type:'step_data',  step_data:{} }  │
│  └──────┘  └──────────────┘  │  │  { id, type:'mcp_output', mcp_output:{} } │
│  ┌──────┐  ┌──────────────┐  │  │  { id, type:'mcp_error',  mcp_error }     │
│  │ code │  │  quiz        │  │  │                                            │
│  └──────┘  └──────────────┘  │  │  Phase is set on mcp_input.phase:         │
│  ┌──────┐  ┌──────────────┐  │  │  'pending' | 'running' | 'complete'       │
│  │ ...  │  │  (registry)  │  │  │  | 'error'                                │
│  └──────┘  └──────────────┘  │  └───────────────────┬────────────────────────┘
│                               │                      │
└───────────────┬───────────────┘                      ▼
                │                     ┌────────────────────────────────────────────┐
                ▼                     │  STAGE 4 — RENDERER REGISTRY LOOKUP        │
┌───────────────────────────────┐     │                                            │
│  STAGE 4 — BLOCK RENDERING    │     │  lib/tool-renderers/registry.tsx           │
│                               │     │  getInlineRenderer(toolName)               │
│  BlockComponentRegistry.tsx   │     │  getOverlayRenderer(toolName)              │
│  BlockRenderer.tsx            │     │                                            │
│                               │     │  Resolution order:                         │
│  Each segment type maps to a  │     │  1. Static registry (bundled in code)      │
│  registered block component:  │     │     news_get_headlines → NewsInline        │
│                               │     │     web_search        → BraveSearchInline  │
│  text       → MarkdownBlock   │     │     core_web_search   → CoreWebSearchInline│
│  flashcards → FlashcardsBlock │     │     seo_*             → SeoMeta*Inline     │
│  code       → CodeBlock       │     │     get_user_lists    → UserListsInline    │
│  quiz       → QuizBlock       │     │     …                                      │
│  …          → …               │     │  2. Dynamic cache (compiled DB component)  │
│                               │     │  3. DynamicInlineRenderer (DB fetch+compile│
│                               │     │  4. GenericRenderer (raw output fallback)  │
└───────────────┬───────────────┘     └───────────────────┬────────────────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────┐     ┌────────────────────────────────────────────┐
│  STAGE 5 — BLOCK POST-PROCESS │     │  STAGE 5 — TOOL VISUALIZATION              │
│                               │     │                                            │
│  Runs after block is rendered.│     │  ToolCallVisualization.tsx                 │
│  Block-type specific:         │     │                                            │
│                               │     │  Groups ToolCallObject[] by id             │
│  FlashcardsBlock:             │     │  Reads phase from mcp_input.phase          │
│  • flashcard-parser.ts        │     │  Calls getInlineRenderer → renders inline  │
│    → { flashcards[], meta }   │     │  Maximize2 button → ToolUpdatesOverlay     │
│  • Saved to user's deck (DB)  │     │    → getOverlayRenderer → full modal view  │
│  • Optional TTS audio         │     │                                            │
│  • Registered to user account │     │  keepExpandedOnStream:                     │
│                               │     │  true  → stays expanded after text starts  │
│  QuizBlock:                   │     │  false → auto-collapses                    │
│  • Answer tracking (DB)       │     │                                            │
│  • Score storage              │     │  Dynamic renderers:                        │
│                               │     │  • Fetched from DB as raw JSX/TSX          │
│  CodeBlock:                   │     │  • Compiled via Babel + new Function()     │
│  • Syntax highlighting        │     │  • Cached per tool name                    │
│  • Copy/run actions           │     │  • Scoped imports (allowlisted only)       │
└───────────────────────────────┘     └────────────────────────────────────────────┘
```

### Minimum transformations per event type

Every event type undergoes at least:

| Stage | What happens |
|---|---|
| **1 — Recognition** | Wire discriminator check (`isChunkEvent`, `isToolEventEvent`, …) |
| **2 — Canonical form** | Folded into `CanonicalBlock` (`TextBlock`, `ToolCallBlock`, etc.) |
| **3 — Type-specific parsing** | Text → split into typed segments; Tool → mapped to `ToolCallObject[]` |
| **4 — Renderer selection** | Block registry or tool renderer registry lookup |
| **5 — Post-render processing** | DB persistence, audio, user registration, caching |

Tool events have an extra layer because `tool_event` is itself a container — the inner `ToolEventType` (`tool_started`, `tool_progress`, `tool_completed`, etc.) is a second discriminator processed inside Stage 2 before anything else runs.

---

## Event-to-ToolCallObject Translation — Where It Lives Now

The translation from raw stream events to `ToolCallObject[]` is implemented in one place:

**`app/(public)/demos/api-tests/tool-testing/components/ToolRendererPreview.tsx`** — `buildToolCallObjects()`

The full pipeline for the tool-testing route is:

```
HTTP SSE stream (NDJSON)
  │
  ▼
lib/api/stream-parser.ts  ─  consumeStream()
  │  Parses raw NDJSON lines, routes each line to a typed callback.
  │  Key callbacks used here:
  │    onToolEvent  → ToolEventPayload  (tool_started / tool_progress / tool_completed / tool_error)
  │    onCompletion → CompletionPayload (the "completion" event with full_result + cost_estimate)
  │    onRawEvent   → StreamEvent       (every raw line, for the debug log)
  │
  ▼
streaming-client.ts  ─  executeToolTest()
  │  Thin wrapper: maps consumeStream callbacks → StreamEventHandlers.
  │  onToolEvent  → handlers.onToolEvent  → state: toolEvents: ToolStreamEvent[]
  │  onCompletion → handlers.onFinalResult → state: finalPayload: FinalPayload
  │
  ▼
ToolTestingClient.tsx  (state owner)
  │  toolEvents: ToolStreamEvent[]   ← array grows as events arrive
  │  finalPayload: FinalPayload      ← set once on completion event
  │  Both passed as props to ResultsPanel → ToolRendererPreview
  │
  ▼
ToolRendererPreview.tsx  ─  buildToolCallObjects()   ← THE BRIDGE
  │
  │  Input:  toolName, args, toolEvents[], finalPayload
  │  Output: ToolCallObject[]
  │
  │  Mapping rules:
  │
  │  1. Always push mcp_input first:
  │       { id: call_id, type: 'mcp_input', phase: 'complete', mcp_input: { name, arguments } }
  │
  │  2. For each ToolStreamEvent, by event type:
  │       'tool_started'        → user_message (event.message)
  │       'tool_progress'       → user_message (event.message) + optional step_data (event.data)
  │       'tool_step'           → user_message (event.message) + optional step_data (event.data)
  │       'tool_result_preview' → step_data { type: 'result_preview', content: event.data }
  │       'tool_completed'      → mcp_output { result: event.data.result }
  │       'tool_error'          → mcp_error (event.message)
  │
  │  3. If no mcp_output was produced by step 2 AND finalPayload exists:
  │       mcp_output { result: finalPayload.output.full_result.output }
  │
  ▼
ToolCallVisualization  (features/cx-conversation/ToolCallVisualization.tsx)
  │  Receives: toolUpdates: ToolCallObject[]
  │  Groups by id, reads phase from mcp_input.phase
  │  Calls getInlineRenderer(toolName) → registry lookup → NewsInline / GenericRenderer / etc.
```

### Types involved

| Type | File | Role |
|---|---|---|
| `StreamEvent` | `types/python-generated/stream-events.ts` | Raw wire event off the NDJSON stream |
| `ToolEventPayload` | same | Payload of `event: "tool_event"` lines; has `event`, `call_id`, `tool_name`, `data` |
| `ToolStreamEvent` | `tool-testing/types.ts` | Enriched version stored in component state |
| `FinalPayload` | `tool-testing/types.ts` | Payload of `event: "completion"` lines; has `output.full_result.output` |
| `ToolCallObject` | `lib/api/tool-call.types.ts` | What the renderer registry and `ToolCallVisualization` consume |

### What to extract

To make `buildToolCallObjects` a standalone utility, pull it out to e.g. `lib/tool-renderers/build-tool-call-objects.ts` with this signature:

```typescript
import type { ToolCallObject } from '@/lib/api/tool-call.types';
import type { ToolStreamEvent, FinalPayload } from '@/types/...'; // wherever these land

export function buildToolCallObjects(
  toolName: string,
  args: Record<string, unknown>,
  toolEvents: ToolStreamEvent[],
  finalPayload: FinalPayload | null,
): ToolCallObject[]
```

The function body is already complete and correct in `ToolRendererPreview.tsx` — it just needs to be moved. No logic changes required.
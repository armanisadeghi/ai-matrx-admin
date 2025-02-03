import {
  PreDefinedMessages,
  PartialBroker,
  ServersideMessage,
} from "@/types/voice/voiceAssistantTypes";
import {
  businessCoach,
  candiceAi,
  debateCoach,
  defaultVoiceAssistant,
  developmentExpert,
  englishTeacher,
  historyTeacher,
  hrExpert,
  mathTutor,
  mathTutorGPT,
  matrxVoiceAssistant,
  pythonDevelopmentExpert,
  reactDevelopmentExpert,
  scienceTeacher,
  typeScriptDevelopmentExpert,
} from "@/actions/ai-actions/constants";
import { headers } from "next/headers";

export async function getInitialMessages(
  assistant?: keyof typeof preDefinedInitialMessages,
  partialBrokers?: { id: string; value: string }[],
  transcript?: string
): Promise<ServersideMessage[]> {
  // Get the predefined messages for the specified assistant type, applying replacements if necessary
  const initialMessages: ServersideMessage[] = assistant
    ? getMessageSet(assistant, partialBrokers)
    : preDefinedInitialMessages["defaultVoiceAssistant"];

  if (transcript) {
    initialMessages.push({ role: "user", content: transcript });
  }

  return initialMessages;
}

function getMessageSet(
  assistant: keyof typeof preDefinedInitialMessages,
  partialBrokers?: { id: string; value: string }[]
): ServersideMessage[] {
  const updatedMessages = replacePlaceholders(
    preDefinedInitialMessages,
    partialBrokers
  );
  return updatedMessages[assistant] || [];
}

const preDefinedInitialMessages: PreDefinedMessages = {
  defaultVoiceAssistant: [
    {
      role: "system",
      content: defaultVoiceAssistant,
    },
  ],
  debateCoach: [
    {
      role: "system",
      content: debateCoach,
    },
    {
      role: "assistant",
      content: "Hello, I am here to help.",
    },
    {
      role: "user",
      content:
        "Hi. My name is {c33aea28-8b61-4256-9c84-9483e93662d2}! and I am in {5fc6bbee-3674-4706-aff2-233c9d71ec73}! grade. I have a big debate coming up and I really need help.",
    },
  ],
  voiceAssistant: [
    {
      role: "system",
      content: matrxVoiceAssistant,
    },
  ],
  mathTutor: [
    {
      role: "system",
      content: mathTutor,
    },
  ],
  historyTeacher: [
    {
      role: "system",
      content: historyTeacher,
    },
  ],
  scienceTeacher: [
    {
      role: "system",
      content: scienceTeacher,
    },
  ],
  englishTeacher: [
    {
      role: "system",
      content: englishTeacher,
    },
  ],
  reactDevelopmentExpert: [
    {
      role: "system",
      content: reactDevelopmentExpert,
    },
  ],
  pythonDevelopmentExpert: [
    {
      role: "system",
      content: pythonDevelopmentExpert,
    },
  ],
  typeScriptDevelopmentExpert: [
    {
      role: "system",
      content: typeScriptDevelopmentExpert,
    },
  ],
  businessCoach: [
    {
      role: "system",
      content: businessCoach,
    },
  ],
  hrExpert: [
    {
      role: "system",
      content: hrExpert,
    },
  ],
  candy: [
    {
      role: "system",
      content: candiceAi,
    },
  ],
  mathTutorGPT: [
    {
      role: "system",
      content: mathTutorGPT,
    },
  ],
  developmentExpert: [
    {
      role: "system",
      content: developmentExpert,
    },
  ],
};

const replacePlaceholders = (
  templateMessages: PreDefinedMessages,
  partialBrokers: PartialBroker[] = []
): PreDefinedMessages => {
  const replacementsMap = partialBrokers.reduce<Record<string, string>>(
    (map, { id, value }) => {
      map[id] = value;
      return map;
    },
    {}
  );

  const clonedMessages: PreDefinedMessages = JSON.parse(
    JSON.stringify(templateMessages)
  );

  const replaceInContent = (content: string): string => {
    return content.replace(/{(.*?)}/g, (match, uuid) => {
      // Replace with the value if found, or remove the placeholder
      return replacementsMap[uuid] || "";
    });
  };

  Object.keys(clonedMessages).forEach((key) => {
    clonedMessages[key] = clonedMessages[key].map(
      (message): ServersideMessage => {
        if (message.content) {
          return {
            ...message,
            content: replaceInContent(message.content),
          };
        }
        return message;
      }
    );
  });

  return clonedMessages;
};

async function location() {
  const headersList = await headers();

  const country = headersList.get("x-vercel-ip-country");
  const region = headersList.get("x-vercel-ip-country-region");
  const city = headersList.get("x-vercel-ip-city");

  if (!country || !region || !city) return "unknown";

  return `${city}, ${region}, ${country}`;
}

async function time() {
  const headersList = await headers();
  return new Date().toLocaleString("en-US", {
    timeZone: headersList.get("x-vercel-ip-timezone") || undefined,
  });
}

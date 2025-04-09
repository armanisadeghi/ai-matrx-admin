export const sampleContent = `
Okay, here is the 3-part output based on your audio clip.

\`\`\`transcript
**Audio Transcription**

[00:00] Here are some of the most important things I need to get done today, and I need to make sure that I keep a good structure of what I need to do. Make sure that as you're going through this, please, if you recognize that I go back and refer to something that I said earlier, I want to make sure that things are put into the right place, but without changing my words. So if anything I say is unclear, then at least put notes in there in parentheses that say that maybe something was unclear, but you did your best to put it in the right place or try to associate things. I don't want you to take guesses.

[00:30] So, a couple of core things that I need to do today. One is that within the chat system, right now we have some different parts. There's the conversation management system, and then there is the AI client facade, which manages the actual calls to the AI endpoints and communication with the models.

[01:00] And then, separately, we have our recipe system, which is where specific instructions can come from. Now, those instructions are typically not part of normal chats; they're system processes. But what we need to do now is to bring them together in a way where there is a core manager, and I'm thinking about calling it the AI Orchestrator.

[01:30] And then this AI Orchestrator needs to have access to both the conversation system and the recipe system. And that way, what it can do is it can orchestrate the things that go back and forth so that from within a chat, if a recipe needs to be triggered, it can get the recipe, trigger it through the AI client facade,

[02:00] but without involving the current conversation, because that's the way recipes work, although it's going to take some, be given some of the context from the conversation. And then it triggers that call, it gets what it needs from the client facade, gets the response, and then that response needs to be modified, and a modified version of it needs to be added to the chat history in the in the conversation system. And so I need to build that that orchestrator.

[02:30] The second thing I need to do is I need to make sure that every recipe run generates a conversation for the user. And so that's the other thing that this orchestrator can manage. Right now, when you run a recipe, there's no history kept of it, but we need to keep a history so that it goes into conversations. And what that will allow us to then do is allow a recipe to be run, but then optionally continue it as a regular conversation.

[03:00] So that's important. The other thing I need to do is separate the, in a conversation, you have message metadata, which is where right now we're storing the settings. And then the conversation has metadata, but this is problematic because as the options change throughout a conversation, as new messages are going to the AI,

[03:30] right now, we're adding these new metadata to each message, but a lot of it is being ignored. So if you change the model, let's say, in the fifth message, we're still using the original one because that's what's on the conversation. Now, some could claim that that's what makes sense, but what we want to do instead is we want to use our AI settings object, which already has a database table,

[04:00] so that each message comes with this request object, and that's the settings, right? And that's what we want to use. And that way, as the settings are updated throughout a conversation, it's fine. We still have a history of what the settings were initially, but then what happens is now as the new ones are coming in, we are directly using the values from the object we get and not what was originally in the conversation. And that's a big shift, although it should be simple because we're getting the message object.

[04:30] And technically could even speed up the system because then we don't need to rely on the database to get the data. The other thing I'm considering is allowing the Python backend to fully manage all of the database interactions for chats. Right now, the client side handles things like starting a new conversation and then, uh,

[05:00] and then the adding the client-side messages, but I'm considering possibly changing that. I just have to see what implications that would have. That's a separate thing. The other thing I need to do is start to dabble in the workflows. And it's not that I can get the workflows working right now, but the key is to start dabbling in it and start putting the structure together so that I can start seeing what potential issues we're going to run into and make sure that I build the

[05:30] AI orchestrator and all these other systems with those things in mind as opposed to then having to modify them to make them work in that system. Um, and then finally, I need to look at the AI endpoints and look at some of their APIs and start to figure out how to ensure that for each endpoint, right now we have just one system that uses it.

[06:00] But the reality is for certain things, like let's say when you're working with audio as opposed to when you're working with text, the API calls are significantly different enough potentially that we should have a separate class. But I need to look at those and see if they're different enough for that to matter or not. I think it will be the case that way. The other thing is that I feel like we have a significant amount of duplication in our handling of settings.

[06:30] And potentially, one option is to simplify it by having it where our central smart AI config manages structuring the configs for the specific API and and possibly uh the the type of call. Um, so that's another thing that that has to be considered. But I need to start looking into those things and and seeing what is going to be the best approach. I think that's it for now.

\`\`\`

\`\`\`structured_info
## Project Plan: System Architecture Enhancements

**1. Current System Components:**

*   **Chat System:**
    *   Conversation Management System: Handles core chat interactions and history.
    *   Current Metadata Handling:
        *   Message Metadata: Currently used for storing settings per message.
        *   Conversation Metadata: Stores overall conversation settings.
        *   **Problem:** Settings applied per message (via metadata) are often ignored; the system defaults to the initial conversation-level settings, even if settings (like the model) change mid-conversation.
*   **AI Client Facade:** Manages calls to AI endpoints and communication with AI models.
*   **Recipe System:** Handles specific, predefined instruction sets (system processes), separate from normal chat flows.

**2. Proposed New Component: AI Orchestrator**

*   **Purpose:** To act as a core manager integrating the Conversation System and Recipe System.
*   **Access Requirements:** Needs access to both the Conversation System and the Recipe System.
*   **Core Functionality:**
    *   Orchestrate interactions between chat and recipes.
    *   Trigger recipes from within a chat context.
        *   Retrieve the required recipe.
        *   Trigger the recipe execution via the AI Client Facade.
        *   Pass necessary context from the conversation to the recipe run.
        *   Execute recipe without directly involving/altering the *current* state of the user-facing conversation flow initially.
    *   Process recipe results:
        *   Receive the response from the AI Client Facade (after recipe execution).
        *   Modify the response as needed.
        *   Add the modified response to the chat history within the Conversation System.
*   **Recipe History Requirement:** Ensure every recipe run generates a corresponding conversation history record.
    *   **Benefit:** Allows tracking and potentially continuing recipe interactions.
*   **Optional Continuation:** Allow a completed recipe run/conversation to be optionally continued as a standard user chat conversation.

**3. Metadata and Settings Handling Refactor:**

*   **Goal:** Address the issue of changing settings mid-conversation being ignored.
*   **Proposed Solution:**
    *   Utilize the existing \`AI Settings\` object (which has a database table).
    *   Associate this \`AI Settings\` object with each *request* (message) sent to the AI.
    *   Ensure the system uses the settings from the specific request object for that interaction, rather than defaulting to the initial conversation settings.
*   **Benefits:**
    *   Accurately reflects settings changes throughout a conversation.
    *   Maintains a history of initial settings while using current settings for new requests.
    *   Potential performance improvement: Reduces reliance on fetching conversation-level settings from the database for every message processing step.

**4. Database Interaction Management (Consideration):**

*   **Current State:** Client-side currently handles some database interactions (e.g., starting new conversations, adding client-side messages).
*   **Potential Change:** Explore having the Python backend fully manage *all* database interactions related to chats.
*   **Status:** Needs investigation to understand implications.

**5. Workflow System Exploration:**

*   **Goal:** Begin initial exploration and structural setup for workflows.
*   **Approach:**
    *   Start "dabbling" – not necessarily full implementation yet.
    *   Focus on putting the basic structure together.
    *   Identify potential issues and integration challenges early.
*   **Importance:** Inform the design of the AI Orchestrator and other systems to ensure compatibility and avoid future refactoring.

**6. AI Endpoint and API Review:**

*   **Goal:** Analyze current AI endpoints and their APIs.
*   **Key Question:** Are API calls for different types of interactions (e.g., audio vs. text) significantly different?
*   **Potential Action:** If APIs differ significantly, consider creating separate classes or handling mechanisms for different endpoint/call types.
*   **Status:** Needs investigation to determine if the differences warrant separate handling.

**7. Settings Management Simplification:**

*   **Problem:** Suspected significant duplication in how settings are handled across the system.
*   **Potential Solution:** Use a central "Smart AI Config" manager.
    *   This manager would be responsible for structuring/generating the specific configuration needed for different API calls based on the API and type of call.
*   **Status:** Needs investigation to confirm duplication and evaluate the feasibility/benefit of a central config manager.
\`\`\`

\`\`\`tasks
## Task Checklist

- [ ] **Build AI Orchestrator:**
    - [ ] Design the core logic for managing conversation and recipe systems.
    - [ ] Implement access to Conversation and Recipe systems.
    - [ ] Implement recipe triggering via AI Client Facade.
    - [ ] Implement logic for processing recipe results (modification, adding to history).

- [ ] **Enhance Recipe Functionality:**
    - [ ] Ensure every recipe run generates a conversation history record.
    - [ ] Ensure every recipe run generates a conversation history record.
    - [ ] Implement the ability to optionally continue a recipe run as a regular conversation.

- [ ] **Refactor Metadata/Settings Handling:**
    - [ ] Modify system to use the \`AI Settings\` object per request.
    - [ ] Ensure settings from the request object override conversation-level defaults for that specific interaction.
    - [ ] Verify history of settings is maintained correctly.

- [ ] **Investigate Database Interaction Management:**
    - [ ] Analyze current client-side vs. potential backend database interactions for chats.
    - [ ] Determine implications and feasibility of moving all chat DB interactions to the Python backend.

- [ ] **Explore Workflow System:**
    - [ ] Begin initial design/structuring ("dabbling") of the workflow system.
    - [ ] Identify potential integration points and challenges with the AI Orchestrator and other components.

- [ ] **Review AI Endpoints & APIs:**
    - [ ] Analyze APIs for different endpoints (e.g., text vs. audio).
    - [ ] Determine if API call structures differ significantly.
    - [ ] Decide if separate classes/handlers are needed based on API differences.

- [ ] **Investigate Settings Duplication:**
    - [ ] Analyze current settings handling for duplication.
    - [ ] Evaluate the potential use of a central "Smart AI Config" manager.
    - [ ] Determine the best approach for simplifying settings management.
\`\`\`
"""`;


export const sampleContentShort = `
Okay, here is the 3-part output based on your audio clip.

\`\`\`transcript
**Audio Transcription**

[00:00] Here are some of the most important things I need to get done today, and I need to make sure that I keep a good structure of what I need to do. Make sure that as you're going through this, please, if you recognize that I go back and refer to something that I said earlier, I want to make sure that things are put into the right place, but without changing my words. So if anything I say is unclear, then at least put notes in there in parentheses that say that maybe something was unclear, but you did your best to put it in the right place or try to associate things. I don't want you to take guesses.

[00:30] So, a couple of core things that I need to do today. One is that within the chat system, right now we have some different parts. There's the conversation management system, and then there is the AI client facade, which manages the actual calls to the AI endpoints and communication with the models.

[01:00] And then, separately, we have our recipe system, which is where specific instructions can come from. Now, those instructions are typically not part of normal chats; they're system processes. But what we need to do now is to bring them together in a way where there is a core manager, and I'm thinking about calling it the AI Orchestrator.

[01:30] And then this AI Orchestrator needs to have access to both the conversation system and the recipe system. And that way, what it can do is it can orchestrate the things that go back and forth so that from within a chat, if a recipe needs to be triggered, it can get the recipe, trigger it through the AI client facade,

[02:00] but without involving the current conversation, because that's the way recipes work, although it's going to take some, be given some of the context from the conversation. And then it triggers that call, it gets what it needs from the client facade, gets the response, and then that response needs to be modified, and a modified version of it needs to be added to the chat history in the in the conversation system. And so I need to build that that orchestrator.

... etc.
\`\`\`

\`\`\`structured_info
## Project Plan: System Architecture Enhancements

**1. Current System Components:**

... etc.

**7. Settings Management Simplification:**

*   **Problem:** Suspected significant duplication in how settings are handled across the system.
*   **Potential Solution:** Use a central "Smart AI Config" manager.
    *   This manager would be responsible for structuring/generating the specific configuration needed for different API calls based on the API and type of call.
*   **Status:** Needs investigation to confirm duplication and evaluate the feasibility/benefit of a central config manager.
\`\`\`

\`\`\`tasks
## Task Checklist

- [ ] **Build AI Orchestrator:**
    - [ ] Design the core logic for managing conversation and recipe systems.
    - [ ] Implement access to Conversation and Recipe systems.
    - [ ] Implement recipe triggering via AI Client Facade.
    - [ ] Implement logic for processing recipe results (modification, adding to history).


- [ ] **Investigate Settings Duplication:**
    - [ ] Analyze current settings handling for duplication.
    - [ ] Evaluate the potential use of a central "Smart AI Config" manager.
    - [ ] Determine the best approach for simplifying settings management.
\`\`\`
"""`;


export const sampleContentThree = `
\`\`\`transcript
**Audio Transcription**

[00:00:00] Here's what I need to do for the AI cockpit. I need to address a lot of different things. One of the key things is that I need to integrate it to use the new socket request system. Make sure that the data that goes out and the data that comes back in is properly handled.

[00:00:30] The second thing is I need to make a change to the concept so that in addition to being able to test various settings, you can also test various message versions, which will be a bit tricky because I have to figure out how to manage maintaining the state for the overall message structure while allowing for message variations.

[00:00:55] Another thing I need to do is to extend the broker display component to essentially include some basic logic for the broker component selection.

[00:01:11] Right now when you go to select a broker, it assumes that you've already built custom components, but most users haven't already done that, especially when they first start. So what I need is I need to include a couple of sort of out-of-the-box components, and I need to make sure that it defaults to a text area, specifically the text grow component.

[00:01:38] So that it'll work out of the box. And since most users are used to just writing free content, that's probably a good place to start, and then we can expand it from there. And if a user has already created custom components, then they would be able to do that.

[00:01:58] Another thing is that right now, although the core system logic allows for a broker to be reused, the UI is not allowing for that. So it's limited to only one broker per being placed in one place, even though it would be very easy to change it.

[00:02:22] So what needs to happen is we need to basically provide control over the broker ID and display the broker ID, most likely. And possibly even make it easier by having the display show the broker ID and the broker name so that the user can easily recognize which broker they've already used.

[00:02:44] Along with that, the other thing we need to do is display a list of sort of available brokers at the top that the user can choose. And those brokers need to be separated probably into at least three or four types of brokers, including uh sort of some system brokers which uh should have uh some preset components and basic things that we know that users need.

[00:03:12] Another thing is uh system data components where we're allowing the user to select the a broker that has some sort of data, and it could be static data or potentially dynamic data based on certain settings, but we need to display those options.

[00:03:34] And then the user needs to have a list of their own brokers. And since they can have two formats of brokers, then we would display uh those two as well, um so that they can have either uh regular basic brokers or they can have their own uh custom data brokers. Um so in total, it would probably show four types.

[00:03:55] Now, they can all be shown either in the same component, in four separate components, or possibly um the system ones together and the uh user ones together. Then the next thing that is uh extremely important is to truly treat the default value as the default value for the broker.

[00:04:18] And in order to do that, what we need to do is ensure that um we have a place to enter the values um for uh uh for running the recipe. Now, what we could do is we can have it initialize with the default value set to it, but I think the user needs to see um the component that they selected um as that broker's component displayed.

[00:04:45] So, in fact, they can actually visually see the component that that that that they're going to be using. So essentially the component editor um can be built into the cockpit, which right now is not the case.

[00:05:01] Um then uh another uh big change is to make sure that the text for the messages can be displayed in um using the complex editor, but also the basic editor, so that um in fact, the default should just be to have a basic editor and um we can have a some sort of feature that the user triggers.

[00:05:24] Um and we can call it um, you know, like the intelligent editor or the dynamic editor or something like that, which then allows the user to start including brokers um into the message. But since most messages don't include brokers, um we should give the user the ability to switch back and forth.

[00:05:42] And we also need to within the um display, um to offer the various display options of seeing the markdown, seeing sort of the pretty version and things like that.

[00:05:56] We also need to um build in some simple integrations to have AI assisted um updating of system messages and things like that. To start with, it could be very, very basic uses. Um and then they could expand into other things.

[00:06:12] And as part of that, we can also include either via brokers or a dedicated system that um under the hood just uses brokers, um include things where the user can um add uh structural instructions, but they're provided by the system.

[00:06:31] And then uh the other thing is um some sort of random additional things we need to address is um we need to um uh make it where after you run a recipe um and you get the results, um there should be a button that lets you kind of um move that to chats or save it to your chats or go to the chat for that.

[00:06:58] Um And then um another uh another feature is we need to make it where um right now the settings can can be named. Um but I feel like that is uh even though it the name is just always there anyways. I think we actually need to hide it and only show it if the user wants to save those as a preset.

[00:07:21] Um and even though under the hood again, it's going to just do the same thing. Um what we'll do is we'll make it where um it it shows that to the user um as being um as being something that they can save as a preset. Um or possibly just call it uh saving an agent.

[00:07:40] Um another thing is that right now the tool structure doesn't match the back end's tool structure, so we need to make those um sync. And then we also need to make sure that uh tools are um coming from a list from the database that can be synced between um Python, um and then the chat and the the AI cockpit so that available tools are um are coming from a single source.

[08:08] And that would also give us an easy way um to start to integrate um MCP tools that come from other services. I think for now, that's it. Um and uh there will certainly be additional changes needed, but that's a that's a good place to start.
\`\`\`

\`\`\`structured_info
**Structured Information Extracted**

**AI Cockpit Development Plan**

1.  **Core System & Integration:**
    *   **Socket Request System:** Integrate the new socket request system for data communication. Ensure proper handling of outgoing and incoming data.
    *   **Concept Change - Testing:** Modify the core concept to allow testing of different *message versions* in addition to testing various *settings*. This requires managing state for the overall message structure while accommodating variations.

2.  **Broker Component Enhancements:**
    *   **Broker Display Component Logic:** Extend the broker display component to include basic logic for selecting the actual component used by the broker.
    *   **Default/Out-of-the-Box Components:** Include default components (like a 'Text Grow' text area) so users can start without building custom components first. The default should be a simple text area suitable for free-form content.
    *   **Broker Reusability (UI):** Update the UI to allow the reuse of a single broker instance in multiple places, aligning with the existing capability in the core system logic.
    *   **Broker Identification:** Provide control over and display the Broker ID. Enhance usability by displaying both the Broker ID and Broker Name to help users recognize previously used brokers.
    *   **Available Broker List:** Display a list of available brokers at the top for user selection.
    *   **Broker Categorization:** Separate the available broker list into distinct types (potentially 3-4 categories):
        *   **System Brokers:** Pre-defined brokers with preset components/basic functions.
        *   **System Data Components:** Brokers linked to specific static or dynamic system data (based on settings).
        *   **User Basic Brokers:** User-created standard brokers.
        *   **User Custom Data Brokers:** User-created brokers linked to custom data sources.
    *   **Broker Display Options:** Decide how to display these categories (single component, separate components, grouped system/user).
    *   **Default Value Handling:** Treat the broker's default value strictly as the default. Provide a clear place for users to *enter* the actual values when running a recipe.
    *   **Integrated Component Editor:** Display the actual component selected for a broker directly within the cockpit (effectively integrating a component editor view), allowing users to visually see and potentially interact with the component they are configuring.

3.  **Message Editor & Display:**
    *   **Editor Flexibility:** Allow message text to be edited using both a 'Basic Editor' (default) and a 'Complex/Intelligent/Dynamic Editor'.
    *   **Editor Switching:** Provide a user-triggered feature to switch to the complex editor, enabling the inclusion of brokers within the message content. Allow switching back and forth.
    *   **Display Options:** Offer various display modes for message content within the cockpit (e.g., raw Markdown view, rendered/pretty view).

4.  **AI Assistance & Integration:**
    *   **AI-Assisted Updates:** Build simple integrations for AI assistance, starting with basic uses like updating system messages.
    *   **Structural Instructions:** Include a way (via brokers or a dedicated system) for users to add system-provided structural instructions to their prompts/recipes.

5.  **Workflow & UI/UX Improvements:**
    *   **Post-Recipe Actions:** After running a recipe and getting results, provide buttons/options to:
        *   Move results to Chats.
        *   Save results to Chats.
        *   Navigate directly to the relevant Chat.
    *   **Settings Naming/Presets:** Hide the setting name field by default. Only show it when the user explicitly wants to save the current configuration as a named preset (or "Agent"). The underlying mechanism might remain the same, but the UI presentation changes.

6.  **Tool Integration:**
    *   **Tool Structure Sync:** Synchronize the tool structure used in the AI Cockpit UI with the backend tool structure.
    *   **Centralized Tool List:** Fetch the list of available tools from a central database source. This list should be shared/synced across Python, Chat, and the AI Cockpit.
    *   **MCP Tool Integration:** The centralized tool list approach will facilitate the integration of MCP (Multi-Cloud Platform?) tools from other services.
\`\`\`

\`\`\`tasks
## Task Checklist

- [ ] **Task Title 1: Integrate Socket Request System**
    - [ ] Implement integration with the new socket request system.
    - [ ] Ensure correct handling of outgoing request data.
    - [ ] Ensure correct handling and parsing of incoming response data.

- [ ] **Task Title 2: Implement Message Version Testing**
    - [ ] Modify core logic to support testing variations of message content alongside settings.
    - [ ] Develop state management for message structure variations.

- [ ] **Task Title 3: Enhance Broker Component Functionality**
    - [ ] Extend \`BrokerDisplayComponent\` to include logic for broker component selection.
    - [ ] Add default "out-of-the-box" components (e.g., Text Grow area).
    - [ ] Set the default component to a basic text area.
    - [ ] Update UI to allow reusing broker instances.
    - [ ] Implement display and control of Broker ID.
    - [ ] Add Broker Name display alongside ID for easier identification.
    - [ ] Implement the "Available Brokers" list display at the top.
    - [ ] Categorize brokers into System, System Data, User Basic, User Data types in the list.
    - [ ] Decide on and implement the display format for broker categories.
    - [ ] Ensure broker default values are treated as defaults, providing separate input fields for runtime values.
    - [ ] Integrate a view/editor for the selected broker's component directly within the cockpit.

- [ ] **Task Title 4: Develop Flexible Message Editor**
    - [ ] Implement a Basic Text Editor as the default for messages.
    - [ ] Implement a Complex/Intelligent Editor capable of handling brokers.
    - [ ] Create a mechanism for users to switch between Basic and Complex editors.
    - [ ] Add message display options (e.g., Markdown, Pretty View).

- [ ] **Task Title 5: Implement AI Assistance Features**
    - [ ] Build initial integration for AI-assisted system message updates.
    - [ ] Design and implement system for adding predefined structural instructions (via brokers or dedicated system).

- [ ] **Task Title 6: Improve Workflow & UX**
    - [ ] Add post-recipe run actions (Move to Chat, Save to Chat, Go to Chat).
    - [ ] Modify settings UI to hide the name field by default.
    - [ ] Implement "Save as Preset/Agent" functionality that reveals the name field.

- [ ] **Task Title 7: Standardize Tool Integration**
    - [ ] Align frontend (Cockpit) tool structure with backend tool structure.
    - [ ] Implement fetching the available tool list from a central database source.
    - [ ] Ensure tool list consistency across Python, Chat, and Cockpit.
    - [ ] Plan for integration of MCP tools using the standardized structure.
\`\`\`
"""`;
# Arman's Tasks

1. Add more prompts -- right now only 2 real ones
2. Figure out how to render a multi-turn conversation properly.
  - Probably need to create a modal that is connected to prompts and can be started with a prompt id, optional variables and then some options for allowing input or automatically running. Then, other potential options.

===
Here is what I was about to write to the model:

Wouldn't it make more sense if instead of trying to do the conversations this way, we instead had something where we skipped our own internal processing and instead triggered a component that could accept the prompt id and the variables and handle it all itself?

We could potentially pass the prompt object, if we have already fetched it, but I don't think we need that, since that's not required to run a prompt.

I assume we would then just update the message object and keep submitting it the same way, but if I'm wrong and that's not how it works, let me know and we'll look into how to best handle it.

The key would be to not have two systems where we trigger a call and then try to continue the conversation there. Instead, it woudl be good to have a setup where the conversation is triggered so that it gets the prompt object, our variables, and then it takes over and does everything like normal.

In fact, if we set it up like this, we could even have an option where we could render it  and allow the user to add additional instructions themselves by filling in the varaible but letting them submit themselves.

Look at the flow and see how  this would impact things and tell me.

===

# Improvements needed

@/features\workflows-xyflow\nodes\base\node-structure.json

Now, I need you to review what I have in this sample json.

It's a sample of one of the 30+ nodes we have.

The concept for why we created the base node was that this core logic would be managed by default components.

Most of this is irrelevant to the Basenode so don't attempt to do things that are not specific to the base. Most of this is handled by the settings modal, but the most imoprtant concept is this:

1. The Node is what gets and stores this data. This entire object will need to be stored within the 'data' of the react flow node so that it's accessible by all.

2. You can see that it includes "inputs" and "outputs" - These are the default inputs and outputs and must ALWAYS be shown on the node as handles immediately.

The custom node will need to have methods avaialble to it for adding more inputs and adding more outputs, but these are the ones that will need to be triggered by default.

All we need to do is use these inputs and outputs to create unique handles that have the proper data stored within them and have a unique id that makes sense. But this data will need to be stored as part of the handle for easier manipulation and connection handling.
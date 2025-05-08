

export const helpTextItems = {
    label: "The label or name. This is the most promanent thing the user will see. For convenience, this defaults to the broker name, but it can be changed to any value.",
    description:
        "The description is not always visible, depending on your chosen layout. It's a good practice to have one just in case, But the system is designed to work seamlessly without it.",
    helpText:
        "If you don't enter a value, it's perfectly fine. \nIf you enter any text, then the user will see an icon exactly like the one you just hovered and they will see exactly the same thing you're looking at now.",
    placeholder:
        "For most fields, this is not relevant and the system provides a default placeholder, but you can customize it for a better user experience.",
    required:
        "If you make a field required, be aware that this will override any Broker configuration because the user won't be able to submit the form without entering a value.",
    includeOther:
        "If you have a component with 'options', this will allow them to enter their own custom value into an input field as normal text.",
    min: "The minimum value of the field. The system will enforce this minimum so only enter a value if you absolutely do not want anything less than this minimum.",
    max: "The maximum value of the field. The system will enforce this maximum so only enter a value if you absolutely do not want anything more than this maximum.",
    step: "This is primarily relevant for slider fields. It's the amount the slider will increment or decrement by when the user clicks the arrows or drags the slider.",
    rows: "This is primarily relevant for textareas and multiselect fields. It's the number of rows the textarea will see, but it does not impact the amount of text they can enter.\n\nIt's a good practice to play with the rows and watch the preview change to see what feels right for you.",
    minDate:
        "The minimum date of the field. The system will enforce this minimum so only enter a value if you absolutely do not want anything less than this minimum date.",
    maxDate:
        "The maximum date of the field. The system will enforce this maximum so only enter a value if you absolutely do not want anything more than this maximum date.",
    onLabel: "The default is 'Yes' but you can enter anything you wish to use such as True, On, Open, etc.",
    offLabel: "The default is 'No' but you can enter anything you wish to use such as False, Off, Closed, etc.",
    options:
        "This is perhaps the most useful and powerful feature for components. This will allow you to provide users with highly relevant options which can generate highly customized results depending on your workflow or recipe.\n\nYou can often capture a complex text input with this single value, but it's more work for you to set up.",
};


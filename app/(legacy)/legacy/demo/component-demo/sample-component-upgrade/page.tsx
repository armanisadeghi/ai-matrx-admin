'use client'

import EnhancedAccordion from "./EnhancedAccordion"

const accordionItems = [
    {
        id: 'item-1',
        title: 'Is it accessible?',
        content: 'Yes. It adheres to the WAI-ARIA design pattern, ensuring it is usable by people with disabilities. Keyboard navigation and screen reader compatibility are integrated.',
    },
    {
        id: 'item-2',
        title: 'Is it styled?',
        content: 'Yes. It comes with default styles that match the overall aesthetic of our other components, ensuring a cohesive design throughout your application. You can easily customize it further if needed.',
    },
    {
        id: 'item-3',
        title: 'Is it animated?',
        content: 'Yes. It features smooth animations by default to enhance the user experience, but you can disable them in the settings if you prefer a static view.',
    },
    {
        id: 'item-4',
        title: 'Can I customize the content?',
        content: 'Absolutely! The component allows you to pass any JSX as content, giving you the flexibility to include images, videos, or other components.',
    },
    {
        id: 'item-5',
        title: 'What about mobile responsiveness?',
        content: 'The accordion is fully responsive. It adapts seamlessly to different screen sizes, ensuring optimal usability on mobile devices.',
    },
    {
        id: 'item-6',
        title: 'Does it support keyboard navigation?',
        content: 'Yes. Users can navigate through the accordion items using the keyboard, making it convenient for users who prefer keyboard shortcuts.',
    },
]

export default function AccordionDemo() {
    return (
        <EnhancedAccordion
            items={accordionItems}
            allowMultiple={true}
            defaultOpenItems={['item-1']}
            className="max-w-md mx-auto"
            onItemToggle={(id, isOpen) => console.log(`Item ${id} is now ${isOpen ? 'open' : 'closed'}`)}
        />
    )
}

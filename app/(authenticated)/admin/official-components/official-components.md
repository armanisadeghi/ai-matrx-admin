# Official Reusable Components

## CORE GUIDELINES:
- This file should only list components which are approved by Arman.
- Official components are ONLY those which are determined to be app-wide components that will always be used, wherever possible.
- Check the tasklist at the bottom of this component to identify new components that need to be made or those that need to be added to our display and tests.
- Component demos MUST be only a single implementation, not a complex set that showcases everything they do. However, in the single demonstration, be sure to use all available props, including those which are defauls or unecessary for the specific usecase because this will more easily demonstrate what arguments can be passed and it's an easy way to copy/paste your demo when creating a real one in the app.
- See this component demo for a great, simple demo example: app\(authenticated)\admin\official-components\component-displays\chat-collapsible.tsx
- New component demos are to be added here: app\(authenticated)\admin\official-components\component-list.ts

IMPORTANT: IF your component requires you to write local logic to make it work, then it's not a reusable component. It's ok to provide props and data or even add live configuration settings, but if you have to apply local styling, wrappers and things like that, then what you're calling a reusable component is the same junk that ShadCN makes! That's not what we want. We are creating high-quality plug and play components SPECICALLY set up for our specific usecase.

## ADDING NEW COMPONENTS:
1. Create your reusable component in the appropriate location (usually `components/official/`)
2. Create a demo component in `app/(authenticated)/admin/official-components/component-displays/[component-id].tsx`
3. Add the component to `app/(authenticated)/admin/official-components/parts/component-list.tsx`
4. Add documentation for the component in this file

**Note:** Do not create separate page routes for your demos. The dynamic routing system at `app/(authenticated)/admin/official-components/[componentId]/page.tsx` will automatically handle routing and displaying your component based on its ID in the component list.

## Icon Button with tooltip:
components\ui\official\IconButton.tsx
- This is the preferred button that should almost always be used.
- If this button doesn't work for your use case and you can make a non-breaking change, then change it.
- If there would be a breaking change or if the component would become too complex, then create a new variation as a new reusable component and add it to this list and upadte the documentation, as well as the testing UI.

## Text Icon Button With Tooltip:
components\ui\official\TextIconButton.tsx

## Action Feedback Button:
components\official\ActionFeedbackButton.tsx
- Enhanced button that extends IconButton, inheriting all its tooltip functionality and styling options
- Provides visual feedback when an action is completed by temporarily showing a success state
- Perfect for actions like save, reset, delete where users need visual confirmation
- Supports custom success icons, tooltips, and feedback duration
- Includes specific tooltip handling for disabled states
- Uses the same styling variants and sizes as IconButton for consistency across the application

## Accordion Wrappers:

### Accordion collapsible wrapper:
components\matrx\matrx-collapsible\AccordionWrapper.tsx

### State Persistent collapsible wrapper:
components\matrx\matrx-collapsible\StatePersistingAccordionWrapper.tsx

### Chat Collapsible collapsible wrapper:
components\mardown-display\blocks\ChatCollapsibleWrapper.tsx

### Advanced Collapsible:
components\official\AdvancedCollapsible.tsx
- Enhanced collapsible with action buttons for saving, resetting, copying, and fullscreen mode
- Supports expanding to a full-screen overlay while maintaining component state
- Action buttons will only display if their corresponding handler props are provided
- Built-in copy functionality works even without a custom handler
- Fully supports light and dark mode with appropriate styling

## Full Screen Overlay
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";

## Card & Grid
components\official\card-and-grid
 - A colorful card with title, description, icon and link.
 - A flexible grid system for the cards
 - A horizontal card with slightly less options as the other card
 - A simple list that creates a list of the horizontal cards in a column

## Floating Dock Components

### Original Floating Dock
components\official\FloatingDock.tsx
 - Works well for desktop and mobile
 - On desktop, displays interactive dock with icons that move upward on hover
 - On mobile, collapses to a menu button that expands to a full-screen menu
 - Might need slight adjustments to be used where it's not the only thing across the entire horizontal row

### Balanced Floating Dock
components\official\BalancedFloatingDock.tsx
 - Enhanced version of the floating dock that grows in place without moving upward
 - Designed for use near the top edge of the page where upward movement would cause issues
 - Features configurable growth factor to control how much icons expand on hover
 - Supports customizable label positioning (side or bottom)
 - Maintains all mobile functionality from the original FloatingDock

## Icon Select
components\official\IconSelect.tsx
 - Icon-only select button that displays a dropdown of labeled items
 - Fully supports light and dark mode
 - Customizable trigger, content and item styling
 - Perfect for navigation menus, toolbars, and compact UI elements

## Public Image Search
components\official\PublicImageSearch.tsx
 - Input field with Unsplash image search capability
 - Supports single and multiple image selection modes
 - Includes infinite scrolling for search results
 - Features grid and natural view layouts for image display
 - Fully supports light and dark mode with responsive design
 - Integrates with existing IconButton component and follows design patterns
 - Returns direct image URLs rather than webpage links

## Amazing JSON Explorer Component
features\scraper\parts\RawJsonExplorer.tsx
 - This needs some work, but it's incredible!
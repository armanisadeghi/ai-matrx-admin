# Official Reusable Components

## CORE GUIDELINES:
- This system should only list components which are approved by Arman (Lead Developer).
- Official components are ONLY those which are determined to be app-wide components that will always be used, wherever possible.
- Check the tasklist at the bottom of this component to identify new components that need to be made or those that need to be added to our display and tests.
- Component demos MUST be only a single implementation, not a complex set that showcases everything they do. However, in the single demonstration, be sure to use all available props, including those which are defaults or unnecessary for the specific usecase because this will more easily demonstrate what arguments can be passed and it's an easy way to copy/paste your demo when creating a real one in the app.
- See this component demo for a great, simple demo example: app\(authenticated)\admin\official-components\component-displays\chat-collapsible.tsx
- New component demos are to be added here: app\(authenticated)\admin\official-components\parts\component-list.tsx

IMPORTANT: IF your component requires you to write local logic to make it work, then it's not a reusable component. It's ok to provide props and data or even add live configuration settings, but if you have to apply local styling, wrappers and things like that, then what you're calling a reusable component is the same junk that ShadCN makes! That's not what we want. We are creating high-quality plug and play components SPECIFICALLY set up for our specific usecase.

## ADDING NEW COMPONENTS:
1. Create your reusable component in the appropriate location (usually `components/official/`)
2. Create a demo component in `app/(authenticated)/admin/official-components/component-displays/[component-id].tsx`
3. Add the component to `app/(authenticated)/admin/official-components/parts/component-list.tsx`
4. Add documentation for the component in this file

**Note:** Do not create separate page routes for your demos. The dynamic routing system at `app/(authenticated)/admin/official-components/[componentId]/page.tsx` will automatically handle routing and displaying your component based on its ID in the component list.

## WRAPPING EXISTING DEMOS

If you have an existing demo that's fully functional but needs to be integrated into our component system:

### Option 1: Single Component Demo
```typescript
// app/(authenticated)/admin/official-components/component-displays/[component-id].tsx
import { wrapExistingDemo } from '../parts/demo-wrapper';
import ExistingDemo from '../need-wrappers/your-existing-demo';

const codeExample = `import { YourComponent } from '@/components/path/YourComponent';

<YourComponent 
  prop1="value" 
  prop2={true}
/>`;

export default wrapExistingDemo(ExistingDemo, codeExample);
```

### Option 2: Tabbed Demo (Multiple Related Components)
```typescript
// app/(authenticated)/admin/official-components/component-displays/[component-id].tsx
import { createTabbedDemo } from '../parts/tabbed-demo-wrapper';
import Demo1 from '../need-wrappers/component1';
import Demo2 from '../need-wrappers/component2';

export default createTabbedDemo([
  {
    id: 'basic',
    label: 'Basic Usage',
    component: Demo1,
    codeExample: `// Code example for basic usage`,
    description: 'Optional description for this variant'
  },
  {
    id: 'advanced',
    label: 'Advanced Features',
    component: Demo2,
    codeExample: `// Code example for advanced usage`
  }
]);
```

## CRITICAL WARNINGS:

1. **NEVER DELETE EXISTING DEMO CODE** - Use wrappers to integrate demos rather than rewriting them
2. **Preserve All Functionality** - Make sure all features in the original demo continue to work
3. **Component List Entry** - Always add your component to component-list.tsx with appropriate tags and category
4. **Check Before Creating** - Search for existing components before creating a new one
5. **Only Wrap Ready Demos** - If a component isn't fully ready for display, create a proper demo instead of wrapping

## RESOURCES:
- Demo Wrapper: `app/(authenticated)/admin/official-components/parts/demo-wrapper.tsx`
- Tabbed Demo Wrapper: `app/(authenticated)/admin/official-components/parts/tabbed-demo-wrapper.tsx`
- Component List: `app/(authenticated)/admin/official-components/parts/component-list.tsx` 
- Example Screenshot Tools: `app/(authenticated)/admin/official-components/component-displays/screenshot-tools.tsx`


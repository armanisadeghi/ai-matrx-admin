'use client';
// Example usage in a component:
// components/ExampleComponent.tsx
import React, { useState } from 'react';
import { withRefs, WithRefsProps } from '@/lib/refs';

interface ExampleComponentProps extends WithRefsProps {
    label: string;
}

const ExampleComponent: React.FC<ExampleComponentProps> = ({ label }) => {
    const [isActive, setIsActive] = useState(false);

    return (
        <div className="p-4 border rounded">
            <h3>{label}</h3>
            <div className={`p-2 ${isActive ? 'bg-blue-200' : 'bg-gray-200'}`}>
                Status: {isActive ? 'Active' : 'Inactive'}
            </div>
        </div>
    );
};


/*
// Wrap component with refs
export default withRefs(ExampleComponent, (props) => ({
    toggle: () => setIsActive(prev => !prev),
    reset: () => setIsActive(false)
}));
*/

// In any component that needs to expose methods
import { useComponentRef } from '@/lib/refs';

const MyComponent = () => {
    const [state, setState] = useState(false);

    useComponentRef('uniqueId', {
        toggle: () => setState(prev => !prev),
        reset: () => setState(false)
    });

    return <div>...</div>;
};



/*
import { withRefs, WithRefsProps } from '@/lib/refs';

interface MyComponentProps extends WithRefsProps {
    // your props here
}

const MyComponent: React.FC<MyComponentProps> = (props) => {
    // component logic
};

export default withRefs(MyComponent, (props) => ({
    // methods to expose
    doSomething: () => {},
}));
import { useRefManager } from '@/lib/refs';

const Controller = () => {
    const refManager = useRefManager();

    const handleClick = () => {
        refManager.call('componentId', 'methodName', ...args);
        // or
        refManager.broadcast('methodName', ...args);
    };

    return <button onClick={handleClick}>Trigger</button>;
};
*/

'use client';

// import IconSearchCard from './IconSearchCard';

export default function ParentComponent() {
    const handleIconSelect = (iconName) => {
        console.log('Selected icon:', iconName);
        // Do something with the selected icon
    };

    return (
        <div>
            {/*<IconSearchCard onIconSelect={handleIconSelect} />*/}
        </div>
    );
}
import { DynamicResizableLayout } from '@/components/matrx/resizable/DynamicResizableLayout';

export default function EntityBrowserPage() {
    const panels = [
        {
            content: <div>Left Panel</div>,
            defaultSize: 25,
            minSize: 10,
            maxSize: 50,
            collapsible: true
        },
        {
            content: <div>Middle Panel</div>,
            defaultSize: 20
        },
        {
            content: <div>Middle Right Panel</div>,
            defaultSize: 20
        },
        {
            content: <div>Right Panel</div>,
            defaultSize: 35
        }
    ];



    return (
        <DynamicResizableLayout
            panels={panels}
            direction="horizontal"
            className="my-custom-class"
        />
    );
}

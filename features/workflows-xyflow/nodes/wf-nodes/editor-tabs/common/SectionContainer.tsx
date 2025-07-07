
interface SectionContainerProps {
    title: string;
    children: React.ReactNode;
}

export const SectionContainer: React.FC<SectionContainerProps> = ({ title, children }) => {
    return (
        <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950 px-4 py-2 border-b border-blue-300 dark:border-blue-700">
                <h4 className="text-md font-medium text-foreground dark:text-foreground">{title}</h4>
            </div>
            {children}
        </div>
    );
};

export default SectionContainer;
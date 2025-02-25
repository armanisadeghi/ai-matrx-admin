import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PanelTopOpen } from "lucide-react";

const NavigationSelectIcon = ({ currentPage, pages, getFullPath, handleNavigation }) => (
    <Select value={currentPage ? getFullPath(currentPage) : undefined} onValueChange={handleNavigation}>
        <SelectTrigger className="h-7 w-7 px-0 bg-gray-200 dark:bg-gray-900 border-none justify-center focus:outline-none focus:ring-0" hideArrow={true}>
            <PanelTopOpen className="h-5 w-5 opacity-70" />
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                {pages.map((page) => (
                    <SelectItem key={page.path} value={getFullPath(page)}>
                        {page.title}
                    </SelectItem>
                ))}
            </SelectGroup>
        </SelectContent>
    </Select>
);

export default NavigationSelectIcon;

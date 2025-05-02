// page.tsx

import { NextNavCardFull } from "@/components/matrx/navigation";
import { filteredPages } from "./config";

export default function Page() {
    const columns = 2;
    const variant = "default";
    const showPath = true;
    const animated = true;

    return (
        <div className="w-full h-full p-3 overflow-y-auto overflow-x-hidden">
            <NextNavCardFull items={filteredPages} columns={columns} variant={variant as any} showPath={showPath} animated={animated} />
        </div>
    );
}

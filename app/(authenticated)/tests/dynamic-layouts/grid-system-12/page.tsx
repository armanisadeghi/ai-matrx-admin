// page.tsx
'use client';

import { GridContainer } from "./grid-system/gridContainer";
import { GridItem } from "./grid-system/GridItem";

// import { GridContainer, GridItem } from './grid-system-12';


export default function Page() {

    return (
        <GridContainer className="gap-2">
            <GridItem
                area={[1, 2, 3]}
                className="bg-blue-100"
            >
                Header Content
            </GridItem>

            <GridItem
                area={[13, 14, 15, 25, 26, 27]}
                className="bg-green-100"
            >
                Main Content
            </GridItem>
        </GridContainer>
    );
}

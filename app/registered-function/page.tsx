// File location: @/app/registered-function/page.tsx

import { RegisteredFunctionCRUD } from '@/features/registered-function/components/RegisteredFunctionCRUD';

export default function RegisteredFunctionPage() {
    return (
        <div>
            <h1>Registered Functions</h1>
            <RegisteredFunctionCRUD />
        </div>
    );
}

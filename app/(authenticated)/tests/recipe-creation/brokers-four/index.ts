// types/index.ts
export interface Variable {
    id: string;
    name: string;
    value: string;
    color: string;
    position: {
        start: number;
        end: number;
    };
    isReady: boolean;
    isDeleted: boolean;
}

export interface TextAreaState {
    text: string;
    variables: Variable[];
    selectedVariable: string | null;
}

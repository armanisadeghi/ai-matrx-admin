import {FloatingLabelInput} from '@/components/matrx/input';

function MyForm() {
    return (
        <div className="flex justify-center pt-12">
            <div className="space-y-6 max-w-lg w-full">
                <FloatingLabelInput
                    id="filled-input"
                    label="Floating filled"
                    variant="filled"
                />
                <FloatingLabelInput
                    id="outlined-input"
                    label="Floating outlined"
                    variant="outlined"
                />
                <FloatingLabelInput
                    id="standard-input"
                    label="Floating standard"
                    variant="standard"
                />
            </div>
        </div>
    );
}

export default MyForm;
